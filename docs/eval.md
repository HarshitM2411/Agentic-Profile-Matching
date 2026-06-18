# AirTribe AI Agent — Evaluation Criteria

## Overview

This document defines the evaluation criteria for the AirTribe AI Agent against each graded assignment part, with specific test scenarios, pass/fail conditions, and scoring guidance.

| Part | Weight | Focus |
|---|---|---|
| A | 40% | Agent Architecture — state, graph, tools |
| B | 30% | Interactive Features — conversation, refinement |
| C | 30% | Advanced Capabilities — multi-round, explainability |

---

## Part A — Agent Architecture (40%)

### A.1 Agent State Design

**What is evaluated:** Does the state correctly track all required fields across the full conversation and pipeline?

| Criterion | Pass Condition | Fail Condition |
|---|---|---|
| Conversation history tracked | `state["conversation_history"]` grows with each user turn and agent response | History is empty or missing entries after multiple turns |
| Job requirements maintained | `state["job_requirements"]` has `must_have`, `nice_to_have`, `role_level`, `domain` keys after JD parsing | Dict is empty or missing keys after parsing |
| Candidate shortlist stored | `state["candidate_shortlist"]` is a non-empty ordered list after screening | List is empty or unordered (highest score not first) |
| Reasoning stored per candidate | `state["reasoning"]` has one entry per shortlisted candidate | Dict is missing or has empty values |
| State persists across rounds | `state["screening_round"]` increments from 1 → 2 → 3 without resetting | Round resets unexpectedly mid-pipeline |
| Requirements version tracked | `state["requirements_version"]` increments on each user-driven criteria change | Version stays at 0 after a criteria update |

**Test scenario:**

```
Input JD: "Senior React developer, TypeScript required, 4+ years experience."
After parsing:
  state["raw_jd"]              → non-empty string
  state["job_requirements"]    → {"must_have": ["React", "TypeScript", ...], ...}
  state["requirements_version"] → 1
After screening:
  state["candidate_shortlist"] → [id1, id2, ...]  (ordered by score)
  state["reasoning"][id1]      → non-empty string
  state["conversation_history"] → [{role: "user", content: "..."}]
```

---

### A.2 Agent Workflow (Graph Structure)

**What is evaluated:** Does the LangGraph graph execute nodes in the correct sequence with correct conditional routing?

| Criterion | Pass Condition | Fail Condition |
|---|---|---|
| Graph compiles without error | `build_graph()` returns a compiled `CompiledGraph` object | Raises `GraphValidationError` or `KeyError` |
| Entry point is intent router | First node executed is `intent_router` | Pipeline starts at `parse_jd` directly |
| New search routes to parse_jd | Intent `new_search` → `parse_jd` → `extract_requirements` → `search_resumes` | Skips any node in the sequence |
| Refinement routes to snapshot | Intent `refine_requirements` → `snapshot_previous_ranking` → `update_requirements` → `search_resumes` | Goes directly to search without snapshot |
| Report → advance round | After `generate_report`, `screening_round < 3` routes to `advance_screening_round` | Goes to `human_feedback_loop` before round 3 |
| Round 3 → feedback loop | After `generate_report` on `screening_round == 3`, routes to `human_feedback_loop` | Loops back to search instead of waiting |
| Direct actions bypass pipeline | `compare_candidates` / `explain_ranking` / `generate_questions` intents route to `direct_action`, not `parse_jd` | These intents restart the full JD pipeline |
| Final recommendation terminates | `final_recommendation` → `END` | Pipeline loops after final recommendation |

**Test scenario:**

```python
graph = build_graph()
state = initial_state()
state["current_query"] = "Python backend engineer, 5 years, REST APIs"

result = graph.invoke(state)

assert result["screening_round"] == 3
assert len(result["candidate_shortlist"]) > 0
assert len(result["match_reports"]) > 0
```

---

### A.3 Tools

**What is evaluated:** Do all five tools return correctly structured outputs?

#### `list_resumes()`

| Criterion | Pass | Fail |
|---|---|---|
| Returns list | Output is a `list` | Raises exception |
| Only valid extensions | All entries end in `.txt`, `.pdf`, or `.md` | Includes `.DS_Store`, `.json`, etc. |
| Reflects actual files | Count matches number of files in `data/resumes/` | Returns empty list when files exist |

#### `read_resume(path)` / `read_resume_by_candidate_id(candidate_id)`

| Criterion | Pass | Fail |
|---|---|---|
| Returns full text | Output is a non-empty string matching file content | Returns empty string |
| PDF supported | Reading a `.pdf` resume returns extracted text | Raises error on PDF |
| ID resolution works | `read_resume_by_candidate_id("alice")` finds `data/resumes/alice.txt` or `data/resumes/alice.pdf` | Raises `FileNotFoundError` for a valid candidate |
| Missing file handled | Raises `FileNotFoundError` with clear message | Silent failure or wrong content returned |

#### `extract_requirements(jd: str)`

| Criterion | Pass | Fail |
|---|---|---|
| Returns dict | Output is a `dict` | Raises exception or returns string |
| Has required keys | `must_have` and `nice_to_have` present and are lists | Missing keys |
| Separates correctly | Skills marked mandatory in JD appear in `must_have`, not `nice_to_have` | Mandatory skills in `nice_to_have` |
| Non-empty on real JD | At least one item in `must_have` for a real JD | Empty lists |

#### `compare_candidates(candidate_ids, requirements)`

| Criterion | Pass | Fail |
|---|---|---|
| Returns dict | Output is a `dict` | Raises exception |
| Has `winner` | `result["winner"]` is one of the input `candidate_ids` | `winner` is absent or not in input list |
| Has per-candidate scores | `result["candidates"][id]["overall_score"]` exists for each ID | Missing candidates or scores |
| Scores in range | All `overall_score` values are between `0.0` and `1.0` | Score outside range |
| `reasoning` present | Non-empty string explaining the winner selection | Empty `reasoning` |

#### `generate_interview_questions(candidate_id, requirements)`

| Criterion | Pass | Fail |
|---|---|---|
| Returns list | Output is a `list` | Returns string or dict |
| 5 questions | List has at least 5 items | Fewer than 5 items |
| Questions are strings | Each item is a non-empty string | Items are empty or non-string |
| Relevant to requirements | At least one question references a `must_have` skill | Generic questions unrelated to JD |

---

## Part B — Interactive Features (30%)

### B.1 Conversational Interface

**What is evaluated:** Can the agent accept and correctly handle natural language queries without re-parsing the JD on every turn?

| Criterion | Pass | Fail |
|---|---|---|
| Multi-turn conversation | User can send 3+ messages in sequence without state reset | State resets to initial after each message |
| JD accepted as first input | Agent parses a free-form JD from the first user message | Requires structured form input |
| "Find me candidates" query | Triggers `new_search` intent and full screening pipeline | Raises error or does nothing |
| "Compare top 3" query | Triggers `compare_candidates` intent and `direct_action` node | Restarts the JD pipeline |
| "Why did X rank higher" query | Triggers `explain_ranking` intent and returns explanation with specific skills mentioned | Returns generic or empty response |
| Intent classification correct | At least 5 of the 6 intent types correctly classified on a test set of 10 queries | More than 2 misclassifications |

**Test scenarios:**

```
Turn 1: "Find candidates with React and 3+ years experience"
  → intent: new_search
  → pipeline runs, shortlist populated

Turn 2: "Compare the top 3 matches side by side"
  → intent: compare_candidates
  → direct_action runs, comparison printed
  → pipeline does NOT restart

Turn 3: "Why did the first candidate rank higher than the second?"
  → intent: explain_ranking
  → direct_action runs, answer references scores/skills
  → pipeline does NOT restart
```

---

### B.2 Iterative Refinement

**What is evaluated:** Can users change requirements mid-conversation and have rankings update correctly with an explanation?

| Criterion | Pass | Fail |
|---|---|---|
| Refinement accepted | "Make TypeScript a must-have" triggers `refine_requirements` intent | Intent misclassified as `new_search` |
| Snapshot taken before re-rank | `state["previous_shortlist"]` is non-empty after refinement | `previous_shortlist` is empty |
| Requirements updated | `state["job_requirements"]["must_have"]` includes TypeScript after the update | Requirements unchanged |
| Re-ranking produces new order | `state["candidate_shortlist"]` is different after refinement | Shortlist identical to previous |
| Ranking delta populated | `state["ranking_delta"]` has entries with `movement`, `score_change` | `ranking_delta` empty after refinement |
| Change explanation given | Agent explains position changes referencing the updated criteria | Generic "rankings updated" response |
| Version logged | `state["requirement_change_log"]` has one new entry after each refinement | Log not updated |

**Test scenario:**

```
Turn 1: "Senior frontend developer, React required"
  state["job_requirements"]["must_have"] = ["React"]
  state["candidate_shortlist"] = [alice, bob, carol]

Turn 2: "Also make TypeScript a must-have"
  state["requirements_version"] = 2
  state["previous_shortlist"] = [alice, bob, carol]
  state["job_requirements"]["must_have"] = ["React", "TypeScript"]
  state["candidate_shortlist"] = [carol, alice, dave]  ← changed order
  state["ranking_delta"]["carol"]["movement"] = "moved up 2 position(s)"
```

---

## Part C — Advanced Capabilities (30%)

### C.1 Multi-Round Screening

**What is evaluated:** Is the three-round funnel correctly implemented and does each round behave differently?

| Criterion | Pass | Fail |
|---|---|---|
| Round 1 uses RAG on full corpus | `search_resumes(query, top_k=10)` is called in round 1 | Round 1 reads all resumes without RAG |
| Round 1 returns ≤ 10 candidates | `len(state["candidate_pool"]) <= 10` after round 1 | More than 10 candidates in pool |
| Round 2 uses shortlist only | Round 2 retrieval only reads the IDs from `candidate_shortlist` | Re-queries the full corpus in round 2 |
| Round 3 uses shortlist only | Round 3 uses `candidate_shortlist` directly without new retrieval | Makes new RAG calls in round 3 |
| All 3 rounds execute | `state["screening_round"]` reaches `3` before feedback loop | Stops at round 1 or 2 |
| Report generated each round | `state["match_reports"]` is populated after each round | Reports only generated in final round |
| Interview questions from round 2 | `state["interview_questions"]` populated in rounds 2 and 3 | Questions only generated at the end |

**Test scenario:**

```python
result = graph.invoke(initial_state() | {"current_query": "ML engineer, Python required"})

assert result["screening_round"] == 3

# Round 1: broad pool
# Round 2: deep on shortlist from round 1
# Round 3: final eval on shortlist from round 2
assert len(result["candidate_shortlist"]) <= 10
assert all(cid in result["match_reports"] for cid in result["candidate_shortlist"])
assert all(cid in result["interview_questions"] for cid in result["candidate_shortlist"])
```

---

### C.2 Explainability

**What is evaluated:** Are match reports detailed, accurate, and actionable? Are borderline candidates given improvement suggestions?

#### Match Report Quality

| Criterion | Pass | Fail |
|---|---|---|
| All required fields present | Each report has `candidate_id`, `overall_score`, `strengths`, `gaps`, `hire_recommendation` | Any field missing |
| Score correlates with label | `HIRE` → score ≥ 0.75, `BORDERLINE` → 0.60–0.74, `NO-HIRE` → score < 0.60 | Labels inconsistent with scores |
| Strengths are specific | Strengths reference specific skills from the resume | "Strong candidate" with no specifics |
| Gaps reference requirements | Gaps list actual missing must-have or nice-to-have items | Gaps are generic or empty |
| Reports written to disk | `reports/{candidate_id}_report.json` exists for every shortlisted candidate | Files not created |

#### Borderline Candidate Handling

| Criterion | Pass | Fail |
|---|---|---|
| BORDERLINE label assigned | Candidates scoring 0.60–0.74 get `hire_recommendation: BORDERLINE` | Labelled HIRE or NO-HIRE instead |
| Improvement suggestions present | `improvement_suggestions` is a non-empty list | Empty list or field absent |
| Suggestions are actionable | Each suggestion references a specific skill, cert, or experience area | Vague suggestions like "improve skills" |
| Suggestions persisted | Report file includes `improvement_suggestions` after `final_recommendation` | Field only in memory, not in JSON |

#### Ranking Explanation Quality

| Criterion | Pass | Fail |
|---|---|---|
| Explanation references specific skills | Response to "why did X rank higher" mentions actual skill names | Generic response |
| Explanation references scores | Score values from `candidate_scores` are mentioned | No score data in response |
| Delta explanation correct | After refinement, explanation correctly states which criteria change caused the movement | Wrong candidate mentioned or no cause given |

---

## Summary Scorecard

Use this during final review. Mark each item ✓ (pass), ✗ (fail), or ~ (partial).

### Part A (40 points)

| # | Criterion | Points | Result |
|---|---|---|---|
| A1 | State tracks conversation history | 5 | |
| A2 | State tracks job requirements | 5 | |
| A3 | State tracks shortlist and reasoning | 5 | |
| A4 | Graph compiles and routes correctly (all 6 intents) | 10 | |
| A5 | All file system tools work (list, read, write, PDF) | 5 | |
| A6 | All three custom tools return correct structures | 10 | |
| **Total A** | | **40** | |

### Part B (30 points)

| # | Criterion | Points | Result |
|---|---|---|---|
| B1 | Multi-turn conversation without state reset | 8 | |
| B2 | Intent correctly classified for all 6 types | 7 | |
| B3 | Requirements updated mid-conversation | 8 | |
| B4 | Re-ranking triggered and ranking delta populated | 7 | |
| **Total B** | | **30** | |

### Part C (30 points)

| # | Criterion | Points | Result |
|---|---|---|---|
| C1 | Round 1: RAG on full corpus, ≤ 10 results | 7 | |
| C2 | Round 2: deep analysis on shortlist only | 7 | |
| C3 | Round 3: final evaluation, hire/no-hire assigned | 8 | |
| C4 | Detailed match reports with strengths and gaps | 4 | |
| C5 | Borderline improvement suggestions generated and saved | 4 | |
| **Total C** | | **30** | |

### Grand Total: /100

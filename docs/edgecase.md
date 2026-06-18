# AirTribe AI Agent — Edge Cases

## Overview

This document catalogs every meaningful edge case across the system, grouped by layer. For each case it states the trigger, what breaks without handling, the fix, and where in the codebase it applies.

---

## 1. File System & Data Layer

### EC-01 — Empty resume directory

| Field | Detail |
|---|---|
| **Trigger** | `data/resumes/` exists but contains no files |
| **Breaks** | `list_resumes()` returns `[]`; `build_vector_store()` creates an empty index; `search_resumes()` returns no results; agent returns empty shortlist with no error |
| **Fix** | Add a startup guard in `matching_agent.py` that calls `list_resumes()` and raises a clear `RuntimeError("No resumes found in data/resumes/. Add .txt or .pdf files before running.")` if the list is empty |
| **Location** | `tools/file_tools.py`, `matching_agent.py` startup |

---

### EC-02 — Resume file is empty or unreadable

| Field | Detail |
|---|---|
| **Trigger** | A `.txt` file in `data/resumes/` has zero bytes, or a `.pdf` file has no extractable text (scanned image PDF) |
| **Breaks** | `read_resume()` returns `""`. `summarize_resume("")` sends an empty prompt to the LLM which either errors or returns nonsensical output. The candidate gets an empty report. |
| **Fix** | In `read_resume()`, check `len(text.strip()) == 0` after reading and raise `ValueError(f"Resume at {file_path} is empty or has no extractable text")`. In callers, catch this and skip the candidate with a `"UNREADABLE"` report status. |
| **Location** | `tools/file_tools.py`, `nodes/generate_report.py` |

---

### EC-03 — Resume filename has spaces or special characters

| Field | Detail |
|---|---|
| **Trigger** | File named `John Doe (2024).pdf` or `résumé_priya.txt` |
| **Breaks** | FAISS metadata stores the raw `source` path including spaces. `resolve_candidate_path()` tries to match `"John Doe (2024)"` as a candidate ID, fails with `FileNotFoundError`. |
| **Fix** | In `build_vector_store()`, normalize `candidate_id` to `Path(source).stem` and also store the original `source` path. In `resolve_candidate_path()`, glob `RESUME_DIR` and match by stem after normalizing both sides to lowercase and stripping spaces. |
| **Location** | `tools/rag_tool.py`, `tools/file_tools.py` |

---

### EC-04 — Candidate ID from RAG does not match any resume file

| Field | Detail |
|---|---|
| **Trigger** | RAG returns `candidate_id = "alice"` but the file is named `alice_resume.txt` |
| **Breaks** | `resolve_candidate_path("alice")` raises `FileNotFoundError`. `compare_candidates` and `generate_interview_questions` receive empty text for that candidate. |
| **Fix** | `resolve_candidate_path()` should do a partial stem match: iterate `RESUME_DIR`, check if `candidate_id_or_path in path.stem` (case-insensitive), and return the first match. Log a warning when a partial match is used. |
| **Location** | `tools/file_tools.py` |

---

### EC-05 — Vector store not yet built

| Field | Detail |
|---|---|
| **Trigger** | `data/vector_store/` is missing or empty; `matching_agent.py` is run before `build_vector_store()` |
| **Breaks** | `FAISS.load_local()` raises `RuntimeError` or `FileNotFoundError`. Agent crashes at first `search_resumes()` call. |
| **Fix** | In `_load_vector_store()`, catch the error and raise `RuntimeError("Vector store not found. Run build_vector_store('data/resumes') first.")`. Add a check at startup. |
| **Location** | `tools/rag_tool.py` |

---

### EC-06 — Report directory does not exist

| Field | Detail |
|---|---|
| **Trigger** | `reports/` directory was deleted or never created |
| **Breaks** | `write_report()` raises `FileNotFoundError` when trying to write a JSON file |
| **Fix** | `write_report()` should call `REPORTS_DIR.mkdir(parents=True, exist_ok=True)` before writing. Already handled in the implementation; confirm it is not conditional. |
| **Location** | `tools/file_tools.py` |

---

## 2. Tool Layer

### EC-07 — LLM returns malformed JSON

| Field | Detail |
|---|---|
| **Trigger** | Any of the four LLM-backed tools (`extract_requirements`, `compare_candidates`, `summarize_resume`, `generate_interview_questions`) receives a response where the LLM outputs prose instead of JSON, or truncates the JSON mid-object |
| **Breaks** | `json.loads(match.group())` raises `json.JSONDecodeError`. The node either crashes or silently returns an empty dict, causing downstream `KeyError` when accessing `must_have`, `overall_score`, etc. |
| **Fix** | Wrap every `json.loads()` call in a `try/except json.JSONDecodeError`. On failure, retry the LLM call once with an additional instruction: "Your previous response was not valid JSON. Return only valid JSON, no prose." If retry also fails, return a safe fallback structure (empty dict or empty list) and log the error. |
| **Location** | `tools/reasoning_tools.py` (all four tools) |

```python
def _parse_json_object(text: str, fallback: dict | list) -> dict | list:
    import json, re

    patterns = [r"\{.*\}", r"\[.*\]"]
    for pattern in patterns:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
    return fallback
```

---

### EC-08 — OpenAI API key missing or invalid

| Field | Detail |
|---|---|
| **Trigger** | `.env` is missing, `OPENAI_API_KEY` is empty, or the key has expired |
| **Breaks** | Every LLM call raises `openai.AuthenticationError`. The agent crashes on the first node that calls the LLM. |
| **Fix** | At startup in `matching_agent.py`, validate `os.getenv("OPENAI_API_KEY")` is set and non-empty. Raise `EnvironmentError("OPENAI_API_KEY is not set. Create a .env file with your key.")` before building the graph. |
| **Location** | `matching_agent.py` startup |

---

### EC-09 — LLM rate limit or timeout

| Field | Detail |
|---|---|
| **Trigger** | Many candidates being processed in round 2 or 3 causes OpenAI rate-limit (`429`) or network timeout |
| **Breaks** | Node raises exception mid-pipeline. Partially processed candidates have reports, others do not. State is left in inconsistent shape. |
| **Fix** | Wrap all LLM chain invocations in a retry loop with exponential backoff (max 3 retries). Use `langchain`'s built-in `with_retry()` chain wrapper: `chain = (prompt | llm).with_retry(stop_after_attempt=3)`. |
| **Location** | `tools/reasoning_tools.py`, `nodes/final_recommendation.py` |

---

### EC-10 — `compare_candidates` called with a single candidate

| Field | Detail |
|---|---|
| **Trigger** | Only one resume exists in the corpus, so `candidate_pool` has one entry |
| **Breaks** | The LLM comparison prompt gets a single candidate and returns unexpected JSON (no `winner` key, or the list is empty). |
| **Fix** | In `compare_candidates()`, if `len(candidate_ids) == 1`, skip the LLM call and return a synthetic result with that candidate as winner and `overall_score = 1.0`. |
| **Location** | `tools/reasoning_tools.py` |

---

### EC-11 — `compare_candidates` called with more than ~10 candidates

| Field | Detail |
|---|---|
| **Trigger** | Round 2 passes all 10 shortlisted candidates to a single `compare_candidates` call with full resume texts |
| **Breaks** | The combined prompt (10 resumes × 1000 tokens each) may exceed the LLM context window, causing a truncation error or a very expensive call. |
| **Fix** | In `rank_candidates_node`, batch candidates into groups of 5, call `compare_candidates` per batch, then merge the scores by taking the mean of `overall_score` across appearances. |
| **Location** | `nodes/rank_candidates.py` |

---

## 3. LangGraph State & Graph

### EC-12 — `new_search` intent with no JD text

| Field | Detail |
|---|---|
| **Trigger** | User sends an empty message or only whitespace as the first query |
| **Breaks** | `state["raw_jd"] = ""`. `extract_requirements("")` sends an empty prompt to the LLM, which returns an empty or nonsensical requirements dict. `search_resumes` builds an empty query and retrieves irrelevant resumes. |
| **Fix** | In `parse_jd_node`, check `if not state["current_query"].strip()`, set `state["current_intent"] = ""`, and route back to `human_feedback_loop` with a message: "Please provide a job description to begin." |
| **Location** | `nodes/parse_jd.py` |

---

### EC-13 — `refine_requirements` intent before any search has been run

| Field | Detail |
|---|---|
| **Trigger** | First user message is something like "Remove the Docker requirement" before any JD has been entered |
| **Breaks** | `state["job_requirements"]` is `{}`. `state["candidate_shortlist"]` is `[]`. `snapshot_previous_ranking_node` snapshots empty lists. `update_requirements` sends an empty dict to the LLM, producing garbage output. |
| **Fix** | In `snapshot_previous_ranking_node`, check `if not state["job_requirements"]` and re-route to `parse_jd` with a state message: "No active search found. Please enter a job description first." |
| **Location** | `nodes/snapshot_ranking.py` |

---

### EC-14 — `compare_candidates` or `explain_ranking` intent before any shortlist exists

| Field | Detail |
|---|---|
| **Trigger** | User types "compare top 3" as their very first message |
| **Breaks** | `state["candidate_shortlist"]` is `[]`. `direct_action_node` calls `compare_candidates([], ...)` which fails or produces empty results. |
| **Fix** | In `direct_action_node`, guard with `if not state["candidate_shortlist"]` and return a message: "No candidates have been ranked yet. Please start by entering a job description." |
| **Location** | `nodes/direct_action.py` — already partially handled for `compare_candidates`; extend to `explain_ranking` |

---

### EC-15 — `finalize` intent before round 3 is complete

| Field | Detail |
|---|---|
| **Trigger** | User types "finalize" after round 1 before the three-round funnel completes |
| **Breaks** | `final_recommendation_node` operates on round 1 shortlist only. Candidates have not been deep-analyzed. `match_reports` may be thin. |
| **Fix** | In `route_after_intent`, check `if intent == "finalize" and state["screening_round"] < 3` and return `"human_feedback_loop"` with a note: "Still running screening rounds. Please wait for round 3 to complete before finalizing." |
| **Location** | `nodes/intent_router.py` |

---

### EC-16 — Screening round counter not reset on new search

| Field | Detail |
|---|---|
| **Trigger** | User runs one full search (round 1–3), then starts a new search with a different JD in the same session |
| **Breaks** | `state["screening_round"]` is already `3`. `search_resumes_node` enters round 3 logic on the first pass of the new search, skipping rounds 1 and 2 entirely. |
| **Fix** | In `parse_jd_node`, reset `state["screening_round"] = 1` along with all other screening state. Already included in the implementation; confirm the reset block is present and complete. |
| **Location** | `nodes/parse_jd.py` |

---

### EC-17 — State accumulates stale ranking deltas across multiple refinements

| Field | Detail |
|---|---|
| **Trigger** | User refines requirements 3+ times. Each refinement adds entries to `ranking_delta`. After the third refinement, `ranking_delta` still contains entries from the first refinement. |
| **Breaks** | Explain-ranking queries may reference outdated delta data, producing confusing explanations about movements that no longer reflect the current ranking. |
| **Fix** | At the start of `calculate_ranking_delta_node`, reset `state["ranking_delta"] = {}` before computing new deltas. This ensures only the most recent refinement's movement is stored. |
| **Location** | `nodes/ranking_delta.py` |

---

### EC-18 — Human feedback loop receives a non-string or special-character input

| Field | Detail |
|---|---|
| **Trigger** | User pastes a multi-line JD or a string with special characters (e.g., `"C++ & React"`, `"5+ years"`) into the feedback prompt |
| **Breaks** | Multi-line input may interact oddly with `input()`. Characters like `&` in prompts can cause LLM formatting issues. |
| **Fix** | Strip and normalize user input: `user_input = " ".join(user_input.split())` to collapse newlines and extra spaces. Truncate to 500 characters with a warning if longer. |
| **Location** | `nodes/human_feedback.py` |

---

## 4. Conversational Interface

### EC-19 — Intent misclassification — refinement treated as new search

| Field | Detail |
|---|---|
| **Trigger** | User says "Now search for candidates who also know Docker" — this could be classified as `new_search` (adds a skill) or `refine_requirements` (modifies criteria) |
| **Breaks** | If misclassified as `new_search`, `parse_jd_node` resets all state and discards the current shortlist. The user loses the current session context. |
| **Fix** | Improve the intent router prompt with examples that distinguish between "start fresh" (`new_search`) and "modify current criteria" (`refine_requirements`). Add a context hint to the prompt: include whether a shortlist already exists in the state. |
| **Location** | `nodes/intent_router.py` |

```python
context_hint = (
    "A shortlist is currently active." if state["candidate_shortlist"]
    else "No search has been run yet."
)
# Pass context_hint into the prompt alongside the query
```

---

### EC-20 — Intent classification returns unexpected whitespace or formatting

| Field | Detail |
|---|---|
| **Trigger** | LLM returns `"  new_search\n"` or `"New_Search"` instead of `"new_search"` |
| **Breaks** | `intent not in valid_intents` evaluates to `True`, so the fallback `"new_search"` is used. This may accidentally trigger a new search when the user intended to compare. |
| **Fix** | Normalize: `intent = response.content.strip().lower().replace(" ", "_")`. Also validate against `valid_intents` before returning. Already done in the implementation; verify case normalization is applied. |
| **Location** | `nodes/intent_router.py` |

---

### EC-21 — Candidate name in "explain ranking" query doesn't match any candidate ID

| Field | Detail |
|---|---|
| **Trigger** | User types "Why did John rank higher than Jane?" but the candidate IDs are `"john_doe"` and `"jane_smith"` |
| **Breaks** | `direct_action_node` searches `state["candidate_shortlist"]` for `"john"` and `"jane"` with an exact substring match. If filenames don't contain these, no candidate is identified and the explanation is generic. |
| **Fix** | Use fuzzy name matching in `direct_action_node`: for `explain_ranking`, extract candidate names from the query with the LLM and match them to the shortlist using `difflib.get_close_matches()`. |
| **Location** | `nodes/direct_action.py` |

```python
import difflib

def find_candidate_id(name_hint: str, shortlist: list[str]) -> str | None:
    matches = difflib.get_close_matches(name_hint.lower(), [c.lower() for c in shortlist], n=1, cutoff=0.6)
    if matches:
        idx = [c.lower() for c in shortlist].index(matches[0])
        return shortlist[idx]
    return None
```

---

### EC-22 — Session ends mid-pipeline due to keyboard interrupt

| Field | Detail |
|---|---|
| **Trigger** | User presses `Ctrl+C` while the agent is waiting for input or processing a round |
| **Breaks** | Python raises `KeyboardInterrupt`. LangGraph graph is left in an incomplete state. Partial reports may have been written to disk. |
| **Fix** | Wrap the `run_agent()` main loop in `try/except KeyboardInterrupt` and print a clean exit message. Optionally serialize the current state to a JSON file for resumption. |
| **Location** | `matching_agent.py` |

---

## 5. Multi-Round Screening

### EC-23 — RAG returns fewer than 10 candidates

| Field | Detail |
|---|---|
| **Trigger** | The corpus has fewer than 10 resumes, or the query is very specific and returns fewer than `top_k` results |
| **Breaks** | No breakage per se, but round 2 and round 3 receive a smaller pool than expected. Scoring tables may only have 2–3 entries. Assertions expecting 10 candidates fail. |
| **Fix** | In `search_resumes_node`, set `top_k = min(10, len(list_resumes()))`. Accept that fewer results may be returned and do not error; instead log how many candidates were found. |
| **Location** | `nodes/search_resumes.py` |

---

### EC-24 — Shortlist is empty after round 1 ranking

| Field | Detail |
|---|---|
| **Trigger** | All candidates retrieved by RAG score below the LLM's reasonable threshold (e.g., the JD asks for a niche skill no candidate has) |
| **Breaks** | `state["candidate_shortlist"]` is `[]`. Round 2 and 3 receive empty pools. `compare_candidates([])` fails. `generate_report` loop iterates nothing and reports `{}`. |
| **Fix** | In `rank_candidates_node`, if `ranked` is empty, set `candidate_shortlist` to the raw `candidate_pool` with uniform score `0.0` and log a warning: "No candidates scored above zero. Returning full pool with baseline scores." |
| **Location** | `nodes/rank_candidates.py` |

---

### EC-25 — Round 2 deep read exposes a `FileNotFoundError` for a shortlisted ID

| Field | Detail |
|---|---|
| **Trigger** | Round 1 returns a candidate ID from the vector store, but that candidate's resume file has since been deleted from disk |
| **Breaks** | `read_resume_by_candidate_id(cid)` raises `FileNotFoundError` inside `search_resumes_node` during round 2. The entire round crashes. |
| **Fix** | In `search_resumes_node` round 2 path, wrap the read in a `try/except FileNotFoundError`. On failure, skip that candidate and remove them from `candidate_pool` with a warning log. |
| **Location** | `nodes/search_resumes.py` |

---

### EC-26 — `advance_screening_round` called when already at round 3

| Field | Detail |
|---|---|
| **Trigger** | A routing bug causes `advance_screening_round` to be called while `screening_round == 3` |
| **Breaks** | Without the cap check, `screening_round` increments to `4`. `search_resumes_node` hits none of the `if/elif` branches and `candidate_pool` is not updated. Subsequent ranking produces stale results. |
| **Fix** | `advance_screening_round_node` already caps at `< 3`. Additionally, add an assertion or log statement: `assert state["screening_round"] <= 3, f"Unexpected round: {state['screening_round']}"`. |
| **Location** | `nodes/advance_screening_round.py` |

---

## 6. Final Recommendation & Explainability

### EC-27 — All candidates classified as BORDERLINE

| Field | Detail |
|---|---|
| **Trigger** | Scores cluster in the 0.60–0.74 range for all candidates |
| **Breaks** | `final_recommendation_node` calls the improvement-suggestions LLM for every candidate, causing N sequential LLM calls. For 10 candidates this is slow and expensive. |
| **Fix** | Batch the borderline improvement generation: send all borderline candidates to the LLM in one call with a structured output asking for suggestions per candidate. |
| **Location** | `nodes/final_recommendation.py` |

---

### EC-28 — `match_reports` is empty when `final_recommendation` runs

| Field | Detail |
|---|---|
| **Trigger** | `final_recommendation` is triggered via `intent == "finalize"` before the pipeline has generated any reports |
| **Breaks** | `reports = state["match_reports"]` is `{}`. The loop over `shortlist` finds no reports. `enhanced_reports` remains empty. No decisions are made and nothing is printed. |
| **Fix** | In `final_recommendation_node`, check `if not state["match_reports"] or not state["candidate_shortlist"]` and redirect with a message: "No screening data available yet. Please complete at least one screening round first." |
| **Location** | `nodes/final_recommendation.py` |

---

### EC-29 — Improvement suggestion LLM returns a string instead of a JSON list

| Field | Detail |
|---|---|
| **Trigger** | LLM responds with a numbered list in plain text: `"1. Get AWS certification\n2. Learn Kubernetes"` instead of `["Get AWS certification", "Learn Kubernetes"]` |
| **Breaks** | `json.loads(match.group())` fails. The `try/except` fallback wraps the raw text in a single-element list: `[text]`. The report shows one improvement item containing the full prose. |
| **Fix** | Use `_parse_json_object(text, fallback=[])` from EC-07. If that returns `[]`, fall back to splitting on newlines: `[line.lstrip("0123456789. ").strip() for line in text.split("\n") if line.strip()]`. |
| **Location** | `nodes/final_recommendation.py` |

---

## 7. Integration Between Existing Streamlit Projects

### EC-30 — Deployed Streamlit service is unreachable

| Field | Detail |
|---|---|
| **Trigger** | `SUMMARY_SERVICE_URL` or `RAG_SERVICE_URL` is set but the service is down, returning a `5xx` error or timing out |
| **Breaks** | `response.raise_for_status()` raises `requests.HTTPError`. The node crashes. |
| **Fix** | Wrap API wrapper calls in `try/except requests.RequestException`. On failure, log the error and return the safe fallback structure. Add a health-check function that pings the service at startup. |
| **Location** | `tools/rag_tool.py`, `tools/reasoning_tools.py` (API wrappers) |

---

### EC-31 — Deployed service returns a response in a different schema

| Field | Detail |
|---|---|
| **Trigger** | A new version of the Streamlit service changes its response format (e.g., `"skill_list"` instead of `"skills"`) |
| **Breaks** | `summary.get("skills", [])` returns `[]` silently. Reports have no skills listed. The issue is not obvious without inspecting the raw response. |
| **Fix** | Add a schema validation step in the wrapper functions that checks for required keys and raises a descriptive `ValueError` if they are missing. Log the raw response for debugging. |
| **Location** | `tools/reasoning_tools.py` (API wrappers) |

---

## Edge Case Quick Reference

| ID | Area | Severity | Fix Priority |
|---|---|---|---|
| EC-01 | Empty resume dir | High | Must fix |
| EC-02 | Empty/unreadable resume | High | Must fix |
| EC-03 | Filename with spaces | Medium | Should fix |
| EC-04 | ID/filename mismatch | High | Must fix |
| EC-05 | Vector store missing | High | Must fix |
| EC-06 | Reports dir missing | Low | Already handled |
| EC-07 | Malformed LLM JSON | High | Must fix |
| EC-08 | Missing API key | High | Must fix |
| EC-09 | Rate limit / timeout | Medium | Should fix |
| EC-10 | Single candidate | Medium | Should fix |
| EC-11 | Too many candidates in one call | Medium | Should fix |
| EC-12 | Empty JD input | High | Must fix |
| EC-13 | Refine before any search | High | Must fix |
| EC-14 | Compare before shortlist | High | Already partially handled |
| EC-15 | Finalize before round 3 | Medium | Should fix |
| EC-16 | Round counter not reset | High | Must fix — confirm reset in parse_jd |
| EC-17 | Stale ranking deltas | Medium | Should fix |
| EC-18 | Special characters in input | Low | Nice to have |
| EC-19 | Intent misclassification | Medium | Should fix |
| EC-20 | LLM intent formatting | Low | Already handled |
| EC-21 | Candidate name mismatch | Medium | Should fix |
| EC-22 | Keyboard interrupt | Low | Nice to have |
| EC-23 | Fewer than 10 results | Low | Already handled |
| EC-24 | Empty shortlist after ranking | High | Must fix |
| EC-25 | File deleted after indexing | Medium | Should fix |
| EC-26 | Round > 3 | Low | Already handled |
| EC-27 | All candidates BORDERLINE | Medium | Should fix |
| EC-28 | Finalize with no reports | High | Must fix |
| EC-29 | Suggestions not JSON list | Medium | Should fix |
| EC-30 | Deployed service unreachable | High | Must fix if using API wrappers |
| EC-31 | Service schema change | Medium | Should fix if using API wrappers |

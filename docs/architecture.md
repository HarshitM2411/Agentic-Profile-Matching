# AirTribe AI Agent — System Architecture

## 1. Architectural Overview

The AirTribe AI Agent is a **stateful, graph-driven recruitment agent** that automates candidate screening end-to-end. It is composed of four major architectural layers that work in concert:

```
┌─────────────────────────────────────────────────────────────┐
│                    Conversational Interface                  │
│            (Natural Language CLI / API Endpoint)            │
└─────────────────────────┬───────────────────────────────────┘
                          │ User Query / Feedback
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  LangGraph Agent Core                        │
│   (State Machine · Graph Nodes · Conditional Routing)       │
└──────┬──────────────────┬──────────────────┬────────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌─────────────┐  ┌─────────────────┐  ┌──────────────────────┐
│  File System│  │   LLM Backend   │  │   Vector Store / RAG │
│    Tools    │  │  (Groq LLM)     │  │  (ChromaDB / FAISS)  │
└─────────────┘  └─────────────────┘  └──────────────────────┘
```

---

## 2. Component Breakdown

### 2.1 Conversational Interface

The entry point for all user interaction. Accepts free-form natural language input and routes it to the agent core.

**Responsibilities:**
- Accept natural language queries from recruiters/hiring managers.
- Display agent responses, match reports, and recommendations.
- Forward user feedback (criteria changes) back into the agent loop.
- Preserve conversation continuity so follow-up queries can refer to previously ranked candidates.

**Interaction Examples:**
```
User: "Find me candidates with React and 3+ years experience"
User: "Compare the top 3 matches side by side"
User: "Why did John rank higher than Jane?"
User: "Actually, TypeScript is a must-have, not optional — re-rank"
```

**Implementation:** Python REPL loop or REST API endpoint.

---

### 2.1.1 Conversational Intent Router

Before executing the full candidate-matching graph, the system classifies each user message into an intent. This prevents every user turn from restarting the complete JD parsing pipeline.

| Intent | Example Query | Routing Behavior |
|---|---|---|
| `new_search` | "Find me candidates with React and 3+ years experience" | Start at `Parse JD` or `Extract Requirements`, then run the screening pipeline |
| `refine_requirements` | "Make TypeScript a must-have" | Update `job_requirements`, preserve previous rankings, then re-run search/ranking |
| `compare_candidates` | "Compare the top 3 matches side by side" | Call `compare_candidates` using the current shortlist |
| `explain_ranking` | "Why did John rank higher than Jane?" | Use stored reasoning and ranking deltas to generate an explanation |
| `generate_questions` | "Create screening questions for John" | Call `generate_interview_questions` for the requested candidate |
| `finalize` | "Give me the final recommendation" | Move to final hire/no-hire recommendation output |

The router writes `current_intent` into `AgentState`, and downstream graph nodes use it for conditional routing.

---

### 2.2 LangGraph Agent Core

The brain of the system. Built using **LangGraph**, which models the agent workflow as a **directed graph** where each node is a discrete processing step and edges define conditional routing logic.

See Section 3 for the complete graph structure.

---

### 2.3 LLM Backend

All natural language understanding and generation is delegated to **Groq** (e.g., `llama-3.3-70b-versatile`) via LangChain's OpenAI-compatible client.

**Configuration:**
```python
from langchain_openai import ChatOpenAI
import os

llm = ChatOpenAI(
    model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
    temperature=0,
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1",
)
```

**Used for:**
- Parsing raw job descriptions into structured requirements.
- Generating human-readable match reports.
- Answering conversational queries about rankings and comparisons.
- Producing interview questions and improvement suggestions.

---

### 2.4 Vector Store / RAG Layer

Provides semantic resume retrieval using embeddings and approximate nearest-neighbor search.

**Used for:**
- Embedding resume text into a vector index at ingestion time.
- Querying the index with a structured requirement set to retrieve the most relevant resumes.
- Supporting both broad (Round 1) and deep (Round 2) retrieval passes.

**Supported backends:** ChromaDB (primary — from the RAG Profile Matching project), FAISS (optional).

**Embeddings:** Local `sentence-transformers` models (e.g., `all-MiniLM-L6-v2`) — no API key required for indexing.

---

### 2.5 File System Tools (Milestone 1)

Low-level I/O tools for interacting with resume files on disk.

**Capabilities:**
- List all available resume files in the corpus directory.
- Read the raw text content of a specific resume by file path or candidate ID.
- Write match reports and screening outputs to disk.

---

## 3. LangGraph Graph Architecture

### 3.1 Full Graph Diagram

```
START
  │
  ▼
Intent Router (Node 0)
  │
  ├── new_search
  │     ▼
  │   Parse JD (Node 1)
  │     ▼
  │   Extract Requirements (Node 2)
  │     ▼
  │   Search Resumes (Node 3)
  │
  ├── refine_requirements
  │     ▼
  │   Snapshot Previous Ranking
  │     ▼
  │   Update Requirements (Node 2B)
  │     ▼
  │   Search Resumes (Node 3)
  │
  ├── compare_candidates / explain_ranking / generate_questions
        ▼
      Direct Action Node (Node 7)
        ▼
      Return Answer
  │
  └── finalize
        ▼
      Final Recommendation (Node 8)
        ▼
      END

Search Resumes (Node 3)
  ▼
Rank Candidates (Node 4)
  ▼
Calculate Ranking Delta (Node 4B, only after refinement)
  ▼
Generate Report (Node 5)
  ▼
Advance Screening Round (Node 5B)
  │
  ├── screening_round < 3 ──► Search Resumes (Node 3)
  │
  └── screening_round == 3
        ▼
      Human Feedback Loop (Node 6)
        │
        ├── criteria updated ──► Snapshot Previous Ranking ──► Update Requirements (Node 2B)
        │
        ├── finalize requested ──► Final Recommendation (Node 8) ──► END
        │
        └── no further action ──► END
```

### 3.2 Node Definitions

| Node | Name | Input | Output | Tools Invoked |
|------|------|-------|--------|---------------|
| 0 | **Intent Router** | User message + current state | `current_intent` | LLM classifier or rules |
| 1 | **Parse JD** | Raw JD text (string) | Cleaned JD for processing | — |
| 2 | **Extract Requirements** | Cleaned JD | `{must_have: [...], nice_to_have: [...], experience: N}` | `extract_requirements(jd)` |
| 2A | **Snapshot Previous Ranking** | Existing shortlist and scores | `previous_shortlist`, `previous_scores` | — |
| 2B | **Update Requirements** | User feedback + existing requirements | Updated `job_requirements`, incremented version | `extract_requirements(feedback)` or structured merge logic |
| 3 | **Search Resumes** | Structured requirements | Candidate pool (file paths + text chunks) | RAG search tool, File system tools |
| 4 | **Rank Candidates** | Candidate pool + requirements | Ordered shortlist, scores, reasoning, ranking deltas | `compare_candidates(ids)`, LLM scoring |
| 4B | **Calculate Ranking Delta** | Previous ranking + current ranking | Movement and score-change explanations | — |
| 5 | **Generate Report** | Ranked shortlist | Per-candidate match reports | `generate_interview_questions(id)`, LLM |
| 5B | **Advance Screening Round** | Current round + reports | Next round signal or completed screening | — |
| 6 | **Human Feedback Loop** | User input + current state | Updated intent, updated criteria, or finish signal | Conversational interface |
| 7 | **Direct Action Node** | Intent + current state | Comparison, explanation, or interview questions | `compare_candidates`, `generate_interview_questions` |
| 8 | **Final Recommendation** | Final ranked shortlist + reports | Hire/no-hire recommendation | LLM evaluation |

### 3.3 Conditional Routing Logic

The graph uses conditional edges after intent routing, report generation, screening-round advancement, and human feedback.

```python
def route_after_intent(state: AgentState) -> str:
    intent = state["current_intent"]

    if intent == "new_search":
        return "parse_jd"

    if intent == "refine_requirements":
        return "snapshot_previous_ranking"

    if intent in {"compare_candidates", "explain_ranking", "generate_questions"}:
        return "direct_action"

    if intent == "finalize":
        return "final_recommendation"

    return "human_feedback_loop"


def route_after_report(state: AgentState) -> str:
    if state["screening_round"] < 3:
        return "advance_screening_round"

    return "human_feedback_loop"


def route_after_advance_screening_round(state: AgentState) -> str:
    return "search_resumes"


def route_after_feedback(state: AgentState) -> str:
    if state["criteria_updated"]:
        return "snapshot_previous_ranking"

    if state["finalize_requested"]:
        return "final_recommendation"

    return "end"
```

This enables iterative refinement without losing previous rankings. Requirement changes go through `Update Requirements` before re-entering search/ranking, while comparison and explanation queries can be answered directly from existing state.

---

## 4. Agent State Schema

The agent state is a typed dictionary that persists across all graph nodes and conversation turns.

```python
from typing import TypedDict, List, Optional, Dict, Any

class AgentState(TypedDict):
    # Conversation context
    conversation_history: List[Dict[str, str]]   # [{role, content}, ...]
    current_query: str                            # latest user message
    current_intent: str                            # new_search, refine_requirements, compare, explain, etc.

    # Job description context
    raw_jd: str                                   # original JD text
    job_requirements: Dict[str, Any]              # parsed must-have / nice-to-have
    requirements_version: int                      # increments whenever criteria are updated
    requirement_change_log: List[Dict[str, Any]]   # record of user-driven criteria changes

    # Screening results
    candidate_pool: List[str]                     # file paths of retrieved resumes
    candidate_shortlist: List[str]                # ordered list of candidate IDs
    candidate_scores: Dict[str, float]            # candidate_id → match score
    reasoning: Dict[str, str]                     # candidate_id → explanation text
    previous_shortlist: List[str]                  # prior ranking before refinement
    previous_scores: Dict[str, float]              # prior scores before refinement
    ranking_delta: Dict[str, Dict[str, Any]]       # movement, score change, and explanation

    # Reports
    match_reports: Dict[str, Dict]                # candidate_id → full report dict
    interview_questions: Dict[str, List[str]]     # candidate_id → questions list

    # Control flow
    criteria_updated: bool                        # flag for re-ranking trigger
    finalize_requested: bool                       # user asked for final recommendation
    screening_round: int                          # 1, 2, or 3
    final_decision: Optional[Dict[str, str]]      # candidate_id → hire/no-hire
```

**State persistence:** LangGraph maintains this state object across all nodes. It is passed into each node function and updated in place, ensuring full context availability at every step.

---

## 5. Tool Architecture

### 5.1 Tool Registry

All tools are registered with the LangGraph agent and made available at any node that requires them.

Tools are intentionally small and deterministic where possible. When a tool needs the current JD requirements or candidate context, the graph node passes that context explicitly from `AgentState`; the tool should not depend on hidden global state.

```
Agent Core
    │
    ├── File System Tools
    │       ├── list_resumes() → List[str]
    │       ├── read_resume(path: str) → str
    │       └── write_report(candidate_id: str, content: str) → None
    │
    ├── RAG Search Tool
    │       └── search_resumes(query: str, top_k: int) → List[ResumeChunk]
    │
    └── Custom Reasoning Tools
            ├── extract_requirements(jd: str) → RequirementsDict
            ├── compare_candidates(candidate_ids: list, requirements: dict) → ComparisonReport
            └── generate_interview_questions(candidate_id: str, requirements: dict) → List[str]
```

### 5.2 Tool Specifications

#### `extract_requirements(jd: str) → dict`

Parses a raw job description into a structured requirements object.

```
Input:  Raw JD string (free-form text)

Output: {
  "must_have":    ["Python", "5+ years backend", "REST APIs"],
  "nice_to_have": ["Docker", "Kubernetes", "AWS"],
  "role_level":   "Senior",
  "domain":       "Backend Engineering"
}
```

**Internal logic:** LLM prompt with a structured extraction schema. Uses few-shot examples to distinguish must-have from nice-to-have.

---

#### `compare_candidates(candidate_ids: list, requirements: dict) → dict`

Performs a structured head-to-head comparison across two or more candidates.

```
Input:  candidate_ids = ["candidate_001", "candidate_002", "candidate_003"]
        requirements = {"must_have": [...], "nice_to_have": [...]}

Output: {
  "winner": "candidate_001",
  "comparison_table": {
    "candidate_001": {"must_have_score": 0.95, "nice_to_have_score": 0.7, ...},
    "candidate_002": {"must_have_score": 0.80, "nice_to_have_score": 0.9, ...},
  },
  "reasoning": "candidate_001 satisfies all must-haves; candidate_002 lacks Python."
}
```

**Internal logic:** Fetches each candidate's resume, scores against the requirements passed by the graph node, and produces a side-by-side breakdown.

---

#### `generate_interview_questions(candidate_id: str, requirements: dict) → list`

Generates tailored screening questions based on a candidate's profile and identified gaps.

```
Input:  candidate_id = "candidate_001"
        requirements = {"must_have": [...], "nice_to_have": [...]}

Output: [
  "Can you walk us through a project where you designed REST APIs at scale?",
  "You listed Docker in your resume — how have you used it in production?",
  "Your resume doesn't mention Kubernetes. Are you open to learning it?"
]
```

**Internal logic:** Cross-references the candidate's resume text against the current requirements, identifies strengths to probe deeper and gaps to screen for.

---

## 6. Multi-Round Screening Pipeline

### 6.1 Pipeline Overview

The agent implements a three-round funnel to balance cost efficiency with decision quality:

```
┌──────────────────────────────────────────────────────────────┐
│  ROUND 1 — Broad Screening                                   │
│  Input:   Full corpus (100 resumes)                          │
│  Method:  RAG semantic search + lightweight scoring          │
│  Output:  Top 10 candidates shortlisted                      │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  ROUND 2 — Deep Analysis                                     │
│  Input:   Top 10 candidates                                  │
│  Method:  Full resume read + LLM scoring + compare_candidates│
│  Output:  Ranked top 10 with detailed per-candidate scores   │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  ROUND 3 — Final Recommendation                              │
│  Input:   Ranked top 10                                      │
│  Method:  Holistic LLM evaluation + explainability generation│
│  Output:  Hire / No-Hire per candidate + interview questions │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Screening Round State Transitions

```python
def search_resumes_node(state: AgentState) -> AgentState:
    requirements = state["job_requirements"]

    if state["screening_round"] == 1:
        # Initial screen: top 10 from the full resume corpus.
        state["candidate_pool"] = rag_search(requirements, top_k=10)

    elif state["screening_round"] == 2:
        # Deep analysis: read full resumes for the current top 10.
        state["candidate_pool"] = [
            read_resume(candidate_id)
            for candidate_id in state["candidate_shortlist"]
        ]

    elif state["screening_round"] == 3:
        # Final round: no new retrieval; evaluate the ranked shortlist.
        state["candidate_pool"] = state["candidate_shortlist"]

    return state


def advance_screening_round_node(state: AgentState) -> AgentState:
    if state["screening_round"] < 3:
        state["screening_round"] += 1

    return state
```

### 6.3 Ranking Delta Generation

Before any re-ranking caused by updated user criteria, the agent snapshots the previous ranking:

```python
def snapshot_previous_ranking(state: AgentState) -> AgentState:
    state["previous_shortlist"] = state["candidate_shortlist"]
    state["previous_scores"] = state["candidate_scores"]
    return state
```

After the new ranking is generated, the ranker calculates movement and score changes:

```python
def calculate_ranking_delta(state: AgentState) -> AgentState:
    old_rank = {cid: index for index, cid in enumerate(state["previous_shortlist"])}
    new_rank = {cid: index for index, cid in enumerate(state["candidate_shortlist"])}

    deltas = {}
    for candidate_id in state["candidate_shortlist"]:
        previous_position = old_rank.get(candidate_id)
        current_position = new_rank[candidate_id]
        previous_score = state["previous_scores"].get(candidate_id)
        current_score = state["candidate_scores"][candidate_id]

        deltas[candidate_id] = {
            "previous_position": previous_position,
            "current_position": current_position,
            "position_change": None if previous_position is None else previous_position - current_position,
            "previous_score": previous_score,
            "current_score": current_score,
            "score_change": None if previous_score is None else current_score - previous_score,
            "reason": state["reasoning"].get(candidate_id, ""),
        }

    state["ranking_delta"] = deltas
    return state
```

This directly satisfies the requirement that the agent re-ranks based on new criteria and explains changes in rankings.

---

## 7. Explainability Architecture

Every decision is accompanied by traceable, human-readable reasoning at three levels:

### 7.1 Match Report Structure

```
CandidateMatchReport
├── candidate_id
├── overall_score         (0.0 – 1.0)
├── must_have_coverage    (list of met / unmet must-haves)
├── nice_to_have_coverage (list of met / unmet nice-to-haves)
├── strengths             (free-text: what they excel at)
├── gaps                  (free-text: what is missing)
├── improvement_suggestions (only for borderline candidates)
└── hire_recommendation   (HIRE / NO-HIRE / BORDERLINE)
```

### 7.2 Borderline Candidate Handling

Candidates whose `overall_score` falls within a configurable threshold (e.g., 0.60–0.75) are classified as **BORDERLINE** and receive additional output:

- A specific gap analysis explaining exactly what is missing.
- Actionable improvement suggestions (e.g., certifications, skills to develop).
- A note indicating they may be considered for a junior variant of the role.

### 7.3 Ranking Explainability

When a user asks *"Why did John rank higher than Jane?"*, the agent:
1. Retrieves both candidates' `reasoning` entries from state.
2. Calls `compare_candidates(["john_id", "jane_id"], state["job_requirements"])`.
3. Generates a natural language explanation contrasting their scores.

When a user asks *"What changed after I updated the criteria?"*, the agent:
1. Reads `previous_shortlist`, `previous_scores`, and `ranking_delta`.
2. Identifies candidates who moved up, moved down, newly entered, or dropped out.
3. Explains the movement in terms of the updated must-have and nice-to-have requirements.

Example explanation:

```
After TypeScript became a must-have, Priya moved from #4 to #1 because her resume shows 4 years of TypeScript and React project ownership. Arjun dropped from #2 to #6 because his React experience is strong, but TypeScript is not clearly demonstrated.
```

---

## 8. Data Flow Diagram

```
User Input (JD + query)
        │
        ▼
┌───────────────┐     ┌─────────────────────────────────────┐
│ Intent Router │────►│  AgentState.current_intent           │
└───────────────┘     └─────────────────────────────────────┘
        │
        ├── direct action ──► compare / explain / questions / final recommendation
        │
        ▼
┌───────────────┐     ┌─────────────────────────────────────┐
│  Parse JD     │────►│  AgentState.raw_jd                  │
└───────────────┘     └─────────────────────────────────────┘
        │
        ▼
┌───────────────────┐  ┌─────────────────────────────────────┐
│ ExtractRequirements│─►│  AgentState.job_requirements        │
└───────────────────┘  └─────────────────────────────────────┘
        │
        ▼
┌───────────────┐     ┌─────────────────────────────────────┐
│ Search Resumes│────►│  AgentState.candidate_pool           │
│ (RAG + FS)    │     └─────────────────────────────────────┘
└───────────────┘
        │
        ▼
┌───────────────────┐  ┌─────────────────────────────────────┐
│  Rank Candidates  │─►│  AgentState.candidate_shortlist      │
│  (LLM + compare)  │  │  AgentState.candidate_scores         │
└───────────────────┘  │  AgentState.reasoning                │
                       │  AgentState.ranking_delta            │
                       └─────────────────────────────────────┘
        │
        ▼
┌───────────────────┐  ┌─────────────────────────────────────┐
│  Generate Report  │─►│  AgentState.match_reports            │
│  (LLM + gen_qs)   │  │  AgentState.interview_questions      │
└───────────────────┘  └─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│   Human Feedback Loop               │
│   ► Display reports to user         │
│   ► Accept updated criteria?        │
│   ► YES → snapshot previous ranking │
│          update requirements        │
│          re-route to search/rank    │
│   ► NO  → final recommendation/END  │
└─────────────────────────────────────┘
```

---

## 9. Project File Structure

```
airTribe AI Agent Project/
│
├── docs/
│   ├── problemStatement.md       # Original assignment requirements
│   ├── context.md                # Detailed project context
│   └── architecture.md           # This document
│
├── matching_agent.py             # Core LangGraph agent (main deliverable)
│
├── tools/
│   ├── file_tools.py             # File system tools (Milestone 1)
│   ├── rag_tool.py               # RAG search tool (Milestone 2)
│   └── reasoning_tools.py        # extract_requirements, compare_candidates,
│                                 #   generate_interview_questions
│
├── state/
│   └── agent_state.py            # AgentState TypedDict definition
│
├── nodes/
│   ├── intent_router.py          # Node 0: conversational intent classifier
│   ├── parse_jd.py               # Node 1: JD parser
│   ├── extract_requirements.py   # Node 2: requirement extractor
│   ├── snapshot_ranking.py       # Node 2A: preserve previous ranking before refinement
│   ├── update_requirements.py    # Node 2B: merge user feedback into requirements
│   ├── search_resumes.py         # Node 3: RAG retrieval
│   ├── rank_candidates.py        # Node 4: candidate ranker
│   ├── ranking_delta.py          # Node 4B: explain rank and score movement
│   ├── generate_report.py        # Node 5: report generator
│   ├── advance_screening_round.py # Node 5B: round transition logic
│   ├── human_feedback.py         # Node 6: feedback loop handler
│   ├── direct_action.py          # Node 7: compare/explain/question actions
│   └── final_recommendation.py   # Node 8: hire/no-hire output
│
├── data/
│   ├── resumes/                  # Resume corpus (raw .txt / .pdf files)
│   └── vector_store/             # Persisted FAISS / ChromaDB index
│
├── reports/                      # Generated match reports (output)
│
└── requirements.txt              # Python dependencies
```

---

## 10. Technology Stack & Dependencies

| Layer | Technology | Purpose |
|---|---|---|
| Agent Orchestration | `langgraph` | Stateful graph execution, conditional routing |
| LLM Interface | `langchain`, `langchain-openai`, `openai` | Groq LLM calls via OpenAI-compatible API |
| Vector Store | `chromadb` (primary) or `faiss-cpu` | Resume embedding index + semantic search |
| Embeddings | `sentence-transformers` (local) | Resume and query vectorization — no cloud API key |
| File I/O | Python `pathlib`, `os` | Resume file reading and report writing |
| State Schema | `typing.TypedDict` or `pydantic` | Typed agent state definition |
| Interface | Python REPL or `fastapi` | Conversational entry point |
| Language | Python 3.10+ | Runtime |

---

## 11. Key Architectural Decisions

### Decision 1: LangGraph over a simple ReAct loop
A plain ReAct agent cannot enforce a structured multi-step pipeline or a clean human-in-the-loop interruption point. LangGraph's explicit graph model gives us **deterministic node sequencing**, **conditional routing**, and **persistent state** — all required for this use case.

### Decision 2: Three-round funnel over single-pass ranking
Running deep LLM analysis on 100 resumes in one pass is expensive. The funnel concentrates token budget on the top candidates only, reducing cost by approximately **10x** while preserving quality on the final shortlist.

### Decision 3: Structured state over conversation memory only
Storing `job_requirements`, `candidate_shortlist`, and `reasoning` as typed fields in state (rather than encoding everything in conversation history) makes them directly accessible to tools and nodes without re-parsing conversation history at each step.

### Decision 4: Separate tool layer
Keeping tools in a dedicated `tools/` module decouples reasoning logic from the graph structure. Tools can be tested independently, reused across nodes, and replaced (e.g., swapping ChromaDB paths or RAG repo versions) without touching graph code.

### Decision 5: Groq over OpenAI for LLM inference
Groq provides fast, cost-effective inference via an OpenAI-compatible API. Both existing milestone projects (Resume Analyser and RAG Profile Matching) already use Groq (`GROQ_API_KEY`, `llama-3.3-70b-versatile`). Using the same provider keeps configuration consistent and avoids maintaining two API keys. Embeddings remain local via `sentence-transformers` in the RAG layer — Groq is used only for text generation and structured reasoning.

### Decision 6: Explainability as a first-class output
Explainability is not post-hoc; the `reasoning` and `match_reports` state fields are populated at ranking time, ensuring every agent decision has a recorded rationale that can be surfaced at any point in the conversation.

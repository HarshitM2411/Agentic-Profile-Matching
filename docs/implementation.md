# AirTribe AI Agent — Phase-wise Implementation Plan

## Overview

This document breaks the full build into **7 sequential phases**. Each phase is self-contained, produces testable output, and directly maps to a section of the architecture and a graded part of the assignment.

| Phase | Focus | Assignment Coverage |
|---|---|---|
| 0 | Project setup, dependencies, folder scaffold | Pre-requisite |
| 1 | AgentState schema + File System Tools | Part A — Foundation |
| 2 | RAG Tool + LLM Summary Tool integration | Part A — Tool Layer |
| 3 | Custom Reasoning Tools | Part A — Tool Layer |
| 4 | LangGraph graph — core screening pipeline (Nodes 1–5B) | Part A + Part C |
| 5 | Intent Router + Conversational Interface (Nodes 0, 6, 7) | Part B |
| 6 | Iterative Refinement + Ranking Delta (Nodes 2A, 2B, 4B) | Part B |
| 7 | Final Recommendation + Explainability (Node 8) | Part C |

---

## Phase 0 — Project Setup

**Goal:** Create the project structure, install all dependencies, and confirm the environment is working before writing any agent code.

### 0.1 Folder Scaffold

Create the following structure exactly as defined in the architecture:

```
airTribe AI Agent Project/
│
├── docs/                          # already exists
├── matching_agent.py              # create empty
│
├── tools/
│   ├── __init__.py
│   ├── file_tools.py
│   ├── rag_tool.py
│   └── reasoning_tools.py
│
├── state/
│   ├── __init__.py
│   └── agent_state.py
│
├── nodes/
│   ├── __init__.py
│   ├── intent_router.py
│   ├── parse_jd.py
│   ├── extract_requirements.py
│   ├── snapshot_ranking.py
│   ├── update_requirements.py
│   ├── search_resumes.py
│   ├── rank_candidates.py
│   ├── ranking_delta.py
│   ├── generate_report.py
│   ├── advance_screening_round.py
│   ├── human_feedback.py
│   ├── direct_action.py
│   └── final_recommendation.py
│
├── data/
│   ├── resumes/                   # drop resume .txt/.pdf files here
│   └── vector_store/              # auto-created by RAG tool
│
├── reports/                       # auto-created by file tools
└── requirements.txt
```

### 0.2 Dependencies

```
# requirements.txt

langgraph>=0.1.0
langchain>=0.2.0
langchain-openai>=0.1.0
langchain-community>=0.2.0
openai>=1.0.0
chromadb>=0.4.0
sentence-transformers>=2.2.0
faiss-cpu>=1.7.4
python-dotenv>=1.0.0
pydantic>=2.0.0
pypdf>=4.0.0
requests>=2.31.0
```

Install with:

```bash
pip install -r requirements.txt
```

### 0.3 Environment Variables

Create a `.env` file at the project root:

```
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=llama-3.3-70b-versatile
RESUME_DIR=data/resumes
VECTOR_STORE_DIR=data/vector_store
CHROMA_COLLECTION_NAME=resumes
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
REPORTS_DIR=reports

# Optional: only needed if using deployed services instead of local imports
SUMMARY_SERVICE_URL=https://your-summary-service.example.com
RAG_SERVICE_URL=https://your-rag-service.example.com
```

Load it at the top of `matching_agent.py`:

```python
import os
from dotenv import load_dotenv

load_dotenv()

if not os.getenv("GROQ_API_KEY"):
    raise EnvironmentError(
        "GROQ_API_KEY is not set. Create a .env file with your Groq API key."
    )
```

All LLM-backed nodes and tools (`extract_requirements`, `summarize_resume`, intent router, etc.) use the shared `llm` instance defined in `tools/reasoning_tools.py`, configured against Groq's OpenAI-compatible endpoint (`https://api.groq.com/openai/v1`).

### 0.4 Acceptance Criteria

- All folders and empty `__init__.py` files created.
- `pip install -r requirements.txt` completes with no errors.
- `import langgraph` and `import langchain_openai` succeed in a Python shell.
- `import pypdf` succeeds if PDF resumes will be used.

---

## Phase 1 — AgentState Schema + File System Tools

**Goal:** Define the complete typed state object and implement the three file system tools that underpin all resume I/O.

**Assignment mapping:** Part A — Agent State Design

### 1.1 AgentState (`state/agent_state.py`)

Define the full state schema as a `TypedDict`. Every field must be present with a correct type annotation, since LangGraph validates state transitions.

```python
from typing import TypedDict, List, Optional, Dict, Any


class AgentState(TypedDict):
    # ── Conversation ──────────────────────────────────────────────
    conversation_history: List[Dict[str, str]]  # [{role, content}, ...]
    current_query: str
    current_intent: str  # new_search | refine_requirements | compare_candidates
                         # explain_ranking | generate_questions | finalize

    # ── Job Description ───────────────────────────────────────────
    raw_jd: str
    job_requirements: Dict[str, Any]       # {must_have, nice_to_have, role_level, domain}
    requirements_version: int              # increments on each update
    requirement_change_log: List[Dict[str, Any]]  # [{version, change, timestamp}]

    # ── Screening Results ─────────────────────────────────────────
    candidate_pool: List[str]              # file paths or IDs from current search pass
    candidate_shortlist: List[str]         # ordered by score (best first)
    candidate_scores: Dict[str, float]     # candidate_id → 0.0–1.0
    reasoning: Dict[str, str]              # candidate_id → why this score

    # ── Refinement Tracking ───────────────────────────────────────
    previous_shortlist: List[str]
    previous_scores: Dict[str, float]
    ranking_delta: Dict[str, Dict[str, Any]]  # {position_change, score_change, reason}

    # ── Reports ───────────────────────────────────────────────────
    match_reports: Dict[str, Dict]         # candidate_id → CandidateMatchReport
    interview_questions: Dict[str, List[str]]  # candidate_id → [questions]

    # ── Control Flow ──────────────────────────────────────────────
    screening_round: int                   # 1, 2, or 3
    criteria_updated: bool
    finalize_requested: bool
    final_decision: Optional[Dict[str, str]]  # candidate_id → HIRE|NO-HIRE|BORDERLINE
```

Also write an initializer function that returns a fresh default state:

```python
def initial_state() -> AgentState:
    return AgentState(
        conversation_history=[],
        current_query="",
        current_intent="",
        raw_jd="",
        job_requirements={},
        requirements_version=0,
        requirement_change_log=[],
        candidate_pool=[],
        candidate_shortlist=[],
        candidate_scores={},
        reasoning={},
        previous_shortlist=[],
        previous_scores={},
        ranking_delta={},
        match_reports={},
        interview_questions={},
        screening_round=1,
        criteria_updated=False,
        finalize_requested=False,
        final_decision=None,
    )
```

### 1.2 File System Tools (`tools/file_tools.py`)

Implement three tools that are the I/O foundation for all resume operations.

```python
import os
import json
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

RESUME_DIR = Path(os.getenv("RESUME_DIR", "data/resumes"))
REPORTS_DIR = Path(os.getenv("REPORTS_DIR", "reports"))
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def list_resumes() -> list[str]:
    """Return all resume file paths in the resume directory."""
    return [
        str(p) for p in RESUME_DIR.glob("*")
        if p.suffix.lower() in {".txt", ".pdf", ".md"}
    ]


def read_resume(file_path: str) -> str:
    """Read and return the text content of a resume file."""
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Resume not found: {file_path}")

    if path.suffix.lower() == ".pdf":
        from pypdf import PdfReader

        reader = PdfReader(str(path))
        return "\n".join(page.extract_text() or "" for page in reader.pages)

    return path.read_text(encoding="utf-8")


def resolve_candidate_path(candidate_id_or_path: str) -> str:
    """
    Resolve a candidate ID like 'alice' or a direct path like
    'data/resumes/alice.txt' into an existing resume file path.
    """
    candidate_path = Path(candidate_id_or_path)
    if candidate_path.exists():
        return str(candidate_path)

    for extension in (".txt", ".pdf", ".md"):
        path = RESUME_DIR / f"{candidate_id_or_path}{extension}"
        if path.exists():
            return str(path)

    raise FileNotFoundError(f"Resume not found for candidate: {candidate_id_or_path}")


def read_resume_by_candidate_id(candidate_id: str) -> str:
    """Resolve a candidate ID and return its resume text."""
    return read_resume(resolve_candidate_path(candidate_id))


def write_report(candidate_id: str, content: dict) -> None:
    """Persist a candidate match report to disk as JSON."""
    report_path = REPORTS_DIR / f"{candidate_id}_report.json"
    report_path.write_text(json.dumps(content, indent=2), encoding="utf-8")
```

### 1.3 Acceptance Criteria

- `initial_state()` returns a dict with all required keys and no `KeyError` when accessed.
- `list_resumes()` returns a list of file paths when `.txt` files are placed in `data/resumes/`.
- `read_resume(path)` returns the full text of a given file.
- `read_resume(path)` can read both `.txt` and `.pdf` resumes.
- `read_resume_by_candidate_id("alice")` resolves `data/resumes/alice.txt` or `data/resumes/alice.pdf`.
- `write_report("test_001", {...})` creates `reports/test_001_report.json`.

---

## Phase 2 — Tool Layer: RAG Tool + LLM Resume Summary

**Goal:** Wire your two existing Streamlit projects into callable Python functions that the LangGraph nodes can import directly.

**Assignment mapping:** Part A — RAG search tool (Milestone 2), File system tools (Milestone 1)

### 2.1 Approach

Your two Streamlit projects contain core logic that should be **extracted into plain Python functions**. The Streamlit layer (UI) remains separate. `matching_agent.py` imports only the core functions, never the Streamlit app itself.

```
Your Streamlit Project 1           Your Streamlit Project 2
(LLM Resume Summariser)            (RAG Profile Matcher)
│                                  │
├── streamlit_app.py  ← keep       ├── streamlit_app.py  ← keep
└── core/                          └── core/
    └── summarizer.py  ← expose        └── matcher.py    ← expose
```

If the Streamlit projects are already deployed and cannot be imported as Python modules, expose their core logic through small HTTP endpoints and call those endpoints from the tool wrappers. The LangGraph agent should call **functions or APIs**, not drive the Streamlit UI.

### 2.1.1 Required Tool Contracts

Regardless of whether the implementation is imported locally or called over HTTP, both existing projects must expose stable contracts.

```python
def summarize_resume(resume_text: str) -> dict:
    """
    Returns:
    {
      "summary": str,
      "skills": list[str],
      "experience_years": int,
      "strengths": list[str],
      "gaps": list[str]
    }
    """


def search_resumes(query: str, top_k: int = 10) -> list[dict]:
    """
    Returns:
    [
      {
        "candidate_id": str,
        "file_path": str,
        "score": float,
        "text_chunk": str
      }
    ]
    """
```

If using deployed services, keep the same contracts at the wrapper level:

```python
import os
import requests

SUMMARY_SERVICE_URL = os.getenv("SUMMARY_SERVICE_URL")
RAG_SERVICE_URL = os.getenv("RAG_SERVICE_URL")


def summarize_resume_via_api(resume_text: str) -> dict:
    response = requests.post(
        f"{SUMMARY_SERVICE_URL}/summarize",
        json={"resume_text": resume_text},
        timeout=60,
    )
    response.raise_for_status()
    return response.json()


def search_resumes_via_api(query: str, top_k: int = 10) -> list[dict]:
    response = requests.post(
        f"{RAG_SERVICE_URL}/search",
        json={"query": query, "top_k": top_k},
        timeout=60,
    )
    response.raise_for_status()
    return response.json()
```

Use one path consistently:

| Situation | Recommended Integration |
|---|---|
| Streamlit code is in the same repository or importable package | Import the core functions directly |
| Streamlit app is deployed separately | Add API endpoints and call them with wrapper functions |
| Streamlit app only has UI code today | Refactor UI logic into reusable core functions first |

### 2.2 RAG Tool (`tools/rag_tool.py`)

Extract the vector search logic from your [RAG Profile Matching](https://github.com/HarshitM2411/RAG-Based-Profile-matching) project (`resume_rag.py`, `job_matcher.py`) and expose it here. That project uses **ChromaDB** with local **sentence-transformers** embeddings — Groq is only used for match reasoning inside `job_matcher.py`, not for embeddings.

**Recommended approach:** import `build_vector_store` and `match_jobs` from the RAG repo (local clone or editable install), then adapt the output to the agent contract:

```python
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

VECTOR_STORE_DIR = Path(os.getenv("VECTOR_STORE_DIR", "data/vector_store"))


def build_vector_store(resume_dir: str) -> None:
    """
    One-time ingestion: chunk, embed, and persist resumes to ChromaDB.
    Delegates to the RAG Profile Matching project's ingestion pipeline.
    """
    from resume_rag import build_vector_store as _build  # RAG repo on PYTHONPATH

    _build(resume_dir)


def search_resumes(query: str, top_k: int = 10) -> list[dict]:
    """
    Search the vector store for the most relevant resumes.

    Returns a list of dicts: [{candidate_id, file_path, score, text_chunk}]
    """
    from job_matcher import match_jobs  # RAG repo on PYTHONPATH

    result = match_jobs(query, top_k=top_k)
    output = []
    for entry in result.get("top_matches", []):
        path = Path(entry["resume_path"])
        excerpts = entry.get("relevant_excerpts") or []
        output.append({
            "candidate_id": path.stem,
            "file_path": entry["resume_path"],
            "score": float(entry["match_score"]),
            "text_chunk": excerpts[0] if excerpts else "",
        })
    return output
```

**Alternative (FAISS reference implementation):** If you are not importing the RAG repo, you may use a self-contained FAISS index with local HuggingFace embeddings via `langchain-community`. Groq is **not** used for embeddings — only for LLM reasoning tools.

**Note:** If your RAG project already has a built ChromaDB index, point `VECTOR_STORE_DIR` / `CHROMA_PERSIST_DIR` to the same path so you don't need to re-embed everything.

### 2.3 LLM Summary Tool (`tools/reasoning_tools.py` — partial)

Extract the LLM resume summarisation logic from your [Resume Analyser](https://github.com/HarshitM2411/Resume-Analyser) project. All LLM calls in this agent use **Groq** via LangChain's OpenAI-compatible client (same pattern as `llm_file_assistant.py` in that repo).

Add a shared LLM instance at the top of `tools/reasoning_tools.py`:

```python
import os
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate

llm = ChatOpenAI(
    model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
    temperature=0,
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1",
)


def summarize_resume(resume_text: str) -> dict:
    """
    Use your existing LLM summariser to extract structured info from a resume.
    Returns: {summary, skills, experience_years, strengths, gaps}
    """
    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "You are a recruiter assistant. Extract structured information from "
            "the following resume. Return JSON with keys: summary (str), "
            "skills (list of str), experience_years (int), "
            "strengths (list of str), gaps (list of str)."
        )),
        ("human", "{resume_text}"),
    ])
    chain = prompt | llm
    response = chain.invoke({"resume_text": resume_text})

    import json, re
    text = response.content
    match = re.search(r"\{.*\}", text, re.DOTALL)
    return json.loads(match.group()) if match else {"summary": text, "skills": [], "experience_years": 0, "strengths": [], "gaps": []}
```

### 2.4 Acceptance Criteria

- `build_vector_store("data/resumes")` runs without error and creates files in `data/vector_store/`.
- `search_resumes("Python backend engineer 5 years", top_k=3)` returns a list of 3 dicts.
- `summarize_resume(some_resume_text)` returns a dict with at least `skills` and `summary` keys.
- If using deployed Streamlit-backed services, `SUMMARY_SERVICE_URL` and `RAG_SERVICE_URL` are configured and both wrapper functions return the same shapes as the local functions.

---

## Phase 3 — Custom Reasoning Tools

**Goal:** Implement the three custom tools specified in Part A of the assignment.

**Assignment mapping:** Part A — Additional tools (`extract_requirements`, `compare_candidates`, `generate_interview_questions`)

All three tools reuse the shared `llm` object from `tools/reasoning_tools.py` (Groq via `ChatOpenAI` + `base_url`). Do not create separate LLM instances per tool.

### 3.1 `extract_requirements` (`tools/reasoning_tools.py`)

```python
def extract_requirements(jd: str) -> dict:
    """
    Parse a raw job description into structured must-have and nice-to-have requirements.
    """
    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "You are a job requirements analyst. Given a job description, extract "
            "structured requirements. Return JSON with keys: "
            "must_have (list of str — non-negotiable skills/qualifications), "
            "nice_to_have (list of str — preferred but optional), "
            "experience_years (int — minimum years required), "
            "role_level (str — Junior/Mid/Senior/Lead), "
            "domain (str — e.g. Backend Engineering, Data Science)."
        )),
        ("human", "{jd}"),
    ])
    chain = prompt | llm
    response = chain.invoke({"jd": jd})

    import json, re
    text = response.content
    match = re.search(r"\{.*\}", text, re.DOTALL)
    return json.loads(match.group()) if match else {}
```

### 3.2 `compare_candidates` (`tools/reasoning_tools.py`)

```python
from tools.file_tools import read_resume_by_candidate_id


def compare_candidates(candidate_ids: list[str], requirements: dict) -> dict:
    """
    Score and compare multiple candidates head-to-head against the given requirements.
    """
    profiles = {}
    for cid in candidate_ids:
        try:
            profiles[cid] = read_resume_by_candidate_id(cid)
        except FileNotFoundError:
            profiles[cid] = ""

    profiles_text = "\n\n---\n\n".join(
        f"Candidate: {cid}\n{text}" for cid, text in profiles.items()
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "You are a senior recruiter. Compare the following candidates against "
            "the job requirements. For each candidate return a JSON object with: "
            "must_have_score (0.0-1.0), nice_to_have_score (0.0-1.0), "
            "overall_score (0.0-1.0), reasoning (str). "
            "Also return winner (candidate_id with highest overall_score). "
            "Return valid JSON: {winner: str, candidates: {id: {scores...}}, reasoning: str}"
        )),
        ("human", "Requirements:\n{requirements}\n\nCandidates:\n{profiles}"),
    ])
    chain = prompt | llm
    response = chain.invoke({
        "requirements": str(requirements),
        "profiles": profiles_text,
    })

    import json, re
    text = response.content
    match = re.search(r"\{.*\}", text, re.DOTALL)
    return json.loads(match.group()) if match else {"winner": candidate_ids[0], "candidates": {}, "reasoning": ""}
```

### 3.3 `generate_interview_questions` (`tools/reasoning_tools.py`)

```python
def generate_interview_questions(candidate_id: str, requirements: dict) -> list[str]:
    """
    Generate tailored screening questions based on a candidate's profile and gaps.
    """
    try:
        resume_text = read_resume_by_candidate_id(candidate_id)
    except FileNotFoundError:
        return ["Could not load resume for this candidate."]

    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "You are a technical interviewer. Given a candidate's resume and job "
            "requirements, generate 5 targeted interview questions. "
            "Mix questions that probe strengths and questions that address gaps. "
            "Return a JSON list of question strings."
        )),
        ("human", "Requirements:\n{requirements}\n\nResume:\n{resume}"),
    ])
    chain = prompt | llm
    response = chain.invoke({
        "requirements": str(requirements),
        "resume": resume_text,
    })

    import json, re
    text = response.content
    match = re.search(r"\[.*\]", text, re.DOTALL)
    return json.loads(match.group()) if match else [text]
```

### 3.4 Acceptance Criteria

- `extract_requirements(jd_string)` returns a dict with `must_have` and `nice_to_have` keys.
- `compare_candidates(["alice", "bob"], requirements)` returns a `winner` and per-candidate scores.
- `generate_interview_questions("alice", requirements)` returns a list of 5 question strings.

---

## Phase 4 — LangGraph Core Screening Pipeline (Nodes 1–5B)

**Goal:** Build the deterministic heart of the agent — the linear screening pipeline from JD parsing through report generation. This is the core of Part A (40%).

**Assignment mapping:** Part A — Agent Workflow (Graph Structure), Part C — Multi-Round Screening

### 4.1 Node Implementations

#### `nodes/parse_jd.py` — Node 1

```python
from state.agent_state import AgentState


def parse_jd_node(state: AgentState) -> AgentState:
    """Clean and store the raw JD from the current query."""
    raw_jd = state["current_query"]
    state["raw_jd"] = raw_jd.strip()
    state["screening_round"] = 1
    state["candidate_pool"] = []
    state["candidate_shortlist"] = []
    state["candidate_scores"] = {}
    state["reasoning"] = {}
    state["previous_shortlist"] = []
    state["previous_scores"] = {}
    state["ranking_delta"] = {}
    state["match_reports"] = {}
    state["interview_questions"] = {}
    state["final_decision"] = None
    state["conversation_history"].append({
        "role": "system",
        "content": f"Parsing JD: {raw_jd[:100]}..."
    })
    return state
```

#### `nodes/extract_requirements.py` — Node 2

```python
from state.agent_state import AgentState
from tools.reasoning_tools import extract_requirements


def extract_requirements_node(state: AgentState) -> AgentState:
    """Parse the cleaned JD into structured must-have / nice-to-have requirements."""
    requirements = extract_requirements(state["raw_jd"])
    state["job_requirements"] = requirements
    state["requirements_version"] = state.get("requirements_version", 0) + 1
    return state
```

#### `nodes/search_resumes.py` — Node 3

The behaviour of this node changes based on `screening_round`:

```python
from state.agent_state import AgentState
from tools.rag_tool import search_resumes
from tools.file_tools import read_resume, list_resumes


def search_resumes_node(state: AgentState) -> AgentState:
    requirements = state["job_requirements"]
    query = (
        " ".join(requirements.get("must_have", []))
        + " "
        + requirements.get("domain", "")
    ).strip()

    if state["screening_round"] == 1:
        # Broad search over full corpus
        results = search_resumes(query, top_k=10)
        state["candidate_pool"] = [r["candidate_id"] for r in results]

    elif state["screening_round"] == 2:
        # Deep pass: work from the shortlist already established in Round 1
        state["candidate_pool"] = list(state["candidate_shortlist"])

    elif state["screening_round"] == 3:
        # Final pass: same shortlist, no new retrieval
        state["candidate_pool"] = list(state["candidate_shortlist"])

    return state
```

#### `nodes/rank_candidates.py` — Node 4

```python
from state.agent_state import AgentState
from tools.reasoning_tools import compare_candidates


def rank_candidates_node(state: AgentState) -> AgentState:
    """Score and rank all candidates in the current pool."""
    pool = state["candidate_pool"]
    if not pool:
        return state

    result = compare_candidates(pool, state["job_requirements"])
    candidates_data = result.get("candidates", {})

    # Sort by overall_score descending
    ranked = sorted(
        candidates_data.items(),
        key=lambda item: item[1].get("overall_score", 0),
        reverse=True,
    )

    state["candidate_shortlist"] = [cid for cid, _ in ranked]
    state["candidate_scores"] = {cid: data.get("overall_score", 0) for cid, data in ranked}
    state["reasoning"] = {cid: data.get("reasoning", "") for cid, data in ranked}

    return state
```

#### `nodes/generate_report.py` — Node 5

```python
from state.agent_state import AgentState
from tools.reasoning_tools import generate_interview_questions, summarize_resume
from tools.file_tools import read_resume_by_candidate_id, write_report


def generate_report_node(state: AgentState) -> AgentState:
    """Generate a full match report and interview questions for each shortlisted candidate."""
    requirements = state["job_requirements"]
    reports = {}
    questions = {}

    for candidate_id in state["candidate_shortlist"]:
        try:
            resume_text = read_resume_by_candidate_id(candidate_id)
        except FileNotFoundError:
            resume_text = ""

        score = state["candidate_scores"].get(candidate_id, 0)
        hire_label = (
            "HIRE" if score >= 0.75
            else "BORDERLINE" if score >= 0.60
            else "NO-HIRE"
        )

        summary = summarize_resume(resume_text) if resume_text else {}

        report = {
            "candidate_id": candidate_id,
            "overall_score": score,
            "must_have_coverage": summary.get("strengths", []),
            "gaps": summary.get("gaps", []),
            "strengths": summary.get("strengths", []),
            "improvement_suggestions": (
                summary.get("gaps", []) if hire_label == "BORDERLINE" else []
            ),
            "hire_recommendation": hire_label,
            "reasoning": state["reasoning"].get(candidate_id, ""),
        }

        reports[candidate_id] = report
        write_report(candidate_id, report)

        if state["screening_round"] >= 2:
            questions[candidate_id] = generate_interview_questions(candidate_id, requirements)

    state["match_reports"] = reports
    state["interview_questions"] = questions
    return state
```

#### `nodes/advance_screening_round.py` — Node 5B

```python
from state.agent_state import AgentState


def advance_screening_round_node(state: AgentState) -> AgentState:
    """Increment the screening round counter (caps at 3)."""
    if state["screening_round"] < 3:
        state["screening_round"] += 1
    return state
```

### 4.2 Wiring the Pipeline in `matching_agent.py`

```python
from langgraph.graph import StateGraph, END
from state.agent_state import AgentState, initial_state
from nodes.parse_jd import parse_jd_node
from nodes.extract_requirements import extract_requirements_node
from nodes.search_resumes import search_resumes_node
from nodes.rank_candidates import rank_candidates_node
from nodes.generate_report import generate_report_node
from nodes.advance_screening_round import advance_screening_round_node


def route_after_report(state: AgentState) -> str:
    if state["screening_round"] < 3:
        return "advance_screening_round"
    return "human_feedback_loop"


def route_after_advance(state: AgentState) -> str:
    return "search_resumes"


def build_graph() -> StateGraph:
    g = StateGraph(AgentState)

    g.add_node("parse_jd", parse_jd_node)
    g.add_node("extract_requirements", extract_requirements_node)
    g.add_node("search_resumes", search_resumes_node)
    g.add_node("rank_candidates", rank_candidates_node)
    g.add_node("generate_report", generate_report_node)
    g.add_node("advance_screening_round", advance_screening_round_node)

    g.set_entry_point("parse_jd")
    g.add_edge("parse_jd", "extract_requirements")
    g.add_edge("extract_requirements", "search_resumes")
    g.add_edge("search_resumes", "rank_candidates")
    g.add_edge("rank_candidates", "generate_report")
    g.add_conditional_edges("generate_report", route_after_report, {
        "advance_screening_round": "advance_screening_round",
        "human_feedback_loop": END,
    })
    g.add_conditional_edges("advance_screening_round", route_after_advance, {
        "search_resumes": "search_resumes",
    })

    return g.compile()
```

### 4.3 Smoke Test

```python
# Run manually to verify the core pipeline
if __name__ == "__main__":
    from tools.rag_tool import build_vector_store

    # One-time: build the vector store from your resume files
    build_vector_store("data/resumes")

    graph = build_graph()
    state = initial_state()
    state["current_query"] = "Senior Python backend engineer with REST APIs and 5 years experience"

    result = graph.invoke(state)
    print("Shortlist:", result["candidate_shortlist"])
    print("Reports:", list(result["match_reports"].keys()))
```

### 4.4 Acceptance Criteria

- Running the smoke test with at least 3 resume files in `data/resumes/` completes without error.
- `result["candidate_shortlist"]` is non-empty and ordered by score.
- `result["screening_round"]` equals `3` after the full pipeline runs.
- A `.json` report file exists in `reports/` for each shortlisted candidate.
- `result["match_reports"]` contains `hire_recommendation` for every candidate.

---

## Phase 5 — Intent Router + Conversational Interface (Nodes 0, 6, 7)

**Goal:** Make the agent conversational. Add the intent router so users don't restart the full pipeline on every message, and implement the Human Feedback Loop and Direct Action Node.

**Assignment mapping:** Part B — Conversational Interface, Part B — Iterative Refinement (setup)

### 5.1 Intent Router (`nodes/intent_router.py`) — Node 0

```python
from state.agent_state import AgentState
from tools.reasoning_tools import llm
from langchain.prompts import ChatPromptTemplate

INTENT_PROMPT = ChatPromptTemplate.from_messages([
    ("system", (
        "Classify the user's message into exactly one intent from this list:\n"
        "  new_search          — user wants to find candidates for a new JD\n"
        "  refine_requirements — user wants to change/update existing requirements\n"
        "  compare_candidates  — user wants a side-by-side comparison\n"
        "  explain_ranking     — user wants to know why someone ranked higher/lower\n"
        "  generate_questions  — user wants interview questions for a specific candidate\n"
        "  finalize            — user wants the final hire/no-hire recommendation\n\n"
        "Return only the intent label, nothing else."
    )),
    ("human", "{query}"),
])


def intent_router_node(state: AgentState) -> AgentState:
    chain = INTENT_PROMPT | llm
    response = chain.invoke({"query": state["current_query"]})
    intent = response.content.strip().lower()

    valid_intents = {
        "new_search", "refine_requirements", "compare_candidates",
        "explain_ranking", "generate_questions", "finalize",
    }
    state["current_intent"] = intent if intent in valid_intents else "new_search"
    state["conversation_history"].append({
        "role": "user",
        "content": state["current_query"],
    })
    return state


def route_after_intent(state: AgentState) -> str:
    intent = state["current_intent"]
    routes = {
        "new_search": "parse_jd",
        "refine_requirements": "snapshot_previous_ranking",
        "compare_candidates": "direct_action",
        "explain_ranking": "direct_action",
        "generate_questions": "direct_action",
        "finalize": "final_recommendation",
    }
    return routes.get(intent, "parse_jd")
```

### 5.2 Human Feedback Loop (`nodes/human_feedback.py`) — Node 6

```python
from state.agent_state import AgentState


def human_feedback_node(state: AgentState) -> AgentState:
    """
    Display current results to the user and read their next instruction.
    In a CLI context this is a blocking input(); in an API context this
    becomes the response/request boundary.
    """
    print("\n" + "═" * 60)
    print(f"  Screening Round {state['screening_round']} complete")
    print("═" * 60)

    shortlist = state["candidate_shortlist"]
    for rank, cid in enumerate(shortlist, 1):
        score = state["candidate_scores"].get(cid, 0)
        rec = state["match_reports"].get(cid, {}).get("hire_recommendation", "—")
        print(f"  #{rank}  {cid:<30} score={score:.2f}  [{rec}]")

    print("\nOptions:")
    print("  • Type a new requirement change  (e.g. 'Make TypeScript a must-have')")
    print("  • Type 'compare top 3'")
    print("  • Type 'finalize' for final recommendation")
    print("  • Press Enter to exit\n")

    user_input = input("Your instruction: ").strip()

    if not user_input:
        state["current_query"] = ""
        state["criteria_updated"] = False
        state["finalize_requested"] = False
    elif user_input.lower() == "finalize":
        state["current_query"] = user_input
        state["finalize_requested"] = True
        state["criteria_updated"] = False
    else:
        state["current_query"] = user_input
        # Route the follow-up back through the intent router. It may be a
        # refinement, comparison, explanation, or question-generation request.
        state["criteria_updated"] = False
        state["finalize_requested"] = False

    return state


def route_after_feedback(state: AgentState) -> str:
    if state["finalize_requested"]:
        return "final_recommendation"

    if state["current_query"].strip():
        return "intent_router"

    return "end"
```

### 5.3 Direct Action Node (`nodes/direct_action.py`) — Node 7

Handles `compare_candidates`, `explain_ranking`, and `generate_questions` without restarting the pipeline.

```python
from state.agent_state import AgentState
from tools.reasoning_tools import compare_candidates, generate_interview_questions, llm
from langchain.prompts import ChatPromptTemplate


def direct_action_node(state: AgentState) -> AgentState:
    intent = state["current_intent"]
    query = state["current_query"]
    answer = ""

    if intent == "compare_candidates":
        ids_to_compare = state["candidate_shortlist"][:3]
        if not ids_to_compare:
            answer = "No shortlisted candidates are available yet. Please run a candidate search first."
            state["conversation_history"].append({"role": "assistant", "content": answer})
            print(f"\nAgent: {answer}\n")
            return state

        result = compare_candidates(ids_to_compare, state["job_requirements"])
        answer = (
            f"Winner: {result.get('winner', 'N/A')}\n\n"
            f"Reasoning: {result.get('reasoning', '')}\n\n"
            + "\n".join(
                f"{cid}: overall={data.get('overall_score', 0):.2f}  "
                f"must_have={data.get('must_have_score', 0):.2f}  "
                f"nice_to_have={data.get('nice_to_have_score', 0):.2f}"
                for cid, data in result.get("candidates", {}).items()
            )
        )

    elif intent == "explain_ranking":
        # Use stored reasoning + ranking_delta to explain position changes
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a recruiter assistant. Explain the ranking based on the data provided. Be specific about skills and scores."),
            ("human", "Query: {query}\n\nRankings: {rankings}\n\nReasoning per candidate: {reasoning}\n\nRanking changes: {deltas}"),
        ])
        chain = prompt | llm
        response = chain.invoke({
            "query": query,
            "rankings": str(list(enumerate(state["candidate_shortlist"], 1))),
            "reasoning": str(state["reasoning"]),
            "deltas": str(state.get("ranking_delta", {})),
        })
        answer = response.content

    elif intent == "generate_questions":
        # Try to identify the candidate from the query
        candidate_id = state["candidate_shortlist"][0] if state["candidate_shortlist"] else None
        for cid in state["candidate_shortlist"]:
            if cid.lower() in query.lower():
                candidate_id = cid
                break

        if candidate_id:
            qs = generate_interview_questions(candidate_id, state["job_requirements"])
            answer = f"Interview questions for {candidate_id}:\n" + "\n".join(f"  {i+1}. {q}" for i, q in enumerate(qs))
        else:
            answer = "Could not identify which candidate to generate questions for."

    state["conversation_history"].append({"role": "assistant", "content": answer})
    print(f"\nAgent: {answer}\n")
    return state
```

### 5.4 Update the Graph

Add all three new nodes and their routing to `matching_agent.py`:

```python
from nodes.intent_router import intent_router_node, route_after_intent
from nodes.human_feedback import human_feedback_node, route_after_feedback
from nodes.direct_action import direct_action_node

def build_graph():
    g = StateGraph(AgentState)

    # Existing nodes
    g.add_node("intent_router", intent_router_node)
    g.add_node("parse_jd", parse_jd_node)
    # ... (all previous nodes) ...
    g.add_node("human_feedback_loop", human_feedback_node)
    g.add_node("direct_action", direct_action_node)

    g.set_entry_point("intent_router")
    g.add_conditional_edges("intent_router", route_after_intent, {
        "parse_jd": "parse_jd",
        "snapshot_previous_ranking": "snapshot_previous_ranking",
        "direct_action": "direct_action",
        "final_recommendation": "final_recommendation",
    })

    # direct_action loops back to the feedback node
    g.add_edge("direct_action", "human_feedback_loop")

    g.add_conditional_edges("human_feedback_loop", route_after_feedback, {
        "intent_router": "intent_router",
        "final_recommendation": "final_recommendation",
        "end": END,
    })
    # ... rest of edges
```

### 5.5 Conversational REPL

Add a main loop to `matching_agent.py` that continuously feeds user input into the graph:

```python
def run_agent():
    graph = build_graph()
    state = initial_state()

    print("\nAirTribe Candidate Matching Agent")
    print("Enter a job description to begin.\n")

    first_query = input("You: ").strip()
    state["current_query"] = first_query

    result = graph.invoke(state)
    print("Session ended.")


if __name__ == "__main__":
    run_agent()
```

### 5.6 Acceptance Criteria

- Running the REPL and typing a JD triggers the full screening pipeline.
- Typing "Compare the top 3" at the feedback prompt routes back through `intent_router`, calls `compare_candidates`, and prints a side-by-side table.
- Typing "Why did X rank higher than Y?" routes to `direct_action` and produces a natural-language explanation.
- Typing "Create interview questions for X" routes to `direct_action` and returns 5 questions.
- Typing "finalize" proceeds to the final recommendation node.
- Pressing Enter exits cleanly.

---

## Phase 6 — Iterative Refinement + Ranking Delta (Nodes 2A, 2B, 4B)

**Goal:** Let users change requirements mid-conversation and have the agent re-rank, explain what moved, and why. This is the core of Part B's iterative refinement requirement.

**Assignment mapping:** Part B — Iterative Refinement, "Explains changes in rankings"

### 6.1 Snapshot Previous Ranking (`nodes/snapshot_ranking.py`) — Node 2A

```python
from state.agent_state import AgentState


def snapshot_previous_ranking_node(state: AgentState) -> AgentState:
    """
    Save the current shortlist and scores before re-ranking.
    This enables ranking delta calculation after new criteria are applied.
    """
    state["previous_shortlist"] = list(state["candidate_shortlist"])
    state["previous_scores"] = dict(state["candidate_scores"])
    return state
```

### 6.2 Update Requirements (`nodes/update_requirements.py`) — Node 2B

```python
from state.agent_state import AgentState
from tools.reasoning_tools import extract_requirements
from datetime import datetime


def update_requirements_node(state: AgentState) -> AgentState:
    """
    Merge user's refinement feedback into the existing requirements.
    Records the change in the requirement_change_log.
    """
    user_feedback = state["current_query"]
    old_requirements = state["job_requirements"]

    # Build a combined prompt: existing requirements + what the user wants changed
    combined_text = (
        f"Existing requirements: {old_requirements}\n\n"
        f"User update request: {user_feedback}\n\n"
        "Produce updated requirements that apply the user's change."
    )
    updated = extract_requirements(combined_text)

    old_version = state.get("requirements_version", 0)
    state["job_requirements"] = updated
    state["requirements_version"] = old_version + 1
    state["requirement_change_log"].append({
        "version": old_version + 1,
        "user_instruction": user_feedback,
        "previous": old_requirements,
        "updated": updated,
        "timestamp": datetime.utcnow().isoformat(),
    })
    state["criteria_updated"] = False   # reset flag after applying

    return state
```

### 6.3 Calculate Ranking Delta (`nodes/ranking_delta.py`) — Node 4B

```python
from state.agent_state import AgentState


def calculate_ranking_delta_node(state: AgentState) -> AgentState:
    """
    Compare previous ranking vs current ranking and record movement per candidate.
    Only runs when previous_shortlist is populated (i.e. after a refinement).
    """
    if not state["previous_shortlist"]:
        return state

    old_rank = {cid: i for i, cid in enumerate(state["previous_shortlist"])}
    new_rank = {cid: i for i, cid in enumerate(state["candidate_shortlist"])}

    deltas = {}
    for cid in state["candidate_shortlist"]:
        prev_pos = old_rank.get(cid)
        curr_pos = new_rank[cid]
        prev_score = state["previous_scores"].get(cid)
        curr_score = state["candidate_scores"].get(cid, 0)

        movement = "new entry"
        if prev_pos is not None:
            diff = prev_pos - curr_pos
            if diff > 0:
                movement = f"moved up {diff} position(s)"
            elif diff < 0:
                movement = f"moved down {abs(diff)} position(s)"
            else:
                movement = "unchanged"

        deltas[cid] = {
            "previous_position": prev_pos,
            "current_position": curr_pos,
            "movement": movement,
            "previous_score": prev_score,
            "current_score": curr_score,
            "score_change": None if prev_score is None else round(curr_score - prev_score, 3),
            "reason": state["reasoning"].get(cid, ""),
        }

    state["ranking_delta"] = deltas
    return state
```

### 6.4 Wire Refinement Path into the Graph

In `matching_agent.py`, add the refinement nodes and connect them:

```python
from nodes.snapshot_ranking import snapshot_previous_ranking_node
from nodes.update_requirements import update_requirements_node
from nodes.ranking_delta import calculate_ranking_delta_node

# In build_graph():
g.add_node("snapshot_previous_ranking", snapshot_previous_ranking_node)
g.add_node("update_requirements", update_requirements_node)
g.add_node("ranking_delta", calculate_ranking_delta_node)

g.add_edge("snapshot_previous_ranking", "update_requirements")
g.add_edge("update_requirements", "search_resumes")

# After rank_candidates, conditionally run ranking_delta
# (only if previous_shortlist is non-empty)
def route_after_rank(state: AgentState) -> str:
    if state["previous_shortlist"]:
        return "ranking_delta"
    return "generate_report"

g.add_conditional_edges("rank_candidates", route_after_rank, {
    "ranking_delta": "ranking_delta",
    "generate_report": "generate_report",
})
g.add_edge("ranking_delta", "generate_report")
```

### 6.5 Acceptance Criteria

- Running the agent, typing a JD, then typing "Make TypeScript a must-have" triggers a re-rank.
- After re-ranking, `state["ranking_delta"]` contains entries with `movement` descriptions like "moved up 2 position(s)".
- Typing "Why did the ranking change?" after a refinement prints a natural-language explanation referencing the delta.
- `state["requirement_change_log"]` contains one entry per user-driven criteria update.

---

## Phase 7 — Final Recommendation + Explainability (Node 8)

**Goal:** Implement the Final Recommendation node with HIRE / NO-HIRE / BORDERLINE outputs, detailed strengths/gaps per candidate, and improvement suggestions for borderline cases.

**Assignment mapping:** Part C — Final Round, Part C — Explainability

### 7.1 Final Recommendation (`nodes/final_recommendation.py`) — Node 8

```python
from state.agent_state import AgentState
from tools.reasoning_tools import llm
from langchain.prompts import ChatPromptTemplate
from tools.file_tools import write_report


def final_recommendation_node(state: AgentState) -> AgentState:
    """
    Holistic hire/no-hire evaluation for the full shortlist.
    Enhances borderline candidates with improvement suggestions.
    """
    reports = state["match_reports"]
    requirements = state["job_requirements"]
    shortlist = state["candidate_shortlist"]

    final_decisions = {}
    enhanced_reports = dict(reports)

    for cid in shortlist:
        report = reports.get(cid, {})
        score = state["candidate_scores"].get(cid, 0)

        if score >= 0.75:
            decision = "HIRE"
        elif score >= 0.60:
            decision = "BORDERLINE"
        else:
            decision = "NO-HIRE"

        if decision == "BORDERLINE":
            prompt = ChatPromptTemplate.from_messages([
                ("system", (
                    "You are a senior recruiter. A candidate is on the borderline "
                    "for this role. Given their gaps and the requirements, provide "
                    "3-5 specific, actionable improvement suggestions that would "
                    "make them a stronger candidate. Return a JSON list of strings."
                )),
                ("human", "Requirements:\n{requirements}\n\nCandidate gaps:\n{gaps}"),
            ])
            chain = prompt | llm
            response = chain.invoke({
                "requirements": str(requirements),
                "gaps": str(report.get("gaps", [])),
            })

            import json, re
            text = response.content
            match = re.search(r"\[.*\]", text, re.DOTALL)
            suggestions = json.loads(match.group()) if match else [text]
            enhanced_reports[cid]["improvement_suggestions"] = suggestions

        final_decisions[cid] = decision
        enhanced_reports[cid]["hire_recommendation"] = decision
        write_report(cid, enhanced_reports[cid])

    state["final_decision"] = final_decisions
    state["match_reports"] = enhanced_reports

    # Print summary to user
    print("\n" + "═" * 60)
    print("  FINAL HIRING RECOMMENDATIONS")
    print("═" * 60)
    for rank, cid in enumerate(shortlist, 1):
        decision = final_decisions.get(cid, "—")
        score = state["candidate_scores"].get(cid, 0)
        print(f"  #{rank}  {cid:<30} {decision:<12} (score: {score:.2f})")

    print("\nDetailed reports saved to reports/ directory.\n")
    return state
```

### 7.2 Wire Node 8 into the Graph

```python
from nodes.final_recommendation import final_recommendation_node

# In build_graph():
g.add_node("final_recommendation", final_recommendation_node)
g.add_edge("final_recommendation", END)
```

### 7.3 Acceptance Criteria

- Typing "finalize" at the feedback prompt triggers Node 8.
- Each candidate in `state["final_decision"]` has one of `HIRE`, `NO-HIRE`, or `BORDERLINE`.
- Every BORDERLINE candidate's report contains a non-empty `improvement_suggestions` list.
- Printed summary shows all candidates with their final decision and score.
- Reports directory contains updated JSON files with final decisions.

---

## Full Graph Wiring Reference

After all 7 phases, `matching_agent.py` registers these edges in order:

```
intent_router ──(conditional)──► parse_jd
                                 snapshot_previous_ranking
                                 direct_action
                                 final_recommendation

parse_jd ──► extract_requirements ──► search_resumes

snapshot_previous_ranking ──► update_requirements ──► search_resumes

search_resumes ──► rank_candidates ──(conditional)──► ranking_delta
                                                      generate_report

ranking_delta ──► generate_report

generate_report ──(conditional)──► advance_screening_round
                                   human_feedback_loop

advance_screening_round ──► search_resumes

direct_action ──► human_feedback_loop

human_feedback_loop ──(conditional)──► intent_router
                                       final_recommendation
                                       END

final_recommendation ──► END
```

---

## Implementation Checklist

### Phase 0
- [ ] Folder structure created
- [ ] `requirements.txt` installed without errors
- [ ] `.env` file created with `GROQ_API_KEY`

### Phase 1
- [ ] `state/agent_state.py` — all fields typed
- [ ] `initial_state()` function works
- [ ] File tools tested: list, read, write

### Phase 2
- [ ] Streamlit summariser logic exposed as importable function or API wrapper
- [ ] Streamlit RAG matcher logic exposed as importable function or API wrapper
- [ ] `build_vector_store()` indexes your resume corpus
- [ ] `search_resumes()` returns results from the vector store
- [ ] `summarize_resume()` returns structured dict

### Phase 3
- [ ] `extract_requirements()` parses must-have vs nice-to-have
- [ ] `compare_candidates()` scores and ranks multiple candidates
- [ ] `generate_interview_questions()` returns 5 questions

### Phase 4
- [ ] All 6 core nodes implemented (Nodes 1–5B)
- [ ] Smoke test runs full 3-round pipeline end-to-end
- [ ] Reports written to disk

### Phase 5
- [ ] Intent router classifies all 6 intent types
- [ ] Human feedback loop displays results and reads input
- [ ] Direct action node handles compare, explain, questions
- [ ] REPL loop works for multi-turn conversation

### Phase 6
- [ ] Snapshot node saves previous ranking before refinement
- [ ] Update requirements node merges user feedback
- [ ] Ranking delta node calculates and stores position movement
- [ ] Re-ranking after refinement produces updated shortlist with explanations

### Phase 7
- [ ] Final recommendation produces HIRE / NO-HIRE / BORDERLINE for all candidates
- [ ] BORDERLINE candidates get actionable improvement suggestions
- [ ] Final summary printed to the user
- [ ] All reports updated in `reports/` directory

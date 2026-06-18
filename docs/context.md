# AirTribe AI Agent Project — Detailed Context

## 1. Project Overview

This project involves building an **AI-powered candidate matching agent** for recruitment workflows. The agent automates the process of parsing job descriptions (JDs), extracting structured requirements, searching through a resume corpus, ranking candidates, generating explainable reports, and supporting iterative human feedback — all through a conversational interface.

The system is built on top of **LangGraph** (a stateful, graph-based agent orchestration framework built on LangChain), leveraging RAG (Retrieval-Augmented Generation) for resume search and a suite of custom tools for structured reasoning.

---

## 2. Problem Context

Modern recruiting involves high volumes of resumes and complex, multi-dimensional job requirements. Manual screening is:

- **Time-consuming** — Reviewing 100+ resumes per role is expensive.
- **Inconsistent** — Human bias affects shortlisting quality.
- **Non-iterative** — Adjusting criteria mid-process is cumbersome.
- **Opaque** — Decisions lack explainability for candidates and hiring managers.

This agent addresses all four problems by providing automated, explainable, and conversationally adjustable candidate screening.

---

## 3. Assignment Structure

The project is divided into three graded parts:

| Part | Topic | Weight |
|------|-----------------------------------------------|--------|
| A | Agent Architecture (LangGraph) | 40% |
| B | Interactive / Conversational Features | 30% |
| C | Advanced Capabilities (Multi-round + Explain) | 30% |

---

## 4. Part A — Agent Architecture (40%)

### 4.1 Core File
**`matching_agent.py`** — The primary agent implementation using LangGraph.

### 4.2 Agent State Design

The agent maintains a persistent state object across the entire conversation and workflow. The state must track:

| State Field | Purpose |
|--------------------------|----------------------------------------------------------|
| `conversation_history` | Full message history (user queries + agent responses) |
| `job_requirements` | Structured understanding of the parsed JD |
| `candidate_shortlist` | Ordered list of shortlisted candidate IDs |
| `reasoning` | Per-candidate scoring rationale and comparison notes |

### 4.3 Agent Workflow (Graph Structure)

The LangGraph graph follows this directed flow:

```
START
  │
  ▼
Parse JD
  │
  ▼
Extract Requirements
  │
  ▼
Search Resumes
  │
  ▼
Rank Candidates
  │
  ▼
Generate Report
  │
  ▼
Human Feedback Loop ◄─── (loops back to Search/Rank on new criteria)
  │
  ▼
END
```

Each node in the graph represents a discrete reasoning step. The **Human Feedback Loop** node enables the agent to re-enter the ranking pipeline when a user adjusts requirements mid-conversation.

### 4.4 Tools Available to the Agent

The agent has access to three categories of tools:

#### File System Tools *(from Milestone 1)*
Low-level tools for reading, listing, and managing resume files stored on disk.

#### RAG Search Tool *(from Milestone 2)*
A vector-store-backed semantic search tool that retrieves the most relevant resumes given a natural language query or structured requirement set.

#### Custom Reasoning Tools

| Tool Signature | Description |
|---------------------------------------------------|--------------------------------------------------------------|
| `extract_requirements(jd: str)` | Parses a raw JD string into must-have vs. nice-to-have skills, experience thresholds, and role attributes |
| `compare_candidates(candidate_ids: list)` | Performs a structured head-to-head comparison across a list of candidate IDs |
| `generate_interview_questions(candidate_id: str)` | Generates role-specific screening questions tailored to a candidate's profile and gaps |

---

## 5. Part B — Interactive Features (30%)

### 5.1 Conversational Interface

The agent accepts **free-form natural language queries** from hiring managers or recruiters. Example interactions:

- `"Find me candidates with React and 3+ years of experience"`
- `"Compare the top 3 matches side by side"`
- `"Why did John rank higher than Jane?"`

The agent interprets these queries, maps them to the appropriate tool calls or graph traversal steps, and returns structured, human-readable responses.

### 5.2 Iterative Refinement

A core differentiator of this system is its ability to support **mid-conversation requirement adjustments**:

- The user can modify job requirements at any point (e.g., "actually, TypeScript experience is a must-have, not optional").
- The agent triggers a re-ranking cycle with the updated criteria.
- The agent explicitly **explains what changed** in the rankings and why, ensuring transparency.

This is managed by the **Human Feedback Loop** node in the LangGraph graph, which checks for updated state after each user turn.

---

## 6. Part C — Advanced Capabilities (30%)

### 6.1 Multi-Round Screening Pipeline

The agent implements a **three-round screening funnel** inspired by real-world hiring pipelines:

| Round | Input | Process | Output |
|--------|------------------|-------------------------------|-------------------------------|
| Round 1 | 100 resumes | Broad RAG search + quick rank | Top 10 candidates shortlisted |
| Round 2 | Top 10 resumes | Deep semantic + skills analysis | Ranked top 10 with scores |
| Round 3 | Final candidates | Holistic evaluation | Hire / No-Hire recommendation |

This funnel reduces LLM token usage while maintaining decision quality by concentrating deep analysis on the most relevant candidates.

### 6.2 Explainability

Every decision made by the agent must be interpretable. The explainability layer includes:

- **Detailed Match Reports** — Per-candidate breakdown of how well they satisfy must-have and nice-to-have requirements.
- **Strengths and Gaps Highlighting** — Clear articulation of where each candidate excels and where they fall short relative to the JD.
- **Improvement Suggestions** — For borderline candidates (those close to the hire threshold), the agent generates actionable suggestions they could pursue to strengthen their profile.

---

## 7. Technology Stack

| Layer | Technology |
|----------------------|------------------------------------------------|
| Agent Orchestration | LangGraph (stateful graph execution) |
| LLM Backend | LangChain-compatible LLM (e.g., OpenAI GPT-4) |
| Resume Search | RAG with vector store (e.g., FAISS / ChromaDB) |
| File I/O | Python file system tools (Milestone 1) |
| Interface | Conversational CLI or API endpoint |
| Language | Python 3.10+ |

---

## 8. Key Design Principles

1. **Stateful Conversations** — The agent remembers the full context of a session, enabling coherent multi-turn dialogue without re-providing context.
2. **Tool-Augmented Reasoning** — The LLM does not act alone; structured tools handle deterministic subtasks (parsing, ranking, comparison).
3. **Human-in-the-Loop** — The workflow is not fully autonomous; it surfaces results to the user and waits for feedback before proceeding to final decisions.
4. **Explainability by Design** — Every ranking and recommendation is accompanied by traceable reasoning, not just a score.
5. **Scalability** — The multi-round funnel ensures the system is practical for large resume pools without linearly scaling LLM costs.

---

## 9. Milestone Dependencies

```
Milestone 1: File System Tools
        │
        ▼
Milestone 2: RAG Search Tool
        │
        ▼
Milestone 3: matching_agent.py (this assignment)
             ├── Part A: LangGraph architecture + tools
             ├── Part B: Conversational + iterative interface
             └── Part C: Multi-round screening + explainability
```

---

## 10. Expected Deliverables

| Deliverable | Description |
|---------------------------|--------------------------------------------------|
| `matching_agent.py` | Core LangGraph agent with all nodes and tools |
| Agent state schema | Typed state definition (TypedDict or Pydantic) |
| Tool implementations | `extract_requirements`, `compare_candidates`, `generate_interview_questions` |
| Conversational loop | REPL or API interface accepting natural language |
| Match reports | Structured output for each screened candidate |
| Multi-round pipeline | Round 1 → Round 2 → Round 3 screening logic |
| Explainability output | Strengths, gaps, and suggestions per candidate |

---

## 11. Evaluation Criteria Summary

| Criterion | What is Being Assessed |
|-------------------------------|--------------------------------------------------------------|
| Graph correctness | Does the LangGraph flow execute the correct node sequence? |
| State management | Is conversation history and job context properly maintained? |
| Tool accuracy | Do custom tools return correctly structured outputs? |
| Conversational quality | Can the agent handle multi-turn, natural language queries? |
| Iterative refinement | Does re-ranking work correctly when criteria change? |
| Multi-round funnel | Is the 3-round screening pipeline correctly implemented? |
| Explainability | Are reports detailed, accurate, and actionable? |

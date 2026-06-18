"""FastAPI backend server wrapping the AirTribe LangGraph matching agent."""

import os
import sys
import uuid
from pathlib import Path
from typing import Any, Dict, Optional
from contextlib import contextmanager

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from state.agent_state import AgentState, initial_state
from matching_agent import build_graph

app = FastAPI(title="AirTribe Matching Agent API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store: session_id → AgentState
_sessions: Dict[str, AgentState] = {}

# LangGraph app (compiled once at startup)
_graph = None


def get_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph


@contextmanager
def _patch_input(sentinel: str = ""):
    """Replace builtins.input so the human_feedback_node doesn't block in API mode."""
    import builtins
    original = builtins.input
    builtins.input = lambda prompt="": sentinel
    try:
        yield
    finally:
        builtins.input = original


# ── Request / Response models ─────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    session_id: str
    message: str
    state: Dict[str, Any]


# ── Helper: build a human-readable assistant message from state ───────────────

def _build_assistant_message(state: AgentState) -> str:
    """Summarise the latest agent output into a chat message for the frontend."""
    intent = state.get("current_intent", "")
    shortlist = state.get("candidate_shortlist", [])
    scores = state.get("candidate_scores", {})
    match_reports = state.get("match_reports", {})
    final_decision = state.get("final_decision", {})

    # Check if the latest conversation turn has an assistant reply (from direct_action)
    history = state.get("conversation_history", [])
    if history and history[-1].get("role") == "assistant":
        return history[-1]["content"]

    if final_decision:
        lines = ["**Final Hiring Recommendations**\n"]
        for cid in shortlist:
            decision = final_decision.get(cid, "-")
            score = scores.get(cid, 0)
            lines.append(f"- **{cid}**: {decision} (score: {score:.2f})")
        return "\n".join(lines)

    if shortlist:
        round_num = state.get("screening_round", 1)
        lines = [f"**Screening Round {round_num} Complete**\n"]
        for rank, cid in enumerate(shortlist, 1):
            score = scores.get(cid, 0)
            rec = match_reports.get(cid, {}).get("hire_recommendation", "-")
            lines.append(f"#{rank} **{cid}** — score: {score:.2f} [{rec}]")
        lines.append("\nYou can now refine requirements, compare candidates, or type 'finalize'.")
        return "\n".join(lines)

    if intent in ("compare_candidates", "explain_ranking", "generate_questions"):
        # direct_action node sets the response in direct_response; fall back gracefully
        return "Action completed. Check the canvas for details."

    return "Processing complete. Ask a question or type 'finalize'."


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    session_id = req.session_id or str(uuid.uuid4())

    # Restore or create session state
    state: AgentState = _sessions.get(session_id) or initial_state()

    # Inject the user message
    state["current_query"] = req.message.strip()
    state["criteria_updated"] = False
    state["finalize_requested"] = req.message.strip().lower() == "finalize"

    graph = get_graph()

    try:
        # Run the graph; patch input() so human_feedback_node returns "" immediately
        # which causes route_after_feedback → "end" and the graph terminates cleanly.
        with _patch_input(""):
            result: AgentState = graph.invoke(state)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    # Persist result for next turn
    _sessions[session_id] = result

    message = _build_assistant_message(result)

    # Serialise state (TypedDict → plain dict is already JSON-serialisable)
    return ChatResponse(
        session_id=session_id,
        message=message,
        state=dict(result),
    )


@app.get("/api/state/{session_id}")
def get_state(session_id: str):
    state = _sessions.get(session_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return dict(state)


@app.delete("/api/session/{session_id}")
def delete_session(session_id: str):
    _sessions.pop(session_id, None)
    return {"deleted": session_id}


# ── Startup: pre-build vector store ──────────────────────────────────────────

@app.on_event("startup")
def startup_event():
    try:
        from tools.rag_tool import build_vector_store
        resume_dir = BASE_DIR / "data" / "resumes"
        if resume_dir.exists():
            print("Indexing resumes on startup...")
            build_vector_store(str(resume_dir))
            print("Vector store ready.")
    except Exception as exc:
        print(f"Warning: vector store setup failed on startup: {exc}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api_server:app", host="0.0.0.0", port=8000, reload=True)

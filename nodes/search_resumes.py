"""Node 3 - retrieve candidates via RAG or shortlist reuse."""

from state.agent_state import AgentState
from tools.rag_tool import search_resumes


def search_resumes_node(state: AgentState) -> AgentState:
    """
    Populate candidate_pool based on the current screening round.

    Round 1 - broad RAG search over the full resume corpus.
    Round 2 - deep pass reusing the Round 1 shortlist (no new retrieval).
    Round 3 - final pass over the same shortlist (no new retrieval).
    """
    requirements = state["job_requirements"]
    query = (
        " ".join(requirements.get("must_have", []))
        + " "
        + requirements.get("domain", "")
    ).strip()

    if state["screening_round"] == 1:
        results = search_resumes(query, top_k=10)
        state["candidate_pool"] = [r["candidate_id"] for r in results]

    elif state["screening_round"] == 2:
        state["candidate_pool"] = list(state["candidate_shortlist"])

    elif state["screening_round"] == 3:
        state["candidate_pool"] = list(state["candidate_shortlist"])

    return state

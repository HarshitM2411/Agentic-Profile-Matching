"""Node 4 - score and rank candidates in the current pool."""

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
    state["candidate_scores"] = {
        cid: data.get("overall_score", 0) for cid, data in ranked
    }
    state["reasoning"] = {
        cid: data.get("reasoning", "") for cid, data in ranked
    }

    return state

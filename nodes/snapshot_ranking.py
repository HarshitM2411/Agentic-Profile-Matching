"""Node 2A - snapshot previous ranking before requirement refinement."""

from state.agent_state import AgentState


def snapshot_previous_ranking_node(state: AgentState) -> AgentState:
    """
    Save the current shortlist and scores before re-ranking.
    This enables ranking delta calculation after new criteria are applied.
    """
    state["previous_shortlist"] = list(state["candidate_shortlist"])
    state["previous_scores"] = dict(state["candidate_scores"])
    return state

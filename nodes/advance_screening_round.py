"""Node 5B - advance the multi-round screening counter."""

from state.agent_state import AgentState


def advance_screening_round_node(state: AgentState) -> AgentState:
    """Increment the screening round counter (caps at 3)."""
    if state["screening_round"] < 3:
        state["screening_round"] += 1
    return state

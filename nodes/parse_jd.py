"""Node 1 - parse and store the raw job description."""

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
        "content": f"Parsing JD: {raw_jd[:100]}...",
    })
    return state

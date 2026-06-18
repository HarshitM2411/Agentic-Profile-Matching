"""Node 2B - merge user feedback into job requirements."""

from datetime import datetime

from state.agent_state import AgentState
from tools.reasoning_tools import extract_requirements


def update_requirements_node(state: AgentState) -> AgentState:
    """
    Merge user's refinement feedback into the existing requirements.
    Records the change in the requirement_change_log.
    """
    user_feedback = state["current_query"]
    old_requirements = state["job_requirements"]

    state["criteria_updated"] = True   # signal that a criteria update is in progress

    combined_text = (
        f"Existing requirements: {old_requirements}\n\n"
        f"User update request: {user_feedback}\n\n"
        "Produce updated requirements that apply the user's change."
    )
    updated = extract_requirements(combined_text)

    old_version = state["requirements_version"]
    state["job_requirements"] = updated
    state["requirements_version"] = old_version + 1
    state["requirement_change_log"].append({
        "version": old_version + 1,
        "user_instruction": user_feedback,
        "previous": old_requirements,
        "updated": updated,
        "timestamp": datetime.utcnow().isoformat(),
    })
    state["criteria_updated"] = False   # reset after requirements are fully applied

    return state

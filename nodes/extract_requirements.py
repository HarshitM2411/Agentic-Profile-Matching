"""Node 2 - extract structured requirements from the job description."""

from state.agent_state import AgentState
from tools.reasoning_tools import extract_requirements


def extract_requirements_node(state: AgentState) -> AgentState:
    """Parse the cleaned JD into structured must-have / nice-to-have requirements."""
    requirements = extract_requirements(state["raw_jd"])
    state["job_requirements"] = requirements
    state["requirements_version"] = state.get("requirements_version", 0) + 1
    return state

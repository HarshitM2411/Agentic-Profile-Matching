"""Node 5 - generate match reports and interview questions."""

from state.agent_state import AgentState
from tools.file_tools import read_resume_by_candidate_id, write_report
from tools.reasoning_tools import generate_interview_questions, summarize_resume


def generate_report_node(state: AgentState) -> AgentState:
    """Generate a full match report and interview questions for each shortlisted candidate."""
    requirements = state["job_requirements"]
    reports: dict = {}
    questions: dict = {}

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
            questions[candidate_id] = generate_interview_questions(
                candidate_id, requirements
            )

    state["match_reports"] = reports
    state["interview_questions"] = questions
    return state

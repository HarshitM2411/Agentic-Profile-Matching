"""Node 8 - produce final HIRE / NO-HIRE / BORDERLINE recommendations."""

from langchain_core.prompts import ChatPromptTemplate

from state.agent_state import AgentState
from tools.file_tools import write_report
from tools.reasoning_tools import _parse_json_list, llm


def _decision_for_score(score: float) -> str:
    if score >= 0.75:
        return "HIRE"
    if score >= 0.60:
        return "BORDERLINE"
    return "NO-HIRE"


def _normalize_suggestions(text: str) -> list[str]:
    """Parse LLM suggestions and guarantee a non-empty list of strings."""
    if not text.strip():
        return ["No suggestions available."]

    suggestions = _parse_json_list(text)
    if suggestions:
        return [str(item).strip() for item in suggestions if str(item).strip()]

    return [text.strip()]


def final_recommendation_node(state: AgentState) -> AgentState:
    """
    Holistic hire/no-hire evaluation for the full shortlist.
    Enhances borderline candidates with improvement suggestions.
    """
    reports = state["match_reports"]
    requirements = state["job_requirements"]
    shortlist = state["candidate_shortlist"]

    if not shortlist or not reports:
        print(
            "\nNo screening data available yet. "
            "Please complete at least one screening round first.\n"
        )
        return state

    final_decisions: dict[str, str] = {}
    enhanced_reports = {cid: dict(report) for cid, report in reports.items()}

    for cid in shortlist:
        report = enhanced_reports.setdefault(cid, {})
        score = state["candidate_scores"].get(cid, 0)
        decision = _decision_for_score(score)

        # Preserve the detailed report from Node 5, but ensure every shortlisted
        # candidate has the core final-round fields before writing to disk.
        report.setdefault("candidate_id", cid)
        report["overall_score"] = score
        report.setdefault("strengths", [])
        report.setdefault("gaps", [])
        report.setdefault("must_have_coverage", report.get("strengths", []))
        report.setdefault("improvement_suggestions", [])

        if decision == "BORDERLINE":
            prompt = ChatPromptTemplate.from_messages([
                (
                    "system",
                    (
                        "You are a senior recruiter. A candidate is on the borderline "
                        "for this role. Given their gaps and the requirements, provide "
                        "3-5 specific, actionable improvement suggestions that would "
                        "make them a stronger candidate. Return a JSON list of strings."
                    ),
                ),
                ("human", "Requirements:\n{requirements}\n\nCandidate gaps:\n{gaps}"),
            ])
            chain = prompt | llm
            response = chain.invoke({
                "requirements": str(requirements),
                "gaps": str(report.get("gaps", [])),
            })

            text = response.content or ""
            report["improvement_suggestions"] = _normalize_suggestions(text)

        final_decisions[cid] = decision
        report["hire_recommendation"] = decision
        write_report(cid, report)

    state["final_decision"] = final_decisions
    state["match_reports"] = enhanced_reports

    print("\n" + "=" * 60)
    print("  FINAL HIRING RECOMMENDATIONS")
    print("=" * 60)
    for rank, cid in enumerate(shortlist, 1):
        decision = final_decisions.get(cid, "-")
        score = state["candidate_scores"].get(cid, 0)
        print(f"  #{rank}  {cid:<30} {decision:<12} (score: {score:.2f})")

    print("\nDetailed reports saved to reports/ directory.\n")
    return state

import os
import sys
import traceback
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

if not os.getenv("GROQ_API_KEY"):
    raise EnvironmentError(
        "GROQ_API_KEY is not set. Create a .env file with your Groq API key."
    )

from langgraph.graph import StateGraph, END
from state.agent_state import AgentState, initial_state
from nodes.intent_router import intent_router_node, route_after_intent
from nodes.human_feedback import human_feedback_node, route_after_feedback
from nodes.direct_action import direct_action_node
from nodes.snapshot_ranking import snapshot_previous_ranking_node
from nodes.update_requirements import update_requirements_node
from nodes.ranking_delta import calculate_ranking_delta_node
from nodes.final_recommendation import final_recommendation_node
from nodes.parse_jd import parse_jd_node
from nodes.extract_requirements import extract_requirements_node
from nodes.search_resumes import search_resumes_node
from nodes.rank_candidates import rank_candidates_node
from nodes.generate_report import generate_report_node
from nodes.advance_screening_round import advance_screening_round_node

BASE_DIR = Path(__file__).resolve().parent


def route_after_report(state: AgentState) -> str:
    if state["screening_round"] < 3:
        return "advance_screening_round"
    return "human_feedback_loop"


def route_after_advance(state: AgentState) -> str:
    return "search_resumes"


def route_after_rank(state: AgentState) -> str:
    # previous_shortlist is only populated by snapshot_previous_ranking_node,
    # which runs exclusively on the refine_requirements path.  During the initial
    # 3-round screening parse_jd_node always resets it to [], so this branch is
    # only taken after a user-driven refinement.
    if state["previous_shortlist"]:
        return "ranking_delta"
    return "generate_report"


def build_graph() -> StateGraph:
    g = StateGraph(AgentState)

    g.add_node("intent_router", intent_router_node)
    g.add_node("human_feedback_loop", human_feedback_node)
    g.add_node("direct_action", direct_action_node)
    g.add_node("snapshot_previous_ranking", snapshot_previous_ranking_node)
    g.add_node("update_requirements", update_requirements_node)
    g.add_node("ranking_delta", calculate_ranking_delta_node)
    g.add_node("final_recommendation", final_recommendation_node)
    g.add_node("parse_jd", parse_jd_node)
    g.add_node("extract_requirements", extract_requirements_node)
    g.add_node("search_resumes", search_resumes_node)
    g.add_node("rank_candidates", rank_candidates_node)
    g.add_node("generate_report", generate_report_node)
    g.add_node("advance_screening_round", advance_screening_round_node)

    g.set_entry_point("intent_router")
    g.add_conditional_edges("intent_router", route_after_intent, {
        "parse_jd": "parse_jd",
        "snapshot_previous_ranking": "snapshot_previous_ranking",
        "direct_action": "direct_action",
        "final_recommendation": "final_recommendation",
    })
    g.add_edge("direct_action", "human_feedback_loop")
    g.add_conditional_edges("human_feedback_loop", route_after_feedback, {
        "intent_router": "intent_router",
        "final_recommendation": "final_recommendation",
        "end": END,
    })

    g.add_edge("parse_jd", "extract_requirements")
    g.add_edge("extract_requirements", "search_resumes")
    g.add_edge("snapshot_previous_ranking", "update_requirements")
    g.add_edge("update_requirements", "search_resumes")
    g.add_edge("search_resumes", "rank_candidates")
    g.add_conditional_edges("rank_candidates", route_after_rank, {
        "ranking_delta": "ranking_delta",
        "generate_report": "generate_report",
    })
    g.add_edge("ranking_delta", "generate_report")
    g.add_conditional_edges("generate_report", route_after_report, {
        "advance_screening_round": "advance_screening_round",
        "human_feedback_loop": "human_feedback_loop",
    })
    g.add_conditional_edges("advance_screening_round", route_after_advance, {
        "search_resumes": "search_resumes",
    })
    g.add_edge("final_recommendation", END)

    return g.compile()


def run_phase_4_smoke_test() -> int:
    """Run the Phase 4.3 smoke test and verify the Phase 4.4 criteria."""
    from tools.rag_tool import build_vector_store

    passed = 0
    failed = 0

    def check(label: str, condition: bool, detail: str = "") -> None:
        nonlocal passed, failed
        if condition:
            print(f"  PASS  {label}")
            passed += 1
        else:
            print(f"  FAIL  {label}" + (f" -- {detail}" if detail else ""))
            failed += 1

    # Pre-conditions
    print("\nPre-conditions")
    print("-" * 50)

    resume_dir = BASE_DIR / "data" / "resumes"
    reports_dir = BASE_DIR / "reports"
    resume_files = (
        list(resume_dir.glob("*.txt"))
        + list(resume_dir.glob("*.pdf"))
        + list(resume_dir.glob("*.md"))
    )
    check(
        f"at least 3 resume files in data/resumes/ (found {len(resume_files)})",
        len(resume_files) >= 3,
        f"only {len(resume_files)} file(s) found - add more resumes before running",
    )

    if failed > 0:
        print("\nPre-conditions not met. Aborting smoke test.")
        return 1

    # Build vector store
    print("\nBuilding vector store...")
    try:
        build_vector_store(str(resume_dir))
        print("Vector store ready.")
    except Exception as exc:
        check("vector store builds without error", False, str(exc))
        traceback.print_exc()
        return 1

    # Run the pipeline
    print("\nRunning 3-round screening pipeline...")
    graph = build_graph()
    state = initial_state()
    state["current_query"] = (
        "Senior Python backend engineer with REST APIs and 5 years experience"
    )

    try:
        from unittest.mock import patch
        import nodes.intent_router as _ir_mod

        def _smoke_router(st: AgentState) -> AgentState:
            """Bypass LLM: treat every query as a new_search in smoke test."""
            st["current_intent"] = "new_search"
            st["conversation_history"].append({"role": "user", "content": st["current_query"]})
            return st

        # Patch intent_router LLM call and exit cleanly at human_feedback_loop
        with (
            patch.object(_ir_mod, "intent_router_node", side_effect=_smoke_router),
            patch("matching_agent.intent_router_node", side_effect=_smoke_router),
            patch("builtins.input", return_value=""),
        ):
            result = graph.invoke(state)
    except Exception as exc:
        print("\nAcceptance Criteria (Phase 4.4)")
        print("-" * 50)
        check("pipeline ran to completion without error", False, str(exc))
        traceback.print_exc()
        return 1

    # Acceptance Criteria (4.4)
    print("\nAcceptance Criteria (Phase 4.4)")
    print("-" * 50)

    # Criterion 1: pipeline completes (reaching here means no exception was raised)
    check("pipeline ran to completion without error", True)

    # Criterion 2: shortlist is non-empty and ordered by score
    shortlist = result["candidate_shortlist"]
    scores = result["candidate_scores"]
    is_nonempty = len(shortlist) > 0
    check(f"candidate_shortlist is non-empty (got {len(shortlist)} candidates)", is_nonempty)

    if is_nonempty and len(shortlist) > 1:
        ordered_scores = [scores.get(cid, 0) for cid in shortlist]
        is_ordered = all(
            ordered_scores[i] >= ordered_scores[i + 1]
            for i in range(len(ordered_scores) - 1)
        )
        check(
            "candidate_shortlist is ordered by score (descending)",
            is_ordered,
            f"scores in shortlist order: {[round(s, 2) for s in ordered_scores]}",
        )
    else:
        check("candidate_shortlist ordering (skipped - fewer than 2 candidates)", True)

    # Criterion 3: screening_round equals 3 after full pipeline
    final_round = result["screening_round"]
    check(
        f"screening_round == 3 after full pipeline (got {final_round})",
        final_round == 3,
    )

    # Criterion 4: a .json report file exists on disk for each shortlisted candidate
    missing_reports = [
        cid for cid in shortlist
        if not (reports_dir / f"{cid}_report.json").exists()
    ]
    check(
        f"report .json files exist for all shortlisted candidates",
        len(missing_reports) == 0,
        f"missing: {missing_reports}" if missing_reports else "",
    )

    # Criterion 5: match_reports contains hire_recommendation for every candidate
    match_reports = result["match_reports"]
    missing_recs = [
        cid for cid in shortlist
        if match_reports.get(cid, {}).get("hire_recommendation") not in
           {"HIRE", "BORDERLINE", "NO-HIRE"}
    ]
    check(
        "match_reports contains hire_recommendation for every candidate",
        len(missing_recs) == 0,
        f"missing/invalid for: {missing_recs}" if missing_recs else "",
    )

    # Summary
    print(f"\n{'=' * 50}")
    print(f"  Shortlist : {shortlist}")
    print(f"  Scores    : { {k: round(v, 2) for k, v in scores.items()} }")
    print(f"  Reports   : {list(match_reports.keys())}")
    for cid, report in match_reports.items():
        print(f"    {cid:<30} {report.get('hire_recommendation','?'):<12} "
              f"score={report.get('overall_score', 0):.2f}")
    print(f"\n  {passed} passed  |  {failed} failed")
    print(f"{'=' * 50}\n")

    return 0 if failed == 0 else 1


def run_agent() -> None:
    """Conversational REPL for the candidate matching agent (Phase 5.5)."""
    from tools.rag_tool import build_vector_store

    resume_dir = BASE_DIR / "data" / "resumes"
    try:
        print("\nIndexing resumes...")
        build_vector_store(str(resume_dir))
    except Exception as exc:
        print(f"Warning: vector store setup failed: {exc}")

    graph = build_graph()
    state = initial_state()

    print("\nAirTribe Candidate Matching Agent")
    print("Enter a job description to begin.\n")

    first_query = input("You: ").strip()
    if not first_query:
        print("No query provided. Exiting.")
        return

    state["current_query"] = first_query
    graph.invoke(state)
    print("Session ended.")


def run_phase_5_acceptance_test() -> int:
    """Verify Phase 5.6 acceptance criteria with scripted inputs and mocks."""
    from unittest.mock import patch

    passed = 0
    failed = 0

    def check(label: str, condition: bool, detail: str = "") -> None:
        nonlocal passed, failed
        if condition:
            print(f"  PASS  {label}")
            passed += 1
        else:
            print(f"  FAIL  {label}" + (f" -- {detail}" if detail else ""))
            failed += 1

    def mock_intent_router_node(state: AgentState) -> AgentState:
        query = state["current_query"].lower()
        if "compare" in query:
            intent = "compare_candidates"
        elif "why" in query or "rank higher" in query:
            intent = "explain_ranking"
        elif "question" in query:
            intent = "generate_questions"
        elif query.strip() == "finalize":
            intent = "finalize"
        else:
            intent = "new_search"

        state["current_intent"] = intent
        state["conversation_history"].append({
            "role": "user",
            "content": state["current_query"],
        })
        return state

    def mock_extract_requirements(_jd: str) -> dict:
        return {
            "must_have": ["Python", "REST APIs"],
            "nice_to_have": ["Kubernetes"],
            "experience_years": 5,
            "role_level": "Senior",
            "domain": "Backend Engineering",
        }

    def mock_search_resumes(_query: str, top_k: int = 10) -> list[dict]:
        return [
            {"candidate_id": "alice", "file_path": "data/resumes/alice.txt", "score": 0.9, "text_chunk": ""},
            {"candidate_id": "priya_sharma", "file_path": "data/resumes/priya_sharma.txt", "score": 0.8, "text_chunk": ""},
        ][:top_k]

    def mock_compare_candidates(candidate_ids: list[str], _requirements: dict) -> dict:
        return {
            "winner": candidate_ids[0],
            "reasoning": "Stronger Python and REST API depth.",
            "candidates": {
                cid: {
                    "overall_score": 0.9 - (i * 0.1),
                    "must_have_score": 0.95 - (i * 0.05),
                    "nice_to_have_score": 0.8 - (i * 0.05),
                    "reasoning": f"{cid} is a solid match.",
                }
                for i, cid in enumerate(candidate_ids)
            },
        }

    def mock_summarize_resume(_text: str) -> dict:
        return {
            "summary": "Experienced backend engineer.",
            "skills": ["Python", "REST APIs"],
            "experience_years": 5,
            "strengths": ["Python", "REST APIs"],
            "gaps": ["GraphQL"],
        }

    def mock_generate_interview_questions(_candidate_id: str, _requirements: dict) -> list[str]:
        return [f"Question {i}" for i in range(1, 6)]

    class FakeLLMResponse:
        def __init__(self, content: str):
            self.content = content

    def fake_explain_llm(_inputs):
        return FakeLLMResponse(
            "Alice ranks higher due to stronger backend experience."
        )

    def fake_borderline_llm(_inputs):
        return FakeLLMResponse(
            '["Improve GraphQL skills", "Add more API design examples"]'
        )

    from langchain_core.runnables import RunnableLambda

    explain_llm = RunnableLambda(fake_explain_llm)
    borderline_llm = RunnableLambda(fake_borderline_llm)

    input_script = iter([
        "Compare the top 3",
        "Why did alice rank higher than priya_sharma?",
        "Create interview questions for alice",
        "finalize",
        "",
    ])

    def scripted_input(prompt: str = "") -> str:
        if prompt.strip().startswith("You:"):
            return "Senior Python backend engineer with REST APIs and 5 years experience"
        try:
            return next(input_script)
        except StopIteration:
            return ""

    print("\nAcceptance Criteria (Phase 5.6)")
    print("-" * 50)

    import matching_agent as ma
    import nodes.direct_action as direct_action_mod
    import nodes.extract_requirements as extract_requirements_mod
    import nodes.final_recommendation as final_recommendation_mod
    import nodes.generate_report as generate_report_mod
    import nodes.rank_candidates as rank_candidates_mod
    import nodes.search_resumes as search_resumes_mod

    with (
        patch("builtins.input", side_effect=scripted_input),
        patch.object(ma, "intent_router_node", side_effect=mock_intent_router_node),
        patch.object(extract_requirements_mod, "extract_requirements", side_effect=mock_extract_requirements),
        patch.object(search_resumes_mod, "search_resumes", side_effect=mock_search_resumes),
        patch.object(rank_candidates_mod, "compare_candidates", side_effect=mock_compare_candidates),
        patch.object(direct_action_mod, "compare_candidates", side_effect=mock_compare_candidates),
        patch.object(generate_report_mod, "summarize_resume", side_effect=mock_summarize_resume),
        patch.object(generate_report_mod, "generate_interview_questions", side_effect=mock_generate_interview_questions),
        patch.object(direct_action_mod, "generate_interview_questions", side_effect=mock_generate_interview_questions),
        patch.object(direct_action_mod, "llm", new=explain_llm),
        patch.object(final_recommendation_mod, "llm", new=borderline_llm),
    ):
        graph = ma.build_graph()
        state = initial_state()
        state["current_query"] = (
            "Senior Python backend engineer with REST APIs and 5 years experience"
        )
        result = graph.invoke(state)

    assistant_messages = [
        msg["content"]
        for msg in result.get("conversation_history", [])
        if msg.get("role") == "assistant"
    ]

    check(
        "typing a JD triggers the full screening pipeline",
        result.get("screening_round") == 3 and len(result.get("candidate_shortlist", [])) > 0,
        f"round={result.get('screening_round')}, shortlist={result.get('candidate_shortlist')}",
    )

    compare_msgs = [m for m in assistant_messages if "Winner:" in m and "overall=" in m]
    check(
        "'Compare the top 3' routes through direct_action and prints comparison",
        len(compare_msgs) > 0,
        f"assistant messages: {assistant_messages}",
    )

    explain_msgs = [m for m in assistant_messages if "Alice ranks higher" in m]
    check(
        "ranking explanation is produced via direct_action",
        len(explain_msgs) > 0,
    )

    question_msgs = [m for m in assistant_messages if "Interview questions for alice" in m]
    check(
        "interview question generation returns 5 questions",
        any(m.count("Question") >= 5 for m in question_msgs),
        f"messages: {question_msgs}",
    )

    check(
        "'finalize' proceeds to final_recommendation",
        result.get("final_decision") is not None and len(result.get("final_decision", {})) > 0,
        f"final_decision={result.get('final_decision')}",
    )

    exit_state = initial_state()
    with patch("builtins.input", return_value=""):
        exit_state = human_feedback_node(exit_state)
    check(
        "pressing Enter exits cleanly",
        exit_state.get("current_query", "") == ""
        and route_after_feedback(exit_state) == "end",
    )

    print(f"\n  {passed} passed  |  {failed} failed")
    print("-" * 50)
    return 0 if failed == 0 else 1


def run_phase_6_acceptance_test() -> int:
    """Verify Phase 6.5 acceptance criteria with scripted refinement flow."""
    from unittest.mock import patch
    from langchain_core.runnables import RunnableLambda

    passed = 0
    failed = 0

    def check(label: str, condition: bool, detail: str = "") -> None:
        nonlocal passed, failed
        if condition:
            print(f"  PASS  {label}")
            passed += 1
        else:
            print(f"  FAIL  {label}" + (f" -- {detail}" if detail else ""))
            failed += 1

    def mock_intent_router_node(state: AgentState) -> AgentState:
        query = state["current_query"].lower()
        if "typescript" in query or "must-have" in query:
            intent = "refine_requirements"
        elif "why" in query and "ranking" in query:
            intent = "explain_ranking"
        elif "compare" in query:
            intent = "compare_candidates"
        elif query.strip() == "finalize":
            intent = "finalize"
        else:
            intent = "new_search"

        state["current_intent"] = intent
        state["conversation_history"].append({
            "role": "user",
            "content": state["current_query"],
        })
        return state

    def mock_extract_requirements(jd: str) -> dict:
        base = {
            "must_have": ["Python", "REST APIs"],
            "nice_to_have": ["Kubernetes"],
            "experience_years": 5,
            "role_level": "Senior",
            "domain": "Backend Engineering",
        }
        if "typescript" in jd.lower():
            base["must_have"] = ["Python", "REST APIs", "TypeScript"]
            base["nice_to_have"] = ["Kubernetes"]
        return base

    def mock_search_resumes(_query: str, top_k: int = 10) -> list[dict]:
        return [
            {"candidate_id": "alice", "file_path": "data/resumes/alice.txt", "score": 0.9, "text_chunk": ""},
            {"candidate_id": "priya_sharma", "file_path": "data/resumes/priya_sharma.txt", "score": 0.8, "text_chunk": ""},
        ][:top_k]

    def mock_compare_candidates(candidate_ids: list[str], requirements: dict) -> dict:
        # Use TypeScript in must_have as the signal that this is a refinement pass.
        # On refinement, reverse the order to produce visible ranking movement.
        must_have = requirements.get("must_have", [])
        if "TypeScript" in must_have:
            ordered = list(reversed(candidate_ids))
        else:
            ordered = list(candidate_ids)

        return {
            "winner": ordered[0],
            "reasoning": "Re-ranked after requirement update.",
            "candidates": {
                cid: {
                    "overall_score": 0.9 - (i * 0.1),
                    "must_have_score": 0.95 - (i * 0.05),
                    "nice_to_have_score": 0.8 - (i * 0.05),
                    "reasoning": f"{cid} evaluated against updated requirements.",
                }
                for i, cid in enumerate(ordered)
            },
        }

    def mock_summarize_resume(_text: str) -> dict:
        return {
            "summary": "Experienced backend engineer.",
            "skills": ["Python", "REST APIs"],
            "experience_years": 5,
            "strengths": ["Python", "REST APIs"],
            "gaps": ["TypeScript"],
        }

    def mock_generate_interview_questions(_candidate_id: str, _requirements: dict) -> list[str]:
        return [f"Question {i}" for i in range(1, 6)]

    class FakeLLMResponse:
        def __init__(self, content: str):
            self.content = content

    def fake_explain_llm(_inputs):
        return FakeLLMResponse(
            "The ranking changed because priya_sharma moved up after TypeScript "
            "became a must-have. See ranking_delta for position changes."
        )

    explain_llm = RunnableLambda(fake_explain_llm)

    input_script = iter([
        "Make TypeScript a must-have",
        "Why did the ranking change?",
        "",
    ])

    def scripted_input(prompt: str = "") -> str:
        try:
            return next(input_script)
        except StopIteration:
            return ""

    print("\nAcceptance Criteria (Phase 6.5)")
    print("-" * 50)

    import matching_agent as ma
    import nodes.direct_action as direct_action_mod
    import nodes.extract_requirements as extract_requirements_mod
    import nodes.final_recommendation as final_recommendation_mod
    import nodes.generate_report as generate_report_mod
    import nodes.rank_candidates as rank_candidates_mod
    import nodes.search_resumes as search_resumes_mod
    import nodes.update_requirements as update_requirements_mod

    # Patch ma.intent_router_node so that build_graph() (called inside the with
    # block) picks up the mock when it adds the node to the graph.
    with (
        patch("builtins.input", side_effect=scripted_input),
        patch.object(ma, "intent_router_node", side_effect=mock_intent_router_node),
        patch.object(extract_requirements_mod, "extract_requirements", side_effect=mock_extract_requirements),
        patch.object(update_requirements_mod, "extract_requirements", side_effect=mock_extract_requirements),
        patch.object(search_resumes_mod, "search_resumes", side_effect=mock_search_resumes),
        patch.object(rank_candidates_mod, "compare_candidates", side_effect=mock_compare_candidates),
        patch.object(direct_action_mod, "compare_candidates", side_effect=mock_compare_candidates),
        patch.object(generate_report_mod, "summarize_resume", side_effect=mock_summarize_resume),
        patch.object(generate_report_mod, "generate_interview_questions", side_effect=mock_generate_interview_questions),
        patch.object(direct_action_mod, "llm", new=explain_llm),
        patch.object(final_recommendation_mod, "llm", new=explain_llm),
    ):
        graph = ma.build_graph()
        state = initial_state()
        state["current_query"] = (
            "Senior Python backend engineer with REST APIs and 5 years experience"
        )
        result = graph.invoke(state)

    deltas = result.get("ranking_delta", {})
    change_log = result.get("requirement_change_log", [])
    assistant_messages = [
        msg["content"]
        for msg in result.get("conversation_history", [])
        if msg.get("role") == "assistant"
    ]

    # Criterion 1: refinement triggered a re-rank - check directly via state,
    # not via a fragile call counter.
    rerank_triggered = (
        len(change_log) >= 1
        and change_log[-1].get("user_instruction") == "Make TypeScript a must-have"
        and len(deltas) > 0
    )
    check(
        "'Make TypeScript a must-have' triggers a re-rank",
        rerank_triggered,
        f"change_log entries={len(change_log)}, delta candidates={list(deltas.keys())}",
    )

    # Criterion 2: movement descriptions present in ranking_delta.
    movement_values = [d.get("movement", "") for d in deltas.values()]
    has_movement = any(
        any(kw in m for kw in ("moved up", "moved down", "dropped", "new entry", "unchanged"))
        for m in movement_values
    )
    check(
        "ranking_delta contains movement descriptions after re-rank",
        has_movement,
        f"movements: {movement_values}",
    )

    # Criterion 3: explain query produces a natural-language answer referencing delta.
    explain_msgs = [
        m for m in assistant_messages
        if "ranking changed" in m.lower() or "ranking_delta" in m.lower()
    ]
    check(
        "'Why did the ranking change?' produces explanation referencing delta",
        len(explain_msgs) > 0,
        f"assistant messages: {assistant_messages}",
    )

    # Criterion 4: requirement_change_log records one entry per user-driven update.
    check(
        "requirement_change_log has one entry per criteria update",
        len(change_log) >= 1
        and change_log[-1].get("user_instruction") == "Make TypeScript a must-have",
        f"log: {change_log}",
    )

    print(f"\n  {passed} passed  |  {failed} failed")
    print("-" * 50)
    return 0 if failed == 0 else 1


def run_phase_7_acceptance_test() -> int:
    """Verify Phase 7.3 acceptance criteria for final recommendation."""
    import io
    import json
    import tempfile
    from pathlib import Path
    from unittest.mock import patch
    from contextlib import redirect_stdout

    from langchain_core.runnables import RunnableLambda

    passed = 0
    failed = 0
    valid_decisions = {"HIRE", "NO-HIRE", "BORDERLINE"}

    def check(label: str, condition: bool, detail: str = "") -> None:
        nonlocal passed, failed
        if condition:
            print(f"  PASS  {label}")
            passed += 1
        else:
            print(f"  FAIL  {label}" + (f" -- {detail}" if detail else ""))
            failed += 1

    def mock_intent_router_node(state: AgentState) -> AgentState:
        state["current_intent"] = "new_search"
        state["conversation_history"].append({
            "role": "user",
            "content": state["current_query"],
        })
        return state

    def mock_extract_requirements(_jd: str) -> dict:
        return {
            "must_have": ["Python", "REST APIs"],
            "nice_to_have": ["Kubernetes"],
            "experience_years": 5,
            "role_level": "Senior",
            "domain": "Backend Engineering",
        }

    def mock_search_resumes(_query: str, top_k: int = 10) -> list[dict]:
        return [
            {"candidate_id": "alice", "file_path": "data/resumes/alice.txt", "score": 0.9, "text_chunk": ""},
            {"candidate_id": "priya_sharma", "file_path": "data/resumes/priya_sharma.txt", "score": 0.65, "text_chunk": ""},
            {"candidate_id": "bob", "file_path": "data/resumes/bob.txt", "score": 0.45, "text_chunk": ""},
        ][:top_k]

    score_map = {"alice": 0.90, "priya_sharma": 0.65, "bob": 0.45}

    def mock_compare_candidates(candidate_ids: list[str], _requirements: dict) -> dict:
        ordered = sorted(candidate_ids, key=lambda c: score_map.get(c, 0), reverse=True)
        return {
            "winner": ordered[0],
            "reasoning": "Evaluated against job requirements.",
            "candidates": {
                cid: {
                    "overall_score": score_map.get(cid, 0.5),
                    "must_have_score": score_map.get(cid, 0.5),
                    "nice_to_have_score": 0.7,
                    "reasoning": f"{cid} evaluated for the role.",
                }
                for cid in candidate_ids
            },
        }

    def mock_summarize_resume(_text: str) -> dict:
        return {
            "summary": "Experienced engineer.",
            "skills": ["Python"],
            "experience_years": 5,
            "strengths": ["Python"],
            "gaps": ["Kubernetes", "System design"],
        }

    def mock_generate_interview_questions(_candidate_id: str, _requirements: dict) -> list[str]:
        return [f"Question {i}" for i in range(1, 6)]

    class FakeLLMResponse:
        def __init__(self, content: str):
            self.content = content

    def fake_borderline_llm(_inputs):
        return FakeLLMResponse(
            '["Complete a Kubernetes certification", '
            '"Lead a system design project", '
            '"Contribute to open-source backend tooling"]'
        )

    borderline_llm = RunnableLambda(fake_borderline_llm)

    input_script = iter(["finalize", ""])

    def scripted_input(prompt: str = "") -> str:
        try:
            return next(input_script)
        except StopIteration:
            return ""

    print("\nAcceptance Criteria (Phase 7.3)")
    print("-" * 50)

    import matching_agent as ma
    import nodes.direct_action as direct_action_mod
    import nodes.extract_requirements as extract_requirements_mod
    import nodes.final_recommendation as final_recommendation_mod
    import nodes.generate_report as generate_report_mod
    import nodes.rank_candidates as rank_candidates_mod
    import nodes.search_resumes as search_resumes_mod
    import tools.file_tools as file_tools_mod

    reports_tmp = Path(tempfile.mkdtemp())

    output_buffer = io.StringIO()
    with redirect_stdout(output_buffer):
        with (
            patch("builtins.input", side_effect=scripted_input),
            patch.object(ma, "intent_router_node", side_effect=mock_intent_router_node),
            patch.object(file_tools_mod, "REPORTS_DIR", reports_tmp),
            patch.object(extract_requirements_mod, "extract_requirements", side_effect=mock_extract_requirements),
            patch.object(search_resumes_mod, "search_resumes", side_effect=mock_search_resumes),
            patch.object(rank_candidates_mod, "compare_candidates", side_effect=mock_compare_candidates),
            patch.object(direct_action_mod, "compare_candidates", side_effect=mock_compare_candidates),
            patch.object(generate_report_mod, "summarize_resume", side_effect=mock_summarize_resume),
            patch.object(generate_report_mod, "generate_interview_questions", side_effect=mock_generate_interview_questions),
            patch.object(final_recommendation_mod, "llm", new=borderline_llm),
        ):
            graph = ma.build_graph()
            state = initial_state()
            state["current_query"] = (
                "Senior Python backend engineer with REST APIs and 5 years experience"
            )
            result = graph.invoke(state)

    captured_output = output_buffer.getvalue()

    final_decision = result.get("final_decision") or {}
    match_reports = result.get("match_reports") or {}
    shortlist = result.get("candidate_shortlist") or []

    check(
        "typing 'finalize' at the feedback prompt triggers Node 8",
        len(final_decision) > 0,
        f"final_decision={final_decision}",
    )

    all_valid = (
        len(final_decision) == len(shortlist)
        and all(d in valid_decisions for d in final_decision.values())
    )
    check(
        "each candidate in final_decision has HIRE, NO-HIRE, or BORDERLINE",
        all_valid,
        f"decisions={final_decision}, shortlist={shortlist}",
    )

    borderline_ids = [cid for cid, d in final_decision.items() if d == "BORDERLINE"]
    borderline_has_suggestions = all(
        len(match_reports.get(cid, {}).get("improvement_suggestions") or []) > 0
        for cid in borderline_ids
    )
    check(
        "every BORDERLINE candidate report has non-empty improvement_suggestions",
        len(borderline_ids) > 0 and borderline_has_suggestions,
        f"borderline={borderline_ids}, suggestions="
        f"{ {cid: match_reports.get(cid, {}).get('improvement_suggestions') for cid in borderline_ids} }",
    )

    expected_decisions = {
        "alice": "HIRE",
        "priya_sharma": "BORDERLINE",
        "bob": "NO-HIRE",
    }
    decisions_match_scores = all(
        final_decision.get(cid) == expected_decisions.get(cid)
        for cid in shortlist
        if cid in expected_decisions
    )
    check(
        "score thresholds produce expected final decisions",
        decisions_match_scores,
        f"decisions={final_decision}",
    )

    printed_summary_has_all_candidates = (
        "FINAL HIRING RECOMMENDATIONS" in captured_output
        and all(
            cid in captured_output
            and final_decision.get(cid, "") in captured_output
            and f"(score: {score_map[cid]:.2f})" in captured_output
            for cid in shortlist
        )
    )
    check(
        "printed summary shows all candidates with final decision and score",
        printed_summary_has_all_candidates,
        f"captured output:\n{captured_output}",
    )

    report_files = list(reports_tmp.glob("*_report.json"))
    report_payloads = {
        p.stem.replace("_report", ""): json.loads(p.read_text(encoding="utf-8"))
        for p in report_files
    }
    on_disk_valid = (
        set(report_payloads) >= set(shortlist)
        and all(
            report_payloads[cid].get("hire_recommendation") == final_decision[cid]
            for cid in shortlist
        )
    )
    check(
        "reports directory contains updated JSON files with final decisions",
        on_disk_valid,
        f"reports={report_payloads}",
    )

    print(f"\n  {passed} passed  |  {failed} failed")
    print("-" * 50)
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--smoke-test":
        sys.exit(run_phase_4_smoke_test())
    if len(sys.argv) > 1 and sys.argv[1] == "--phase5-test":
        sys.exit(run_phase_5_acceptance_test())
    if len(sys.argv) > 1 and sys.argv[1] == "--phase6-test":
        sys.exit(run_phase_6_acceptance_test())
    if len(sys.argv) > 1 and sys.argv[1] == "--phase7-test":
        sys.exit(run_phase_7_acceptance_test())
    run_agent()

from typing import Any, Dict, List, Optional, TypedDict


class AgentState(TypedDict):
    # ── Conversation ──────────────────────────────────────────────
    conversation_history: List[Dict[str, str]]  # [{role, content}, ...]
    current_query: str
    current_intent: str  # new_search | refine_requirements | compare_candidates
                         # explain_ranking | generate_questions | finalize

    # ── Job Description ───────────────────────────────────────────
    raw_jd: str
    job_requirements: Dict[str, Any]       # {must_have, nice_to_have, role_level, domain}
    requirements_version: int              # increments on each update
    requirement_change_log: List[Dict[str, Any]]  # [{version, change, timestamp}]

    # ── Screening Results ─────────────────────────────────────────
    candidate_pool: List[str]              # file paths or IDs from current search pass
    candidate_shortlist: List[str]         # ordered by score (best first)
    candidate_scores: Dict[str, float]     # candidate_id → 0.0–1.0
    reasoning: Dict[str, str]              # candidate_id → why this score

    # ── Refinement Tracking ───────────────────────────────────────
    previous_shortlist: List[str]
    previous_scores: Dict[str, float]
    ranking_delta: Dict[str, Dict[str, Any]]  # {position_change, score_change, reason}

    # ── Reports ───────────────────────────────────────────────────
    match_reports: Dict[str, Dict]         # candidate_id → CandidateMatchReport
    interview_questions: Dict[str, List[str]]  # candidate_id → [questions]

    # ── Control Flow ──────────────────────────────────────────────
    screening_round: int                   # 1, 2, or 3
    criteria_updated: bool
    finalize_requested: bool
    final_decision: Optional[Dict[str, str]]  # candidate_id → HIRE|NO-HIRE|BORDERLINE


def initial_state() -> AgentState:
    return AgentState(
        conversation_history=[],
        current_query="",
        current_intent="",
        raw_jd="",
        job_requirements={},
        requirements_version=0,
        requirement_change_log=[],
        candidate_pool=[],
        candidate_shortlist=[],
        candidate_scores={},
        reasoning={},
        previous_shortlist=[],
        previous_scores={},
        ranking_delta={},
        match_reports={},
        interview_questions={},
        screening_round=1,
        criteria_updated=False,
        finalize_requested=False,
        final_decision=None,
    )

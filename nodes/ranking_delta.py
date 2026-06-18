"""Node 4B - compute ranking movement after requirement changes."""

from state.agent_state import AgentState


def calculate_ranking_delta_node(state: AgentState) -> AgentState:
    """
    Compare previous ranking vs current ranking and record movement per candidate.
    Only runs when previous_shortlist is populated (i.e. after a refinement).
    Covers both candidates that remain in the shortlist and those that dropped off.
    """
    if not state["previous_shortlist"]:
        return state

    old_rank = {cid: i for i, cid in enumerate(state["previous_shortlist"])}
    new_rank = {cid: i for i, cid in enumerate(state["candidate_shortlist"])}

    deltas: dict[str, dict] = {}

    # Track movement for every candidate currently in the shortlist.
    for cid in state["candidate_shortlist"]:
        prev_pos = old_rank.get(cid)
        curr_pos = new_rank[cid]
        prev_score = state["previous_scores"].get(cid)
        curr_score = state["candidate_scores"].get(cid, 0)

        movement = "new entry"
        if prev_pos is not None:
            diff = prev_pos - curr_pos
            if diff > 0:
                movement = f"moved up {diff} position(s)"
            elif diff < 0:
                movement = f"moved down {abs(diff)} position(s)"
            else:
                movement = "unchanged"

        deltas[cid] = {
            "previous_position": prev_pos,
            "current_position": curr_pos,
            "movement": movement,
            "previous_score": prev_score,
            "current_score": curr_score,
            "score_change": None if prev_score is None else round(curr_score - prev_score, 3),
            "reason": state["reasoning"].get(cid, ""),
        }

    # Record candidates that were in the previous shortlist but are no longer present.
    for cid in state["previous_shortlist"]:
        if cid not in new_rank:
            deltas[cid] = {
                "previous_position": old_rank[cid],
                "current_position": None,
                "movement": "dropped from shortlist",
                "previous_score": state["previous_scores"].get(cid),
                "current_score": None,
                "score_change": None,
                "reason": state["reasoning"].get(cid, ""),
            }

    state["ranking_delta"] = deltas
    return state

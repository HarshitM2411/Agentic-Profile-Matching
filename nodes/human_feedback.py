"""Node 6 - display results and collect user follow-up input."""

from state.agent_state import AgentState


def human_feedback_node(state: AgentState) -> AgentState:
    """
    Display current results to the user and read their next instruction.
    In a CLI context this is a blocking input(); in an API context this
    becomes the response/request boundary.
    """
    print("\n" + "=" * 60)
    print(f"  Screening Round {state['screening_round']} complete")
    print("=" * 60)

    shortlist = state["candidate_shortlist"]
    for rank, cid in enumerate(shortlist, 1):
        score = state["candidate_scores"].get(cid, 0)
        rec = state["match_reports"].get(cid, {}).get("hire_recommendation", "-")
        print(f"  #{rank}  {cid:<30} score={score:.2f}  [{rec}]")

    print("\nOptions:")
    print("  - Type a new requirement change  (e.g. 'Make TypeScript a must-have')")
    print("  - Type 'compare top 3'")
    print("  - Type 'finalize' for final recommendation")
    print("  - Press Enter to exit\n")

    user_input = input("Your instruction: ").strip()

    if not user_input:
        state["current_query"] = ""
        state["criteria_updated"] = False
        state["finalize_requested"] = False
    elif user_input.lower() == "finalize":
        state["current_query"] = user_input
        state["finalize_requested"] = True
        state["criteria_updated"] = False
    else:
        state["current_query"] = user_input
        # Route the follow-up back through the intent router. It may be a
        # refinement, comparison, explanation, or question-generation request.
        state["criteria_updated"] = False
        state["finalize_requested"] = False

    return state


def route_after_feedback(state: AgentState) -> str:
    if state["finalize_requested"]:
        return "final_recommendation"

    if state["current_query"].strip():
        return "intent_router"

    return "end"

"""Node 7 - handle compare, explain, and question-generation intents."""

from langchain_core.prompts import ChatPromptTemplate

from state.agent_state import AgentState
from tools.reasoning_tools import compare_candidates, generate_interview_questions, llm


def direct_action_node(state: AgentState) -> AgentState:
    intent = state["current_intent"]
    query = state["current_query"]
    answer = ""

    if intent == "compare_candidates":
        ids_to_compare = state["candidate_shortlist"][:3]
        if not ids_to_compare:
            answer = (
                "No shortlisted candidates are available yet. "
                "Please run a candidate search first."
            )
            state["conversation_history"].append({"role": "assistant", "content": answer})
            print(f"\nAgent: {answer}\n")
            return state

        result = compare_candidates(ids_to_compare, state["job_requirements"])
        answer = (
            f"Winner: {result.get('winner', 'N/A')}\n\n"
            f"Reasoning: {result.get('reasoning', '')}\n\n"
            + "\n".join(
                f"{cid}: overall={data.get('overall_score', 0):.2f}  "
                f"must_have={data.get('must_have_score', 0):.2f}  "
                f"nice_to_have={data.get('nice_to_have_score', 0):.2f}"
                for cid, data in result.get("candidates", {}).items()
            )
        )

    elif intent == "explain_ranking":
        prompt = ChatPromptTemplate.from_messages([
            (
                "system",
                (
                    "You are a recruiter assistant. Explain the ranking based on "
                    "the data provided. Be specific about skills and scores."
                ),
            ),
            (
                "human",
                (
                    "Query: {query}\n\n"
                    "Rankings: {rankings}\n\n"
                    "Reasoning per candidate: {reasoning}\n\n"
                    "Ranking changes: {deltas}"
                ),
            ),
        ])
        chain = prompt | llm
        response = chain.invoke({
            "query": query,
            "rankings": str(list(enumerate(state["candidate_shortlist"], 1))),
            "reasoning": str(state["reasoning"]),
            "deltas": str(state["ranking_delta"]),
        })
        answer = response.content or ""

    elif intent == "generate_questions":
        candidate_id = (
            state["candidate_shortlist"][0] if state["candidate_shortlist"] else None
        )
        for cid in state["candidate_shortlist"]:
            if cid.lower() in query.lower():
                candidate_id = cid
                break

        if candidate_id:
            qs = generate_interview_questions(candidate_id, state["job_requirements"])
            answer = (
                f"Interview questions for {candidate_id}:\n"
                + "\n".join(f"  {i + 1}. {q}" for i, q in enumerate(qs))
            )
        else:
            answer = "Could not identify which candidate to generate questions for."

    else:
        answer = (
            f"I don't know how to handle intent '{intent}'. "
            "Try: compare top 3, explain ranking, generate questions, or finalize."
        )

    state["conversation_history"].append({"role": "assistant", "content": answer})
    print(f"\nAgent: {answer}\n")
    return state

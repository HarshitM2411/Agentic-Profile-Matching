"""Node 0 - classify user intent and route the graph."""

from langchain_core.prompts import ChatPromptTemplate

from state.agent_state import AgentState
from tools.reasoning_tools import llm

INTENT_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        (
            "Classify the user's message into exactly one intent from this list:\n"
            "  new_search          \u2014 user wants to find candidates for a new JD\n"
            "  refine_requirements \u2014 user wants to change/update existing requirements\n"
            "  compare_candidates  \u2014 user wants a side-by-side comparison\n"
            "  explain_ranking     \u2014 user wants to know why someone ranked higher/lower\n"
            "  generate_questions  \u2014 user wants interview questions for a specific candidate\n"
            "  finalize            \u2014 user wants the final hire/no-hire recommendation\n\n"
            "Return only the intent label, nothing else."
        ),
    ),
    ("human", "{query}"),
])

VALID_INTENTS = {
    "new_search",
    "refine_requirements",
    "compare_candidates",
    "explain_ranking",
    "generate_questions",
    "finalize",
}


def intent_router_node(state: AgentState) -> AgentState:
    chain = INTENT_PROMPT | llm
    response = chain.invoke({"query": state["current_query"]})
    intent = (response.content or "").strip().lower()

    state["current_intent"] = intent if intent in VALID_INTENTS else "new_search"
    state["conversation_history"].append({
        "role": "user",
        "content": state["current_query"],
    })
    return state


def route_after_intent(state: AgentState) -> str:
    intent = state["current_intent"]
    routes = {
        "new_search": "parse_jd",
        "refine_requirements": "snapshot_previous_ranking",
        "compare_candidates": "direct_action",
        "explain_ranking": "direct_action",
        "generate_questions": "direct_action",
        "finalize": "final_recommendation",
    }
    return routes.get(intent, "parse_jd")

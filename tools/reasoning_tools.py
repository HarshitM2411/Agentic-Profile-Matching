"""LLM-backed reasoning tools — Groq via LangChain."""

from __future__ import annotations

import json
import os
import re

from dotenv import load_dotenv

# load_dotenv FIRST so all os.getenv calls below pick up the .env file
load_dotenv()

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from tools.file_tools import read_resume_by_candidate_id

llm = ChatOpenAI(
    model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
    temperature=0,
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1",
)

_EMPTY_SUMMARY: dict = {
    "summary": "",
    "skills": [],
    "experience_years": 0,
    "strengths": [],
    "gaps": [],
}

_EMPTY_REQUIREMENTS: dict = {
    "must_have": [],
    "nice_to_have": [],
    "experience_years": 0,
    "role_level": "",
    "domain": "",
}


# ── JSON parsing helpers ──────────────────────────────────────────────────────

def _strip_markdown_fences(text: str) -> str:
    """
    Remove markdown code fences that LLMs frequently wrap around JSON output.
    Handles both ```json ... ``` and ``` ... ``` forms.
    """
    stripped = re.sub(r"^```(?:json)?\s*\n?", "", text.strip(), flags=re.IGNORECASE)
    stripped = re.sub(r"\n?```\s*$", "", stripped)
    return stripped.strip()


def _parse_json_object(text: str) -> dict:
    """
    Extract the first JSON object from an LLM response string.
    Handles markdown-fenced responses before falling back to regex extraction.
    """
    cleaned = _strip_markdown_fences(text)

    # Try parsing the cleaned text directly first
    try:
        result = json.loads(cleaned)
        if isinstance(result, dict):
            return result
    except (json.JSONDecodeError, ValueError):
        pass

    # Fall back to greedy regex extraction (handles JSON embedded in prose)
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        return {}
    try:
        return json.loads(match.group())
    except json.JSONDecodeError:
        return {}


def _parse_json_list(text: str) -> list:
    """
    Extract the first JSON array from an LLM response string.
    Handles markdown-fenced responses before falling back to regex extraction.
    """
    cleaned = _strip_markdown_fences(text)

    # Try parsing the cleaned text directly first
    try:
        result = json.loads(cleaned)
        if isinstance(result, list):
            return result
    except (json.JSONDecodeError, ValueError):
        pass

    # Fall back to greedy regex extraction
    match = re.search(r"\[.*\]", cleaned, re.DOTALL)
    if not match:
        return []
    try:
        return json.loads(match.group())
    except json.JSONDecodeError:
        return []


def _coerce_score(value: object) -> float:
    """Safely convert a score value (possibly a string) to float."""
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


# ── Tool implementations ──────────────────────────────────────────────────────

def summarize_resume(resume_text: str) -> dict:
    """
    Extract structured information from resume text using Groq.
    Returns: {summary, skills, experience_years, strengths, gaps}
    """
    if not resume_text.strip():
        return dict(_EMPTY_SUMMARY)

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            (
                "You are a recruiter assistant. Extract structured information from "
                "the following resume. Return JSON with keys: summary (str), "
                "skills (list of str), experience_years (int), "
                "strengths (list of str), gaps (list of str)."
            ),
        ),
        ("human", "{resume_text}"),
    ])
    chain = prompt | llm
    response = chain.invoke({"resume_text": resume_text})
    text = response.content or ""
    parsed = _parse_json_object(text)
    if parsed:
        return {
            "summary": parsed.get("summary", ""),
            "skills": parsed.get("skills", []),
            "experience_years": int(_coerce_score(parsed.get("experience_years", 0))),
            "strengths": parsed.get("strengths", []),
            "gaps": parsed.get("gaps", []),
        }
    return {
        "summary": text,
        "skills": [],
        "experience_years": 0,
        "strengths": [],
        "gaps": [],
    }


def extract_requirements(jd: str) -> dict:
    """
    Parse a raw job description into structured must-have and nice-to-have requirements.
    Returns: {must_have, nice_to_have, experience_years, role_level, domain}
    """
    if not jd.strip():
        return dict(_EMPTY_REQUIREMENTS)

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            (
                "You are a job requirements analyst. Given a job description, extract "
                "structured requirements. Return JSON with keys: "
                "must_have (list of str — non-negotiable skills/qualifications), "
                "nice_to_have (list of str — preferred but optional), "
                "experience_years (int — minimum years required), "
                "role_level (str — Junior/Mid/Senior/Lead), "
                "domain (str — e.g. Backend Engineering, Data Science)."
            ),
        ),
        ("human", "{jd}"),
    ])
    chain = prompt | llm
    response = chain.invoke({"jd": jd})
    parsed = _parse_json_object(response.content or "")

    if not parsed:
        return dict(_EMPTY_REQUIREMENTS)

    # Return with safe defaults for every required key
    return {
        "must_have": parsed.get("must_have", []),
        "nice_to_have": parsed.get("nice_to_have", []),
        "experience_years": int(_coerce_score(parsed.get("experience_years", 0))),
        "role_level": parsed.get("role_level", ""),
        "domain": parsed.get("domain", ""),
    }


def compare_candidates(candidate_ids: list[str], requirements: dict) -> dict:
    """
    Score and compare multiple candidates head-to-head against the given requirements.
    Returns: {winner, candidates: {id: {must_have_score, nice_to_have_score, overall_score, reasoning}}, reasoning}
    """
    if not candidate_ids:
        return {"winner": "", "candidates": {}, "reasoning": ""}

    profiles: dict[str, str] = {}
    for cid in candidate_ids:
        try:
            profiles[cid] = read_resume_by_candidate_id(cid)
        except FileNotFoundError:
            profiles[cid] = ""

    profiles_text = "\n\n---\n\n".join(
        f"Candidate: {cid}\n{text}" for cid, text in profiles.items()
    )

    # NOTE: literal curly braces in the system prompt must be doubled ({{ }}) so
    # LangChain's template formatter does not treat them as input variables.
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            (
                "You are a senior recruiter. Compare the following candidates against "
                "the job requirements. For each candidate return a JSON object with: "
                "must_have_score (0.0-1.0), nice_to_have_score (0.0-1.0), "
                "overall_score (0.0-1.0), reasoning (str). "
                "Also return winner (candidate_id with highest overall_score). "
                "Return valid JSON: "
                "{{\"winner\": \"<id>\", \"candidates\": {{\"<id>\": {{\"must_have_score\": 0.0, "
                "\"nice_to_have_score\": 0.0, \"overall_score\": 0.0, \"reasoning\": \"\"}}}}, "
                "\"reasoning\": \"<overall reasoning>\"}}"
            ),
        ),
        ("human", "Requirements:\n{requirements}\n\nCandidates:\n{profiles}"),
    ])
    chain = prompt | llm
    response = chain.invoke({
        "requirements": str(requirements),
        "profiles": profiles_text,
    })

    parsed = _parse_json_object(response.content or "")
    if not parsed:
        return {"winner": candidate_ids[0], "candidates": {}, "reasoning": ""}

    # Normalize scores to float — LLMs sometimes return them as strings
    raw_candidates = parsed.get("candidates", {})
    normalized: dict[str, dict] = {}
    for cid, data in raw_candidates.items():
        normalized[cid] = {
            "must_have_score": _coerce_score(data.get("must_have_score", 0)),
            "nice_to_have_score": _coerce_score(data.get("nice_to_have_score", 0)),
            "overall_score": _coerce_score(data.get("overall_score", 0)),
            "reasoning": data.get("reasoning", ""),
        }

    return {
        "winner": parsed.get("winner", candidate_ids[0]),
        "candidates": normalized,
        "reasoning": parsed.get("reasoning", ""),
    }


def generate_interview_questions(candidate_id: str, requirements: dict) -> list[str]:
    """
    Generate 5 tailored screening questions based on a candidate's profile and gaps.
    """
    try:
        resume_text = read_resume_by_candidate_id(candidate_id)
    except FileNotFoundError:
        return ["Could not load resume for this candidate."]

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            (
                "You are a technical interviewer. Given a candidate's resume and job "
                "requirements, generate 5 targeted interview questions. "
                "Mix questions that probe strengths and questions that address gaps. "
                "Return a JSON list of exactly 5 question strings."
            ),
        ),
        ("human", "Requirements:\n{requirements}\n\nResume:\n{resume}"),
    ])
    chain = prompt | llm
    response = chain.invoke({
        "requirements": str(requirements),
        "resume": resume_text,
    })

    text = response.content or ""
    if not text.strip():
        return ["Unable to generate questions: empty response from LLM."]

    questions = _parse_json_list(text)
    if questions:
        return [str(q) for q in questions]

    # Last resort: return the raw text as a single item rather than silently
    # returning an empty list or a blank string
    return [text.strip()]

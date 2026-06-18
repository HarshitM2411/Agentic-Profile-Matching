"""RAG vector search tools — adapter over the RAG Profile Matching library."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

from tools.vendor_paths import configure_rag_environment

load_dotenv()

VECTOR_STORE_DIR = Path(os.getenv("VECTOR_STORE_DIR", "data/vector_store"))


def _import_rag_modules():
    configure_rag_environment()
    from job_matcher import match_jobs
    from resume_rag import build_vector_store as rag_build_vector_store

    return match_jobs, rag_build_vector_store


def _entry_to_agent_shape(entry: dict) -> dict:
    resume_path = entry.get("resume_path", "")
    path = Path(resume_path)
    excerpts = entry.get("relevant_excerpts") or []
    return {
        "candidate_id": path.stem,
        "file_path": resume_path,
        "score": float(entry.get("match_score", 0.0)),
        "text_chunk": excerpts[0] if excerpts else "",
    }


def _check_vector_store_ready() -> None:
    """Raise a clear RuntimeError if the vector store has not been built yet."""
    configure_rag_environment()
    try:
        from db_utils import get_chroma_collection

        collection = get_chroma_collection()
        if collection.count() == 0:
            raise RuntimeError(
                "Vector store is empty. Run build_vector_store('data/resumes') first."
            )
    except ImportError:
        pass


def build_vector_store(resume_dir: str) -> None:
    """
    One-time ingestion: chunk, embed, and persist resumes to ChromaDB.
    Delegates to the RAG Profile Matching project's ingestion pipeline.
    """
    _, rag_build_vector_store = _import_rag_modules()
    VECTOR_STORE_DIR.mkdir(parents=True, exist_ok=True)
    rag_build_vector_store(resume_dir)


def search_resumes(query: str, top_k: int = 10) -> list[dict]:
    """
    Search the vector store for the most relevant resumes.

    Returns a list of dicts: [{candidate_id, file_path, score, text_chunk}]

    Uses vector_only=True so results are ranked purely by semantic similarity
    and are not filtered by must-have skill metadata — this ensures up to top_k
    results are always returned regardless of corpus size.
    """
    _check_vector_store_ready()
    match_jobs, _ = _import_rag_modules()
    result = match_jobs(query, top_k=top_k, vector_only=True)
    return [_entry_to_agent_shape(entry) for entry in result.get("top_matches", [])]

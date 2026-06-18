"""Register sibling milestone repos on sys.path for library-style imports."""

from __future__ import annotations

import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
AIRTRIBE_ROOT = PROJECT_ROOT.parent

DEFAULT_RAG_LIBRARY = AIRTRIBE_ROOT / "airTribe RAG Project"
DEFAULT_RESUME_ANALYSER_LIBRARY = AIRTRIBE_ROOT / "airTribe LLM Project"

_rag_configured = False
_resume_analyser_configured = False


def _resolve_library_path(env_var: str, default: Path) -> Path:
    raw = os.getenv(env_var)
    if raw:
        path = Path(raw)
        if not path.is_absolute():
            path = (PROJECT_ROOT / path).resolve()
        else:
            path = path.resolve()
    else:
        path = default.resolve()
    return path


def _add_library_path(env_var: str, default: Path) -> Path:
    library_path = _resolve_library_path(env_var, default)
    if not library_path.is_dir():
        raise FileNotFoundError(
            f"Library path not found: {library_path}. "
            f"Clone the repo or set {env_var} in .env."
        )
    path_str = str(library_path)
    if path_str not in sys.path:
        sys.path.insert(0, path_str)
    return library_path


def configure_rag_environment() -> Path:
    """Expose the RAG milestone repo and align Chroma env vars with this project.

    Idempotent — safe to call multiple times per process.
    """
    global _rag_configured
    if _rag_configured:
        return _resolve_library_path("RAG_LIBRARY_PATH", DEFAULT_RAG_LIBRARY)

    library_path = _add_library_path("RAG_LIBRARY_PATH", DEFAULT_RAG_LIBRARY)

    if not os.getenv("CHROMA_PERSIST_DIR"):
        os.environ["CHROMA_PERSIST_DIR"] = os.getenv(
            "VECTOR_STORE_DIR",
            str(PROJECT_ROOT / "data" / "vector_store"),
        )
    if not os.getenv("CHROMA_COLLECTION_NAME"):
        os.environ["CHROMA_COLLECTION_NAME"] = "resumes"
    if not os.getenv("EMBEDDING_MODEL"):
        os.environ["EMBEDDING_MODEL"] = "sentence-transformers/all-MiniLM-L6-v2"

    _rag_configured = True
    return library_path


def configure_resume_analyser_environment() -> Path:
    """Expose the Resume Analyser milestone repo on sys.path.

    Idempotent — safe to call multiple times per process.
    """
    global _resume_analyser_configured
    if _resume_analyser_configured:
        return _resolve_library_path(
            "RESUME_ANALYSER_LIBRARY_PATH", DEFAULT_RESUME_ANALYSER_LIBRARY
        )

    library_path = _add_library_path(
        "RESUME_ANALYSER_LIBRARY_PATH",
        DEFAULT_RESUME_ANALYSER_LIBRARY,
    )
    _resume_analyser_configured = True
    return library_path

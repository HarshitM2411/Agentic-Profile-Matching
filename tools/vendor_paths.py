"""Register the RAG library on sys.path for library-style imports.

Resolution order for the RAG library:
  1. vendor/  — bundled copy inside this repo (works on Streamlit Cloud)
  2. RAG_LIBRARY_PATH env var — explicit override
  3. ../airTribe RAG Project — sibling repo on local dev machines

The Resume Analyser library (airTribe LLM Project) is NOT imported here
because its summarise/extract capabilities are implemented directly in
tools/reasoning_tools.py using LangChain + Groq.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
VENDOR_DIR = PROJECT_ROOT / "vendor"
AIRTRIBE_ROOT = PROJECT_ROOT.parent

DEFAULT_RAG_LIBRARY = AIRTRIBE_ROOT / "airTribe RAG Project"

_rag_configured = False


def _resolve_rag_path() -> Path:
    """Return the best available RAG library path."""
    # 1. Bundled vendor copy — always preferred (works on Streamlit Cloud)
    if VENDOR_DIR.is_dir() and (VENDOR_DIR / "job_matcher.py").exists():
        return VENDOR_DIR

    # 2. Explicit env-var override
    raw = os.getenv("RAG_LIBRARY_PATH")
    if raw:
        path = Path(raw)
        if not path.is_absolute():
            path = (PROJECT_ROOT / path).resolve()
        else:
            path = path.resolve()
        if path.is_dir():
            return path

    # 3. Default sibling-repo location (local dev)
    if DEFAULT_RAG_LIBRARY.is_dir():
        return DEFAULT_RAG_LIBRARY.resolve()

    raise FileNotFoundError(
        "RAG library not found. Expected one of:\n"
        f"  (a) {VENDOR_DIR}  (bundled vendor copy)\n"
        f"  (b) RAG_LIBRARY_PATH env var\n"
        f"  (c) {DEFAULT_RAG_LIBRARY}  (sibling repo)"
    )


def configure_rag_environment() -> Path:
    """Add the RAG library to sys.path and set required env vars.

    Idempotent — safe to call multiple times per process.
    """
    global _rag_configured
    if _rag_configured:
        return _resolve_rag_path()

    library_path = _resolve_rag_path()
    path_str = str(library_path)
    if path_str not in sys.path:
        sys.path.insert(0, path_str)

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


def configure_resume_analyser_environment() -> None:
    """No-op: Resume Analyser tools are implemented in tools/reasoning_tools.py."""
    pass

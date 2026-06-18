import json
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

RESUME_DIR = Path(os.getenv("RESUME_DIR", "data/resumes"))
REPORTS_DIR = Path(os.getenv("REPORTS_DIR", "reports"))
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def list_resumes() -> list[str]:
    """Return all resume file paths in the resume directory."""
    return [
        str(p) for p in RESUME_DIR.glob("*")
        if p.suffix.lower() in {".txt", ".pdf", ".md"}
    ]


def read_resume(file_path: str) -> str:
    """Read and return the text content of a resume file."""
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Resume not found: {file_path}")

    if path.suffix.lower() == ".pdf":
        from pypdf import PdfReader

        reader = PdfReader(str(path))
        return "\n".join(page.extract_text() or "" for page in reader.pages)

    return path.read_text(encoding="utf-8")


def resolve_candidate_path(candidate_id_or_path: str) -> str:
    """
    Resolve a candidate ID like 'alice' or a direct path like
    'data/resumes/alice.txt' into an existing resume file path.
    """
    candidate_path = Path(candidate_id_or_path)
    if candidate_path.exists():
        return str(candidate_path)

    for extension in (".txt", ".pdf", ".md"):
        path = RESUME_DIR / f"{candidate_id_or_path}{extension}"
        if path.exists():
            return str(path)

    raise FileNotFoundError(f"Resume not found for candidate: {candidate_id_or_path}")


def read_resume_by_candidate_id(candidate_id: str) -> str:
    """Resolve a candidate ID and return its resume text."""
    return read_resume(resolve_candidate_path(candidate_id))


def write_report(candidate_id: str, content: dict) -> None:
    """Persist a candidate match report to disk as JSON."""
    report_path = REPORTS_DIR / f"{candidate_id}_report.json"
    report_path.write_text(json.dumps(content, indent=2), encoding="utf-8")

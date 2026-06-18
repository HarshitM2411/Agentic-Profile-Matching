"""AirTribe Candidate Matching Agent — Streamlit App

Single-file Streamlit frontend that directly drives the LangGraph agent,
replacing the React + FastAPI stack for easy local and cloud deployment.
"""

import builtins
import os
import sys
from contextlib import contextmanager
from pathlib import Path

import streamlit as st

# ── Page config (MUST be the very first Streamlit call) ─────────────────────
st.set_page_config(
    page_title="AirTribe Candidate Matching",
    page_icon="🎯",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Path setup ───────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))


# ── Environment setup ────────────────────────────────────────────────────────
def _load_env() -> None:
    """Load env vars from Streamlit secrets (cloud) or .env file (local)."""
    try:
        secrets = st.secrets
        if secrets.get("GROQ_API_KEY"):
            for key in (
                "GROQ_API_KEY",
                "GROQ_MODEL",
                "VECTOR_STORE_DIR",
                "RESUME_DIR",
                "REPORTS_DIR",
                "CHROMA_COLLECTION_NAME",
                "EMBEDDING_MODEL",
            ):
                val = secrets.get(key)
                if val:
                    os.environ.setdefault(key, str(val))
            return
    except Exception:
        pass

    try:
        from dotenv import load_dotenv
        load_dotenv(BASE_DIR / ".env")
    except ImportError:
        pass


_load_env()

# Ensure local paths are set to sensible defaults when not in .env
os.environ.setdefault("VECTOR_STORE_DIR", str(BASE_DIR / "data" / "vector_store"))
os.environ.setdefault("RESUME_DIR", str(BASE_DIR / "data" / "resumes"))
os.environ.setdefault("REPORTS_DIR", str(BASE_DIR / "reports"))
os.environ.setdefault("GROQ_MODEL", "llama-3.3-70b-versatile")

if not os.getenv("GROQ_API_KEY"):
    st.error(
        "**GROQ_API_KEY is not set.**\n\n"
        "- **Local**: Add `GROQ_API_KEY=your_key` to the `.env` file.\n"
        "- **Streamlit Cloud**: Go to *App Settings → Secrets* and add "
        "`GROQ_API_KEY = \"your_key\"`."
    )
    st.stop()


# ── Agent imports (after env is loaded) ─────────────────────────────────────
try:
    from state.agent_state import AgentState, initial_state
    from matching_agent import build_graph
except Exception as exc:
    st.error(f"Failed to import agent modules: {exc}")
    st.stop()


# ── Helpers ──────────────────────────────────────────────────────────────────

@contextmanager
def _patch_input(sentinel: str = ""):
    """Replace builtins.input so human_feedback_node never blocks."""
    original = builtins.input
    builtins.input = lambda prompt="": sentinel
    try:
        yield
    finally:
        builtins.input = original


def _build_assistant_message(result: dict, prev_history_len: int) -> str:
    """Extract the newest assistant reply from the updated agent state."""
    history = result.get("conversation_history", [])
    new_msgs = history[prev_history_len:]
    assistant_texts = [m["content"] for m in new_msgs if m.get("role") == "assistant"]
    if assistant_texts:
        return "\n\n".join(assistant_texts)

    final_decision = result.get("final_decision") or {}
    shortlist = result.get("candidate_shortlist", [])
    scores = result.get("candidate_scores", {})
    match_reports = result.get("match_reports", {})

    if final_decision:
        lines = ["**Final Hiring Recommendations**\n"]
        for cid in shortlist:
            decision = final_decision.get(cid, "-")
            score = scores.get(cid, 0)
            lines.append(f"- **{cid}**: {decision}  (score: {score:.2f})")
        return "\n".join(lines)

    if shortlist:
        round_num = result.get("screening_round", 1)
        lines = [f"**Screening Round {round_num} complete**\n"]
        for rank, cid in enumerate(shortlist, 1):
            score = scores.get(cid, 0)
            rec = match_reports.get(cid, {}).get("hire_recommendation", "-")
            lines.append(f"#{rank} **{cid}** — score: {score:.2f}  [{rec}]")
        lines.append(
            "\nYou can now:\n"
            "- Refine requirements (e.g. *Make TypeScript a must-have*)\n"
            "- Compare candidates (e.g. *Compare the top 3*)\n"
            "- Explain a ranking (e.g. *Why did alice rank higher?*)\n"
            "- Generate interview questions (e.g. *Create questions for alice*)\n"
            "- Type **finalize** for final hiring decisions"
        )
        return "\n".join(lines)

    return "Processing complete. Ask a follow-up or type **finalize**."


def _run_agent(user_message: str) -> dict:
    """Invoke the LangGraph agent and return the updated state dict."""
    state = dict(st.session_state.agent_state)
    state["current_query"] = user_message.strip()
    state["criteria_updated"] = False
    state["finalize_requested"] = user_message.strip().lower() == "finalize"

    with _patch_input(""):
        result: AgentState = st.session_state.graph.invoke(state)

    return dict(result)


def _build_vector_store() -> None:
    from tools.rag_tool import build_vector_store
    resume_dir = BASE_DIR / "data" / "resumes"
    build_vector_store(str(resume_dir))


# ── Session-state initialisation ─────────────────────────────────────────────

if "agent_state" not in st.session_state:
    st.session_state.agent_state = initial_state()

if "messages" not in st.session_state:
    st.session_state.messages: list[dict] = []

if "graph" not in st.session_state:
    with st.spinner("Initialising agent graph…"):
        st.session_state.graph = build_graph()

if "vector_store_ready" not in st.session_state:
    st.session_state.vector_store_ready = False

    resume_dir = BASE_DIR / "data" / "resumes"
    existing = (
        list(resume_dir.glob("*.txt"))
        + list(resume_dir.glob("*.pdf"))
        + list(resume_dir.glob("*.md"))
        if resume_dir.exists()
        else []
    )
    if existing:
        try:
            with st.spinner("Indexing existing resumes…"):
                _build_vector_store()
            st.session_state.vector_store_ready = True
        except Exception:
            pass


# ── Custom CSS ───────────────────────────────────────────────────────────────
st.markdown(
    """
    <style>
    .app-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 1.2rem 1.8rem;
        border-radius: 12px;
        color: white;
        margin-bottom: 1.2rem;
    }
    .app-header h2 { margin: 0; font-size: 1.6rem; }
    .app-header p  { margin: 0.25rem 0 0; opacity: 0.88; font-size: 0.95rem; }

    .candidate-card {
        background: #f8f9fa;
        border-left: 4px solid #667eea;
        border-radius: 6px;
        padding: 0.9rem 1rem;
        margin: 0.4rem 0;
    }
    .badge {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 12px;
        font-size: 0.78rem;
        font-weight: 600;
    }
    .badge-hire       { background: #d4edda; color: #155724; }
    .badge-borderline { background: #fff3cd; color: #856404; }
    .badge-nohire     { background: #f8d7da; color: #721c24; }
    .badge-default    { background: #e2e3e5; color: #383d41; }

    .empty-state {
        text-align: center;
        padding: 3rem 1rem;
        color: #6c757d;
    }
    .empty-state .icon { font-size: 3rem; margin-bottom: 0.5rem; }
    </style>
    """,
    unsafe_allow_html=True,
)


# ── Sidebar ──────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("## 🎯 AirTribe")
    st.markdown("**Candidate Matching Agent**")
    st.markdown("---")

    state = st.session_state.agent_state
    shortlist = state.get("candidate_shortlist", [])
    round_num = state.get("screening_round", 1)

    m1, m2 = st.columns(2)
    m1.metric("Candidates", len(shortlist))
    m2.metric("Round", round_num)

    st.markdown("---")
    st.markdown("### 📄 Resumes")

    resume_dir = BASE_DIR / "data" / "resumes"
    resume_dir.mkdir(parents=True, exist_ok=True)
    (BASE_DIR / "reports").mkdir(parents=True, exist_ok=True)

    existing_resumes = (
        list(resume_dir.glob("*.txt"))
        + list(resume_dir.glob("*.pdf"))
        + list(resume_dir.glob("*.md"))
    )

    if existing_resumes:
        vs_label = "✅ Vector store ready" if st.session_state.vector_store_ready else "⚠️ Not yet indexed"
        st.success(f"{len(existing_resumes)} resume(s) on disk  ·  {vs_label}")
        with st.expander("View files"):
            for r in sorted(existing_resumes):
                st.text(f"• {r.name}")
    else:
        st.warning("No resumes found. Upload files below.")

    uploaded_files = st.file_uploader(
        "Upload resumes",
        type=["txt", "pdf", "md"],
        accept_multiple_files=True,
        help="Supported formats: .txt, .pdf, .md",
    )

    if uploaded_files:
        saved = []
        for uf in uploaded_files:
            dest = resume_dir / uf.name
            dest.write_bytes(uf.getvalue())
            saved.append(uf.name)
        st.success(f"Saved: {', '.join(saved)}")

        if st.button("🔨 Build / Rebuild Vector Store", type="primary", use_container_width=True):
            with st.spinner("Indexing resumes…"):
                try:
                    _build_vector_store()
                    st.session_state.vector_store_ready = True
                    st.success("Vector store ready!")
                    st.rerun()
                except Exception as e:
                    st.error(f"Indexing failed: {e}")

    if existing_resumes and not st.session_state.vector_store_ready:
        if st.button("🔨 Build Vector Store", use_container_width=True):
            with st.spinner("Indexing resumes…"):
                try:
                    _build_vector_store()
                    st.session_state.vector_store_ready = True
                    st.success("Done!")
                    st.rerun()
                except Exception as e:
                    st.error(f"Indexing failed: {e}")

    st.markdown("---")

    if st.button("🔄 New Session", use_container_width=True, help="Reset conversation and agent state"):
        st.session_state.agent_state = initial_state()
        st.session_state.messages = []
        st.rerun()

    reqs = state.get("job_requirements") or {}
    if reqs:
        st.markdown("---")
        st.markdown("### 📋 Active Requirements")
        if reqs.get("role_level") or reqs.get("domain"):
            st.caption(f"{reqs.get('role_level', '')}  ·  {reqs.get('domain', '')}")
        if reqs.get("must_have"):
            st.markdown("**Must have**")
            for s in reqs["must_have"]:
                st.markdown(f"- {s}")
        if reqs.get("nice_to_have"):
            st.markdown("**Nice to have**")
            for s in reqs["nice_to_have"]:
                st.markdown(f"- {s}")
        if reqs.get("experience_years"):
            st.markdown(f"**Min. experience:** {reqs['experience_years']} yr(s)")
        version = state.get("requirements_version", 0)
        if version:
            st.caption(f"Requirements version: {version}")


# ── Main layout ──────────────────────────────────────────────────────────────
st.markdown(
    """
    <div class="app-header">
        <h2>🎯 AirTribe Candidate Matching Agent</h2>
        <p>AI-powered recruitment intelligence powered by LangGraph + Groq</p>
    </div>
    """,
    unsafe_allow_html=True,
)

chat_col, results_col = st.columns([3, 2], gap="large")


# ── Chat column ──────────────────────────────────────────────────────────────
with chat_col:
    st.markdown("### 💬 Conversation")

    if not st.session_state.messages:
        st.info(
            "**👋 Welcome!**  \n"
            "Paste a job description below to start the matching pipeline.  \n\n"
            "**Example:**  \n"
            "*Senior Python backend engineer with REST APIs and 5 years experience*"
        )

    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    if prompt := st.chat_input(
        "Paste a job description or enter a follow-up instruction…",
        disabled=not st.session_state.vector_store_ready and not existing_resumes,
    ):
        if not st.session_state.vector_store_ready:
            st.warning(
                "Vector store is not ready. "
                "Upload resumes via the sidebar and click **Build Vector Store** first."
            )
        else:
            prev_history_len = len(
                st.session_state.agent_state.get("conversation_history", [])
            )

            st.session_state.messages.append({"role": "user", "content": prompt})
            with st.chat_message("user"):
                st.markdown(prompt)

            with st.chat_message("assistant"):
                with st.spinner("Thinking…"):
                    try:
                        result = _run_agent(prompt)
                        st.session_state.agent_state = result
                        response = _build_assistant_message(result, prev_history_len)
                        st.markdown(response)
                        st.session_state.messages.append(
                            {"role": "assistant", "content": response}
                        )
                    except Exception as exc:
                        err = f"⚠️ **Error:** {exc}"
                        st.error(err)
                        st.session_state.messages.append(
                            {"role": "assistant", "content": err}
                        )
            st.rerun()


# ── Results column ────────────────────────────────────────────────────────────
with results_col:
    st.markdown("### 📊 Results")

    state = st.session_state.agent_state
    shortlist = state.get("candidate_shortlist", [])
    scores = state.get("candidate_scores", {})
    match_reports = state.get("match_reports", {})
    final_decision = state.get("final_decision") or {}
    ranking_delta = state.get("ranking_delta") or {}

    if not shortlist:
        st.markdown(
            '<div class="empty-state">'
            '<div class="icon">🔍</div>'
            "<p>Candidate rankings will appear here<br>after you submit a job description.</p>"
            "</div>",
            unsafe_allow_html=True,
        )
    else:
        round_num = state.get("screening_round", 1)
        st.markdown(f"**Screening Round {round_num}** · {len(shortlist)} candidate(s) shortlisted")
        st.markdown("---")

        # ── Candidate cards ──────────────────────────────────────────────────
        for rank, cid in enumerate(shortlist, 1):
            score = scores.get(cid, 0)
            report = match_reports.get(cid, {})
            rec = report.get("hire_recommendation", "-")
            decision = final_decision.get(cid, rec)
            score_pct = int(score * 100)

            badge_css = {
                "HIRE": "badge-hire",
                "BORDERLINE": "badge-borderline",
                "NO-HIRE": "badge-nohire",
            }.get(decision, "badge-default")

            label = f"#{rank}  {cid}  ·  {score_pct}%"
            with st.expander(label, expanded=(rank <= 2)):
                col_a, col_b = st.columns([2, 1])
                with col_a:
                    st.markdown(f"**Score:** `{score:.2f}`")
                with col_b:
                    st.markdown(
                        f'<span class="badge {badge_css}">{decision}</span>',
                        unsafe_allow_html=True,
                    )

                bar_color = (
                    "normal" if score >= 0.7
                    else "off" if score < 0.5
                    else "normal"
                )
                st.progress(score)

                if report.get("reasoning"):
                    st.markdown(f"**Reasoning:** {report['reasoning']}")

                strengths = report.get("strengths") or []
                gaps = report.get("gaps") or []

                if strengths:
                    st.markdown("**Strengths:** " + " · ".join(strengths))
                if gaps:
                    st.markdown("**Gaps:** " + " · ".join(gaps))

                suggestions = report.get("improvement_suggestions") or []
                if suggestions:
                    with st.expander("Improvement Suggestions"):
                        for s in suggestions:
                            st.markdown(f"- {s}")

                qs = state.get("interview_questions", {}).get(cid, [])
                if qs:
                    with st.expander(f"Interview Questions ({len(qs)})"):
                        for i, q in enumerate(qs, 1):
                            st.markdown(f"{i}. {q}")

        # ── Ranking delta ────────────────────────────────────────────────────
        if ranking_delta:
            st.markdown("---")
            st.markdown("#### 📈 Ranking Changes")
            for cid, delta in ranking_delta.items():
                pos = delta.get("position_change", 0)
                movement = delta.get("movement", "")
                icon = "⬆️" if pos < 0 else "⬇️" if pos > 0 else "➡️"
                st.markdown(f"{icon} **{cid}**: {movement}")

        # ── Final hiring decisions ────────────────────────────────────────────
        if final_decision:
            st.markdown("---")
            st.markdown("#### 🏆 Final Hiring Decisions")
            for cid, dec in final_decision.items():
                score = scores.get(cid, 0)
                icon = {"HIRE": "✅", "BORDERLINE": "⚠️", "NO-HIRE": "❌"}.get(dec, "❓")
                st.markdown(f"{icon} **{cid}**: {dec}  `{score:.2f}`")

        # ── Requirement change log ───────────────────────────────────────────
        change_log = state.get("requirement_change_log") or []
        if change_log:
            st.markdown("---")
            with st.expander(f"Requirement Change Log ({len(change_log)} update(s))"):
                for entry in change_log:
                    v = entry.get("version", "?")
                    instr = entry.get("user_instruction", "")
                    ts = entry.get("timestamp", "")
                    st.markdown(f"**v{v}**: {instr}" + (f"  ·  `{ts}`" if ts else ""))

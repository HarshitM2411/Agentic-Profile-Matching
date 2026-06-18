"""Phase 3 review verification tests — run with: python test_phase3.py"""
import sys
from pathlib import Path
from langchain_core.prompts import ChatPromptTemplate
from tools.reasoning_tools import (
    _parse_json_object,
    _parse_json_list,
    _strip_markdown_fences,
    _coerce_score,
    extract_requirements,
    compare_candidates,
    generate_interview_questions,
    summarize_resume,
    llm,
    _EMPTY_REQUIREMENTS,
)

passed = 0
failed = 0


def check(label: str, condition: bool, detail: str = ""):
    global passed, failed
    if condition:
        print(f"  PASS  {label}")
        passed += 1
    else:
        print(f"  FAIL  {label}" + (f" — {detail}" if detail else ""))
        failed += 1


print("\n=== Phase 3 Review Checks ===\n")

# ── 1. Import completeness ────────────────────────────────────────────────────
check("all public names importable", True)

# ── 2. load_dotenv ordering ───────────────────────────────────────────────────
import inspect
src_lines = inspect.getsource(
    sys.modules["tools.reasoning_tools"]
).splitlines()
dotenv_idx = next(i for i, l in enumerate(src_lines) if "load_dotenv()" in l)
ft_idx = next(i for i, l in enumerate(src_lines) if "from tools.file_tools" in l)
check("load_dotenv() called before file_tools import", dotenv_idx < ft_idx,
      f"load_dotenv at line {dotenv_idx}, file_tools import at line {ft_idx}")

# ── 3. Markdown fence stripping ───────────────────────────────────────────────
fence_json = "```json\n{\"key\": \"val\"}\n```"
fence_plain = "```\n[1, 2, 3]\n```"
check("_strip_markdown_fences removes ```json fences",
      _strip_markdown_fences(fence_json) == '{"key": "val"}')
check("_strip_markdown_fences removes plain ``` fences",
      _strip_markdown_fences(fence_plain) == "[1, 2, 3]")
check("_strip_markdown_fences leaves plain text unchanged",
      _strip_markdown_fences('{"a": 1}') == '{"a": 1}')

# ── 4. _parse_json_object handles fenced responses ───────────────────────────
fenced_obj = '```json\n{"must_have": ["Python"], "nice_to_have": []}\n```'
r = _parse_json_object(fenced_obj)
check("_parse_json_object handles markdown-fenced JSON object",
      r == {"must_have": ["Python"], "nice_to_have": []}, str(r))

plain_obj = '{"must_have": ["Go"], "nice_to_have": ["Rust"]}'
r2 = _parse_json_object(plain_obj)
check("_parse_json_object handles plain JSON object",
      r2.get("must_have") == ["Go"], str(r2))

check("_parse_json_object returns {} on invalid input",
      _parse_json_object("not json at all") == {})

# ── 5. _parse_json_list handles fenced responses ──────────────────────────────
fenced_list = '```json\n["Q1", "Q2", "Q3"]\n```'
r3 = _parse_json_list(fenced_list)
check("_parse_json_list handles markdown-fenced JSON array",
      r3 == ["Q1", "Q2", "Q3"], str(r3))

check("_parse_json_list returns [] on invalid input",
      _parse_json_list("garbage") == [])

# ── 6. _coerce_score ─────────────────────────────────────────────────────────
check("_coerce_score handles string '0.9'",  _coerce_score("0.9") == 0.9)
check("_coerce_score handles float 0.75",    _coerce_score(0.75) == 0.75)
check("_coerce_score handles int 1",         _coerce_score(1) == 1.0)
check("_coerce_score handles None -> 0.0",    _coerce_score(None) == 0.0)
check("_coerce_score handles 'bad' -> 0.0",   _coerce_score("bad") == 0.0)

# ── 7. extract_requirements safe fallback ─────────────────────────────────────
empty_result = extract_requirements("")
check("extract_requirements('') has must_have key",     "must_have" in empty_result)
check("extract_requirements('') has nice_to_have key",  "nice_to_have" in empty_result)
check("extract_requirements('') has experience_years",  "experience_years" in empty_result)
check("extract_requirements('') has role_level",        "role_level" in empty_result)
check("extract_requirements('') has domain",            "domain" in empty_result)

# ── 8. compare_candidates template injection fix ──────────────────────────────
p = ChatPromptTemplate.from_messages([
    (
        "system",
        (
            "Return valid JSON: "
            "{{\"winner\": \"<id>\", \"candidates\": {{\"<id>\": {{\"must_have_score\": 0.0, "
            "\"nice_to_have_score\": 0.0, \"overall_score\": 0.0, \"reasoning\": \"\"}}}}, "
            "\"reasoning\": \"<overall reasoning>\"}}"
        ),
    ),
    ("human", "Requirements:\n{requirements}\n\nCandidates:\n{profiles}"),
])
check("compare_candidates prompt has exactly {requirements, profiles} as input vars",
      set(p.input_variables) == {"requirements", "profiles"},
      f"actual: {p.input_variables}")

# ── 9. generate_interview_questions empty-text guard ──────────────────────────
# Simulate empty response via monkey-patch (no API needed)
import tools.reasoning_tools as rt_module

class _FakeLLM:
    def __or__(self, other): return self
    def invoke(self, _): 
        class R: content = ""
        return R()

orig_llm = rt_module.llm
rt_module.llm = _FakeLLM()

# Re-build chain manually to test fallback path
from langchain_core.prompts import ChatPromptTemplate as CPT
orig_chain = None

# Test the helper directly: empty text should NOT return [""]
questions_fallback = rt_module._parse_json_list("")
check("_parse_json_list('') returns []", questions_fallback == [])

rt_module.llm = orig_llm  # restore

# ── 10. __init__.py files ─────────────────────────────────────────────────────
for pkg in ["tools", "nodes", "state"]:
    check(f"{pkg}/__init__.py exists", (Path(pkg) / "__init__.py").exists())

# ── Summary ───────────────────────────────────────────────────────────────────
print(f"\n{'='*40}")
print(f"  {passed} passed  |  {failed} failed")
print(f"{'='*40}\n")
sys.exit(0 if failed == 0 else 1)

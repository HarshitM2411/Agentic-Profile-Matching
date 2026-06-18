# Frontend Design Prompt — AirTribe Match Agent

Use this document to generate UI designs in **Google Stitch**, Figma AI, v0, or similar tools, and as a reference when building the frontend against the LangGraph agent backend.

---

## Quick Copy — Google Stitch (Full Prompt)

Copy everything inside the block below and paste it into Google Stitch:

```
Design a modern conversational recruitment intelligence platform called "AirTribe Match Agent" — tagline: "Hire with clarity, not guesswork."

PRODUCT: An AI co-pilot for hiring managers that parses job descriptions, searches 100+ resumes, ranks candidates through a 3-round screening funnel (100 → Top 10 → Deep Analysis → Hire/No-Hire), and explains every decision in plain language. Users interact via natural language chat and can adjust requirements mid-conversation to trigger re-ranking with visible before/after changes.

USER: Hiring manager screening for Senior Frontend Engineer (React, TypeScript, 3+ years).

VISUAL STYLE: Soft dark mode, warm accent (coral or teal), Inter/Geist typography, professional but friendly. Split layout: left 30% conversation thread, right 70% dynamic "insight canvas" that updates based on chat. Subtle animations when rankings reshuffle.

SCREENS TO GENERATE (interactive prototype):

1. EMPTY STATE — Welcome hero: "Paste a job description or tell me what you're hiring for." Large input, drag-drop JD upload, example chips: "Find React devs with 3+ years", "Compare top 3", "Why did John rank higher than Jane?"

2. MAIN WORKSPACE — Left: chat with rich agent responses, collapsible thinking-step pills (Parse JD → Extract Requirements → Search → Rank → Report), quick-action chips. Right insight canvas with: (a) Job Requirements card — must-have vs nice-to-have editable tags, (b) Screening Funnel visualization — 100 resumes → Top 10 → Deep Dive → Final Verdict with candidate avatars, (c) Candidate Leaderboard — match score rings, expand for strengths/gaps/suggestions, "Generate interview questions" per candidate, (d) Compare Mode — side-by-side 2-3 candidates with radar chart and "why X ranked higher" callout.

3. EXPLAINABILITY PANEL — Match report: score breakdown bars, resume evidence snippets, before/after diff when requirements change, coaching suggestions for borderline candidates.

4. ITERATIVE REFINEMENT MOMENT — User: "Make TypeScript a must-have." Show animated re-rank, agent explains who moved up/down and why, toast: "Rankings updated."

5. FINAL RECOMMENDATION — Top candidate hero card, Hire/No-Hire badge, confidence meter, Export report / Copy interview questions / New search.

MOCK DATA: John Doe 92% (React, TS, 5yr), Jane Smith 78% (React, Vue, 4yr, no TS), Alex Kumar 71% (React, 2yr borderline). Must-haves: React, 3+ years. Nice-to-haves: TypeScript, Next.js.

CHAT FLOW: Find React candidates → show top 10 + funnel → Compare top 3 → Why John > Jane → Make TypeScript must-have → re-rank with diff → final hire recommendation.

COMPONENTS: Match score rings, editable skill chips, candidate cards (compact/expanded), agent timeline, funnel stages, strength/gap blocks, compare radar chart, ranking-diff badges, chat messages with embedded mini-widgets.

AVOID: Generic table-only ATS. DO: Visual explainability, living workflow timeline, funnel as hero metaphor, every ranking inspectable. Desktop-first 1440px. Mood: intelligent, transparent, collaborative, trustworthy, slightly futuristic.

Deliver a clickable multi-screen prototype with empty state → workspace → compare → explainability → final recommendation, including interactive re-rank state.
```

---

## Quick Copy — Google Stitch (Short Prompt)

Use this if Stitch has a character limit:

```
AirTribe Match Agent — AI recruitment co-pilot. Dark mode, coral/teal accent. Split UI: left chat (natural language hiring queries), right dynamic canvas (JD requirements tags, 3-round screening funnel 100→10→final, ranked candidate cards with match scores, compare view, explainability panel). Interactive re-rank when user changes must-haves. Screens: empty state, main workspace, compare top 3, why X ranked higher, final hire recommendation. Not a boring ATS — visual, transparent, conversational. Desktop 1440px.
```

---

## Product Context

### What we're building

An **AI-powered candidate matching agent** for recruitment. The backend (LangGraph) handles:

- Parsing job descriptions and extracting must-have vs nice-to-have requirements
- RAG search across 100+ resumes
- Multi-round screening: broad search → deep analysis → hire/no-hire recommendation
- Explainable match reports with strengths, gaps, and improvement suggestions
- Human-in-the-loop feedback — users can refine criteria mid-conversation and see rankings update

### Who it's for

Recruiters and hiring managers who need fast, transparent, adjustable candidate screening — not another opaque ATS table.

### Core user stories

| Story | Example query |
|-------|---------------|
| New search | "Find me candidates with React and 3+ years experience" |
| Compare | "Compare the top 3 matches side by side" |
| Explain | "Why did John rank higher than Jane?" |
| Refine | "Actually, TypeScript is a must-have — re-rank" |
| Screen deeper | "Run deep analysis on the top 10" |
| Interview prep | "Create screening questions for John" |
| Finalize | "Give me the final hire recommendation" |

---

## Design Principles

1. **Conversational first** — Chat is the primary input; the canvas reacts to it.
2. **Explainability by design** — Every score is inspectable with evidence, not a black box.
3. **Human-in-the-loop** — The agent proposes; the user refines. Show what changed and why.
4. **Progressive disclosure** — Start simple (chat + shortlist), expand into compare/report/final views.
5. **Stateful continuity** — The UI reflects session memory: prior rankings, requirement versions, screening round.

---

## Visual Direction

| Attribute | Direction |
|-----------|-----------|
| Theme | Soft dark mode (not pure black) |
| Accent | Coral `#FF6B4A` or electric teal `#2DD4BF` — pick one, use consistently |
| Typography | Inter, Geist, or similar modern sans-serif |
| Layout | Split-pane: chat (30%) + insight canvas (70%) |
| Density | Comfortable — recruiter tool, not a data grid |
| Motion | Subtle: ranking reshuffle, funnel stage advance, panel slide-overs |
| Personality | Professional co-pilot — confident, transparent, slightly futuristic |
| Breakpoint | Desktop-first at 1440px; tablet-friendly collapse to stacked layout |

**Avoid:** Generic corporate ATS tables, all-white dashboards, walls of unformatted text.

**Embrace:** Funnel metaphor, score rings, inline evidence quotes, before/after ranking diffs.

---

## Screen Specifications

### Screen 1 — Empty State / Onboarding

**Goal:** Get the user into their first search in under 10 seconds.

**Elements:**
- Hero headline: *"Paste a job description or tell me what you're hiring for."*
- Large text input + send button
- Drag-and-drop zone for JD file upload (`.txt`, `.pdf`)
- Suggestion chips (clickable):
  - "Find React devs with 3+ years"
  - "Compare top 3 candidates"
  - "Why did John rank higher than Jane?"
- Light illustration: resumes flowing into a screening funnel

**Empty state copy:** *"I'll parse your JD, search resumes, rank matches, and explain every decision."*

---

### Screen 2 — Main Workspace (Primary View)

**Goal:** Unified hub for chat + live screening results.

#### Left panel — Conversation (30%)

- Scrollable message thread (user + agent)
- Agent messages support rich embeds (mini leaderboard, requirement tags, funnel status)
- Collapsible **agent thinking steps** as horizontal pills:
  `Parse JD` → `Extract Requirements` → `Search Resumes` → `Rank` → `Generate Report`
- Persistent chat input at bottom with send + attachment icons
- Quick-action chips below agent replies:
  - "Add TypeScript as must-have"
  - "Compare top 3"
  - "Show interview questions"

#### Right panel — Insight Canvas (70%)

Tabbed or stacked modules that update based on conversation intent:

**A. Job Requirements Card**
- Must-have tags (red/strong) — editable inline
- Nice-to-have tags (muted) — editable inline
- Experience level + role domain
- Version badge: `Requirements v2` when user refines criteria

**B. Screening Funnel (hero visualization)**
```
Round 1: Broad Search     →  100 resumes scanned  →  Top 10 shortlisted
Round 2: Deep Analysis    →  Top 10 evaluated     →  Ranked with scores
Round 3: Final Verdict    →  Holistic review      →  Hire / No-Hire
```
- Active round highlighted; completed rounds show checkmarks
- Candidate avatars animate through funnel stages

**C. Candidate Leaderboard**
- Ranked rows: `#1 John Doe — 92%`
- Match score ring (circular progress)
- Top 3 skills as chips
- Expand row → strengths (green), gaps (amber), borderline suggestions
- Per-row actions: `View Report` | `Interview Questions` | `Compare`

**D. Compare Mode** (activated by chat or button)
- 2–3 candidate cards side by side
- Radar/spider chart: skills vs JD requirements
- Highlighted callout: *"John ranks higher because TypeScript is a must-have match"*

---

### Screen 3 — Explainability Panel (Slide-over or Modal)

**Triggered by:** "Why did John rank higher than Jane?" or `View Report` on a candidate.

**Sections:**
1. **Overall match score** — large ring + numeric (e.g., 87%)
2. **Score breakdown** — horizontal bars:
   - Must-haves met
   - Nice-to-haves met
   - Experience fit
   - Domain alignment
3. **Evidence snippets** — quoted resume lines with highlights
4. **Strengths** — bullet list with green indicators
5. **Gaps** — bullet list with amber indicators
6. **Improvement suggestions** — coaching tone for borderline candidates
7. **Ranking change diff** (when requirements were updated):
   - Before: `#2 Jane Smith — 78%`
   - After: `#5 Jane Smith — 61%`
   - Reason: *"TypeScript moved to must-have; Jane has no TS experience"*

---

### Screen 4 — Iterative Refinement Moment

**Triggered by:** User edits a requirement tag or types a refine query.

**UI behavior:**
1. Requirement tag animates from nice-to-have → must-have
2. Canvas shows loading: *"Re-ranking candidates…"*
3. Leaderboard animates position changes (cards swap)
4. Agent message summarizes changes:
   - "3 candidates dropped out of top 10"
   - "Jane: #2 → #5 (missing TypeScript)"
   - "John: stays #1 (full match)"
5. Toast notification: *"Rankings updated based on your new criteria"*

---

### Screen 5 — Final Recommendation

**Triggered by:** "Give me the final recommendation" after Round 3.

**Elements:**
- Hero card for top candidate (photo, name, score, role)
- **Hire / No-Hire / Borderline** badge with confidence meter
- Summary paragraph from agent
- Secondary list: remaining candidates with verdicts
- Actions:
  - Export Match Report (PDF)
  - Copy Interview Questions
  - Start New Search

---

## Component Library

| Component | States | Notes |
|-----------|--------|-------|
| `ChatMessage` | user, agent, system | Agent variant supports embedded widgets |
| `ThinkingStepPill` | pending, active, complete | Horizontal timeline in chat |
| `RequirementTag` | must-have, nice-to-have, editable | Click to toggle category |
| `MatchScoreRing` | 0–100% | Color: green >80, amber 60–80, red <60 |
| `CandidateCard` | compact, expanded, selected | Avatar, name, score, skills |
| `FunnelStage` | idle, active, complete | Part of funnel visualization |
| `RankingDeltaBadge` | up, down, unchanged | e.g., `↑2` or `↓3` |
| `StrengthGapList` | — | Green/amber bullet blocks |
| `CompareRadarChart` | 2–3 candidates | Skills vs JD overlay |
| `EvidenceQuote` | — | Resume snippet with highlight |
| `HireVerdictBadge` | HIRE, NO-HIRE, BORDERLINE | Final round only |
| `QuickActionChip` | — | Below agent messages |
| `ScreeningRoundIndicator` | 1, 2, 3 | Top of insight canvas |

---

## Mock Data for Prototypes

### Job description

**Role:** Senior Frontend Engineer
**Must-haves:** React, JavaScript, 3+ years experience
**Nice-to-haves:** TypeScript, Next.js, unit testing
**Domain:** Frontend Engineering
**Level:** Senior

### Candidates

| Rank | Name | Score | Skills | Notes |
|------|------|-------|--------|-------|
| 1 | John Doe | 92% | React, TypeScript, Next.js, 5 yrs | Full match |
| 2 | Jane Smith | 78% | React, Vue, 4 yrs | No TypeScript |
| 3 | Alex Kumar | 71% | React, JavaScript, 2 yrs | Borderline experience |
| 4 | Priya Nair | 68% | Angular, React, 6 yrs | Wrong primary framework |
| 5 | Sam Wilson | 55% | React, 1 yr | Junior profile |

### Sample conversation flow

```
User:   "Find me candidates with React and 3+ years experience"
Agent:  [Shows Round 1 complete, top 10 leaderboard, funnel at stage 1]

User:   "Compare the top 3 matches side by side"
Agent:  [Opens compare mode with radar chart]

User:   "Why did John rank higher than Jane?"
Agent:  [Opens explainability panel for John vs Jane]

User:   "Make TypeScript a must-have, not optional"
Agent:  [Re-ranks with delta animation; Jane drops to #5]

User:   "Create screening questions for John"
Agent:  [Shows 5 tailored interview questions in chat embed]

User:   "Give me the final recommendation"
Agent:  [Round 3 complete → Hire verdict for John Doe]
```

---

## Backend Data Mapping

Map UI components to `AgentState` fields from the LangGraph backend:

| UI element | Backend field |
|------------|---------------|
| Chat history | `conversation_history` |
| Requirements tags | `job_requirements` (must_have, nice_to_have, role_level, domain) |
| Requirements version badge | `requirements_version` |
| Change log / diff | `requirement_change_log`, `ranking_delta` |
| Leaderboard order | `candidate_shortlist` |
| Match scores | `candidate_scores` |
| Per-candidate explanation | `reasoning` |
| Before/after rankings | `previous_shortlist`, `previous_scores` |
| Full reports | `match_reports` |
| Interview questions | `interview_questions` |
| Funnel stage | `screening_round` (1, 2, 3) |
| Final verdict | `final_decision` |
| Current user intent | `current_intent` |

### Intent → UI response

| Intent | UI should show |
|--------|----------------|
| `new_search` | Funnel reset, new requirements card, Round 1 results |
| `refine_requirements` | Editable tags, re-rank animation, ranking delta |
| `compare_candidates` | Compare mode with side-by-side cards |
| `explain_ranking` | Explainability panel with evidence |
| `generate_questions` | Interview questions embed in chat |
| `finalize` | Final recommendation screen |

---

## Screen-by-Screen Stitch Prompts

Generate one screen at a time if full-prompt output is too broad.

### Prompt — Empty State

```
Design an empty state for "AirTribe Match Agent" — a dark-mode AI recruitment tool. Centered welcome: "Paste a job description or tell me what you're hiring for." Include a large chat input, drag-drop JD upload zone, and 3 suggestion chips. Minimal funnel illustration in background. Accent color coral. Desktop 1440px. Clean, modern, inviting.
```

### Prompt — Main Workspace

```
Design the main workspace for AirTribe Match Agent. Split layout: left 30% dark chat panel with agent thinking-step pills and message thread; right 70% insight canvas with (1) editable must-have/nice-to-have requirement tags, (2) 3-round screening funnel visualization, (3) ranked candidate leaderboard with circular match scores. Dark mode, coral accent, Inter font. Show populated state with 5 frontend engineer candidates.
```

### Prompt — Compare View

```
Design a candidate comparison view for a recruitment AI tool. Three candidates side by side (John 92%, Jane 78%, Alex 71%) with radar chart comparing React/TypeScript/experience skills vs job requirements. Dark mode, coral highlights. Include "Why John ranks higher" callout box with evidence. Professional, data-rich but readable.
```

### Prompt — Explainability Panel

```
Design a slide-over explainability panel for an AI hiring tool. Shows candidate John Doe 92% match with score breakdown bars (must-haves, nice-to-haves, experience), green strength bullets, amber gap bullets, highlighted resume quote evidence, and a before/after ranking diff section. Dark mode, coral accent. Coaching tone for borderline suggestions.
```

### Prompt — Final Recommendation

```
Design a final hire recommendation screen for AirTribe Match Agent. Hero card for top candidate John Doe with 92% score, large HIRE badge, confidence meter, summary paragraph. Secondary list of other candidates with NO-HIRE/BORDERLINE badges. Action buttons: Export Report, Copy Questions, New Search. Dark mode, celebratory but professional. Coral accent.
```

---

## Implementation Notes (for frontend developers)

When building the real UI against the Python/LangGraph backend:

- **Interface:** REST API or WebSocket/SSE for streaming agent responses
- **State:** Mirror `AgentState` in client state (React Context, Zustand, etc.)
- **Chat:** Support multi-turn without re-sending full context — backend maintains session
- **Re-rank UX:** Optimistic UI for requirement tag edits; show `ranking_delta` when response arrives
- **Screening rounds:** Disable "Finalize" until `screening_round === 3` or user explicitly requests early final
- **Accessibility:** Score rings need text alternatives; color alone must not convey hire/no-hire

---

## References

- [problemStatement.md](./problemStatement.md) — Assignment requirements (Parts A, B, C)
- [context.md](./context.md) — Product context and evaluation criteria
- [architecture.md](./architecture.md) — Agent state schema, intents, graph flow
- [implementation.md](./implementation.md) — Backend implementation guide

import type {
  AgentState,
  CanvasView,
  Candidate,
  ChatMessage,
  Intent,
  JobRequirements,
  MatchReport,
  RankingDelta,
  Verdict,
} from '../types/agent'
import { THINKING_STEPS } from '../data/uiConstants'

/** Raw snake_case state returned by the FastAPI backend. */
export interface BackendAgentState {
  conversation_history?: { role: string; content: string }[]
  current_query?: string
  current_intent?: string
  raw_jd?: string
  job_requirements?: Partial<JobRequirements>
  requirements_version?: number
  candidate_shortlist?: string[]
  candidate_scores?: Record<string, number>
  reasoning?: Record<string, string>
  ranking_delta?: Record<string, BackendRankingDelta>
  match_reports?: Record<string, BackendMatchReport>
  interview_questions?: Record<string, string[]>
  screening_round?: number
  final_decision?: Record<string, string> | null
}

interface BackendRankingDelta {
  previous_position?: number | null
  current_position?: number | null
  movement?: string
  score_change?: number | null
  reason?: string
}

interface BackendMatchReport {
  overall_score?: number
  strengths?: string[]
  gaps?: string[]
  improvement_suggestions?: string[]
  hire_recommendation?: string
  reasoning?: string
  must_have_coverage?: string[]
}

export function formatCandidateId(id: string): string {
  const base = id.replace(/^resume_/, '').replace(/\.(txt|pdf|md)$/i, '')
  return base
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function emptyRequirements(): JobRequirements {
  return { must_have: [], nice_to_have: [], role_level: '', domain: '' }
}

function mapRequirements(raw?: Partial<JobRequirements>): JobRequirements {
  if (!raw || Object.keys(raw).length === 0) return emptyRequirements()
  return {
    must_have: raw.must_have ?? [],
    nice_to_have: raw.nice_to_have ?? [],
    role_level: raw.role_level ?? '',
    domain: raw.domain ?? '',
  }
}

function mapRankingDelta(raw: Record<string, BackendRankingDelta>): Record<string, RankingDelta> {
  const out: Record<string, RankingDelta> = {}
  for (const [id, d] of Object.entries(raw)) {
    const prev = d.previous_position
    const curr = d.current_position
    const positionChange =
      prev != null && curr != null ? prev - curr : 0
    out[id] = {
      positionChange,
      scoreChange: d.score_change ?? 0,
      reason: d.reason || d.movement || '',
      previousRank: prev != null ? prev + 1 : undefined,
      currentRank: curr != null ? curr + 1 : undefined,
    }
  }
  return out
}

function mapMatchReport(report: BackendMatchReport): MatchReport {
  const overall = Math.round((report.overall_score ?? 0) * 100)
  return {
    overallScore: overall,
    breakdown: {
      mustHaves: overall,
      niceToHaves: Math.max(overall - 12, 0),
      experience: overall,
      domain: overall,
    },
    strengths: report.strengths ?? [],
    gaps: report.gaps ?? [],
    suggestions: report.improvement_suggestions ?? [],
    evidence: report.reasoning ? [report.reasoning] : [],
  }
}

function buildCandidate(
  id: string,
  scores: Record<string, number>,
  reports: Record<string, BackendMatchReport>,
  requirements: JobRequirements,
  reasoning: Record<string, string>,
): Candidate {
  const report = reports[id] ?? {}
  const score = scores[id] ?? report.overall_score ?? 0
  const role =
    [requirements.role_level, requirements.domain].filter(Boolean).join(' ') || 'Candidate'

  return {
    id,
    name: formatCandidateId(id),
    role,
    score,
    skills: (report.must_have_coverage?.length
      ? report.must_have_coverage
      : requirements.must_have
    ).slice(0, 5),
    yearsExperience: 0,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(id)}`,
    strengths: report.strengths?.length ? report.strengths : reasoning[id] ? [reasoning[id]] : [],
    gaps: report.gaps ?? [],
    suggestions: report.improvement_suggestions ?? [],
    evidence: report.reasoning ? [report.reasoning] : reasoning[id] ? [reasoning[id]] : [],
    verdict: (report.hire_recommendation as Verdict) ?? undefined,
  }
}

function mapConversation(
  history: { role: string; content: string }[],
  latestMessage?: string,
): ChatMessage[] {
  const messages: ChatMessage[] = history
    .filter((m) => m.role !== 'system')
    .map((m, i) => ({
      id: `hist-${i}`,
      role: m.role === 'assistant' ? 'agent' : m.role === 'user' ? 'user' : 'system',
      content: m.content,
    }))

  if (latestMessage) {
    const last = messages[messages.length - 1]
    if (!last || last.role !== 'agent' || last.content !== latestMessage) {
      messages.push({
        id: `agent-${messages.length}`,
        role: 'agent',
        content: latestMessage,
        quickActions: buildQuickActions(),
      })
    }
  }

  return messages
}

function buildQuickActions(): string[] {
  return [
    'Compare the top 3 matches side by side',
    'Give me the final recommendation',
  ]
}

function resolveCanvasView(intent: Intent): CanvasView {
  switch (intent) {
    case 'compare_candidates':
      return 'compare'
    case 'explain_ranking':
      return 'explain'
    case 'finalize':
      return 'recommendation'
    default:
      return 'workspace'
  }
}

function resolveTopCandidate(
  shortlist: string[],
  scores: Record<string, number>,
  finalDecision: Record<string, Verdict> | null,
): string | null {
  if (!shortlist.length) return null
  const hire = shortlist.find((id) => finalDecision?.[id] === 'HIRE')
  if (hire) return hire
  return [...shortlist].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0))[0]
}

function resolveExplainCandidate(
  intent: Intent,
  query: string,
  shortlist: string[],
): string | null {
  if (intent !== 'explain_ranking') return null
  const lower = query.toLowerCase()
  const match = shortlist.find((id) => lower.includes(id.toLowerCase()))
  if (match) return match
  const nameMatch = shortlist.find((id) =>
    lower.includes(formatCandidateId(id).toLowerCase()),
  )
  return nameMatch ?? shortlist[0] ?? null
}

export function mapBackendState(
  raw: BackendAgentState,
  assistantMessage?: string,
): Partial<AgentState> & { explainCandidateId?: string | null } {
  const intent = (raw.current_intent ?? '') as Intent
  const requirements = mapRequirements(raw.job_requirements)
  const shortlist = raw.candidate_shortlist ?? []
  const scores = raw.candidate_scores ?? {}
  const reports = raw.match_reports ?? {}
  const reasoning = raw.reasoning ?? {}
  const rankingDelta = mapRankingDelta(raw.ranking_delta ?? {})

  const candidates: Record<string, Candidate> = {}
  for (const id of shortlist) {
    candidates[id] = buildCandidate(id, scores, reports, requirements, reasoning)
  }

  const matchReports: Record<string, MatchReport> = {}
  for (const id of shortlist) {
    if (reports[id]) matchReports[id] = mapMatchReport(reports[id])
  }

  const finalDecisionRaw = raw.final_decision ?? null
  const finalDecision = finalDecisionRaw
    ? (Object.fromEntries(
        Object.entries(finalDecisionRaw).map(([k, v]) => [k, v as Verdict]),
      ) as Record<string, Verdict>)
    : null

  const prevVersion = raw.requirements_version ?? 0
  const hadRefine = intent === 'refine_requirements' && Object.keys(rankingDelta).length > 0

  const conversationHistory = mapConversation(raw.conversation_history ?? [], assistantMessage)

  // Attach completed thinking steps to the agent's final response for intents that
  // involve a full analysis pass so the steps remain visible after loading finishes.
  if (intent === 'new_search' || intent === 'refine_requirements') {
    const lastMsg = conversationHistory[conversationHistory.length - 1]
    if (lastMsg?.role === 'agent' && !lastMsg.thinkingSteps) {
      lastMsg.thinkingSteps = THINKING_STEPS.map((label, i) => ({
        id: `step-${i}`,
        label,
        status: 'complete' as const,
      }))
    }
  }

  return {
    conversationHistory,
    currentIntent: intent,
    canvasView: resolveCanvasView(intent),
    rawJd: raw.raw_jd ?? raw.current_query ?? '',
    jobRequirements: requirements,
    requirementsVersion: prevVersion || 1,
    candidateShortlist: shortlist,
    candidateScores: scores,
    candidates,
    rankingDelta,
    matchReports,
    interviewQuestions: raw.interview_questions ?? {},
    screeningRound: raw.screening_round ?? 1,
    finalDecision,
    topCandidateId: resolveTopCandidate(shortlist, scores, finalDecision),
    toast: hadRefine
      ? { message: 'Rankings updated', subtitle: 'Based on your new criteria' }
      : null,
    explainCandidateId: resolveExplainCandidate(intent, raw.current_query ?? '', shortlist),
  }
}

export function buildRefineSummaryChanges(
  rankingDelta: Record<string, RankingDelta>,
  candidates: Record<string, Candidate>,
): { name: string; from: number; to: number; reason: string }[] {
  return Object.entries(rankingDelta)
    .filter(
      ([, d]) =>
        d.positionChange !== 0 && d.previousRank != null && d.currentRank != null,
    )
    .map(([id, d]) => ({
      name: candidates[id]?.name ?? formatCandidateId(id),
      from: d.previousRank!,
      to: d.currentRank!,
      reason: d.reason,
    }))
    .slice(0, 6)
}

export type Intent =
  | 'new_search'
  | 'refine_requirements'
  | 'compare_candidates'
  | 'explain_ranking'
  | 'generate_questions'
  | 'finalize'
  | ''

export type CanvasView =
  | 'workspace'
  | 'compare'
  | 'explain'
  | 'refine'
  | 'recommendation'

export type Verdict = 'HIRE' | 'NO-HIRE' | 'BORDERLINE'

export interface ChatMessage {
  id: string
  role: 'user' | 'agent' | 'system'
  content: string
  quickActions?: string[]
  thinkingSteps?: ThinkingStep[]
}

export interface ThinkingStep {
  id: string
  label: string
  status: 'pending' | 'active' | 'complete'
}

export interface JobRequirements {
  must_have: string[]
  nice_to_have: string[]
  role_level: string
  domain: string
}

export interface Candidate {
  id: string
  name: string
  role: string
  score: number
  skills: string[]
  yearsExperience: number
  avatar: string
  strengths: string[]
  gaps: string[]
  suggestions?: string[]
  evidence?: string[]
  verdict?: Verdict
}

export interface RankingDelta {
  positionChange: number
  scoreChange: number
  reason: string
}

export interface ScoreBreakdown {
  mustHaves: number
  niceToHaves: number
  experience: number
  domain: number
}

export interface MatchReport {
  overallScore: number
  breakdown: ScoreBreakdown
  strengths: string[]
  gaps: string[]
  suggestions: string[]
  evidence: string[]
  previousRank?: number
  previousScore?: number
}

export interface AgentState {
  conversationHistory: ChatMessage[]
  currentIntent: Intent
  canvasView: CanvasView
  rawJd: string
  jobRequirements: JobRequirements
  requirementsVersion: number
  candidateShortlist: string[]
  candidateScores: Record<string, number>
  candidates: Record<string, Candidate>
  rankingDelta: Record<string, RankingDelta>
  matchReports: Record<string, MatchReport>
  interviewQuestions: Record<string, string[]>
  screeningRound: number
  finalDecision: Record<string, Verdict> | null
  topCandidateId: string | null
  isReranking: boolean
  toast: { message: string; subtitle?: string } | null
}

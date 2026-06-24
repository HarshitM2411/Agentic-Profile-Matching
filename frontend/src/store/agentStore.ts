import { create } from 'zustand'
import type { AgentState, CanvasView, ChatMessage, Intent } from '../types/agent'
import { SUGGESTION_CHIPS, THINKING_STEPS } from '../data/uiConstants'
import {
  clearStoredSessionId,
  deleteSession,
  getStoredSessionId,
  sendChatMessage,
  storeSessionId,
} from '../services/api'
import { mapBackendState } from '../services/stateMapper'

const uid = () => crypto.randomUUID()

interface AgentStore extends AgentState {
  startSearch: (query: string) => Promise<void>
  sendMessage: (content: string) => Promise<void>
  setCanvasView: (view: CanvasView) => void
  toggleRequirement: (skill: string) => void
  resetSession: () => Promise<void>
  dismissToast: () => void
  explainCandidateId: string | null
  setExplainCandidate: (id: string | null) => void
}

const emptyRequirements = (): AgentState['jobRequirements'] => ({
  must_have: [],
  nice_to_have: [],
  role_level: '',
  domain: '',
})

const createInitialState = (): AgentState => ({
  sessionId: getStoredSessionId(),
  conversationHistory: [],
  currentIntent: '',
  canvasView: 'workspace',
  rawJd: '',
  jobRequirements: emptyRequirements(),
  requirementsVersion: 0,
  candidateShortlist: [],
  candidateScores: {},
  candidates: {},
  rankingDelta: {},
  matchReports: {},
  interviewQuestions: {},
  screeningRound: 1,
  finalDecision: null,
  topCandidateId: null,
  isLoading: false,
  isReranking: false,
  error: null,
  toast: null,
})

function isRefineMessage(content: string): boolean {
  const lower = content.toLowerCase()
  return (
    lower.includes('must-have') ||
    lower.includes('must have') ||
    lower.includes('not optional') ||
    lower.includes('re-rank') ||
    lower.includes('rerank')
  )
}


async function runAgentTurn(
  set: (partial: Partial<AgentStore> | ((s: AgentStore) => Partial<AgentStore>)) => void,
  get: () => AgentStore,
  message: string,
  options?: { isRefine?: boolean; isNewSearch?: boolean },
) {
  const sessionId = get().sessionId ?? getStoredSessionId()

  set({
    isLoading: true,
    error: null,
    isReranking: options?.isRefine ?? false,
    ...(options?.isNewSearch ? { canvasView: 'workspace' as CanvasView } : {}),
  })

  try {
    const response = await sendChatMessage(message, sessionId ?? undefined)
    const mapped = mapBackendState(response.state, response.message)

    storeSessionId(response.session_id)

    set({
      ...mapped,
      sessionId: response.session_id,
      explainCandidateId: mapped.explainCandidateId ?? null,
      isLoading: false,
      isReranking: false,
      error: null,
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Request failed'
    const agentMsg: ChatMessage = {
      id: uid(),
      role: 'agent',
      content: `Something went wrong while contacting the agent backend.\n\n${detail}\n\nMake sure the API server is running: \`python api_server.py\``,
    }
    set((s) => ({
      isLoading: false,
      isReranking: false,
      error: detail,
      conversationHistory: [...s.conversationHistory, agentMsg],
    }))
  }
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  ...createInitialState(),
  explainCandidateId: null,

  startSearch: async (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return

    // Delete old backend session so the agent starts from a clean slate.
    const oldSessionId = get().sessionId ?? getStoredSessionId()
    if (oldSessionId) {
      try { await deleteSession(oldSessionId) } catch { /* ignore — session may already be gone */ }
    }
    clearStoredSessionId()

    const userMsg: ChatMessage = { id: uid(), role: 'user', content: trimmed }

    set({
      sessionId: null,
      rawJd: trimmed,
      currentIntent: 'new_search',
      canvasView: 'workspace',
      conversationHistory: [userMsg],
      candidateShortlist: [],
      candidateScores: {},
      candidates: {},
      rankingDelta: {},
      matchReports: {},
      finalDecision: null,
      topCandidateId: null,
      requirementsVersion: 0,
      error: null,
    })

    await runAgentTurn(set, get, trimmed, { isNewSearch: true })
  },

  sendMessage: async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed || get().isLoading) return

    const userMsg: ChatMessage = { id: uid(), role: 'user', content: trimmed }
    set((s) => ({
      conversationHistory: [...s.conversationHistory, userMsg],
    }))

    await runAgentTurn(set, get, trimmed, { isRefine: isRefineMessage(trimmed) })
  },

  setCanvasView: (view) => set({ canvasView: view }),

  toggleRequirement: (skill: string) => {
    const { jobRequirements } = get()
    const inMust = jobRequirements.must_have.includes(skill)
    const inNice = jobRequirements.nice_to_have.includes(skill)

    if (inNice) {
      void get().sendMessage(`Make ${skill} a must-have, not optional`)
      return
    }

    if (inMust) {
      void get().sendMessage(`Move ${skill} from must-have to nice-to-have`)
    }
  },

  resetSession: async () => {
    const sessionId = get().sessionId ?? getStoredSessionId()
    if (sessionId) {
      try {
        await deleteSession(sessionId)
      } catch {
        // ignore — session may already be gone
      }
    }
    clearStoredSessionId()
    set({ ...createInitialState(), explainCandidateId: null })
  },

  dismissToast: () => set({ toast: null }),

  setExplainCandidate: (id) =>
    set({ explainCandidateId: id, canvasView: id ? 'explain' : 'workspace' }),
}))

export function detectIntent(message: string): Intent {
  const lower = message.toLowerCase()
  if (lower.includes('compare')) return 'compare_candidates'
  if (lower.includes('why') || lower.includes('explain')) return 'explain_ranking'
  if (lower.includes('must-have') || lower.includes('must have')) return 'refine_requirements'
  if (lower.includes('interview') || lower.includes('questions')) return 'generate_questions'
  if (lower.includes('final') || lower.includes('recommendation') || lower === 'finalize')
    return 'finalize'
  if (lower.includes('find') || lower.length > 10) return 'new_search'
  return ''
}

export { SUGGESTION_CHIPS, THINKING_STEPS }

import { create } from 'zustand'
import type { AgentState, CanvasView, ChatMessage, Intent } from '../types/agent'
import {
  DEFAULT_REQUIREMENTS,
  INITIAL_SHORTLIST,
  INTERVIEW_QUESTIONS,
  MATCH_REPORTS,
  MOCK_CANDIDATES,
  REFINED_DELTAS,
  REFINED_REQUIREMENTS,
  REFINED_SCORES,
  REFINED_SHORTLIST,
  THINKING_STEPS,
} from '../data/mockData'

const uid = () => crypto.randomUUID()

interface AgentStore extends AgentState {
  startSearch: (query: string) => void
  sendMessage: (content: string) => void
  setCanvasView: (view: CanvasView) => void
  toggleRequirement: (skill: string) => void
  resetSession: () => void
  dismissToast: () => void
  explainCandidateId: string | null
  setExplainCandidate: (id: string | null) => void
}

const initialScores = Object.fromEntries(
  INITIAL_SHORTLIST.map((id) => [id, MOCK_CANDIDATES[id].score]),
)

const createInitialState = (): AgentState => ({
  conversationHistory: [],
  currentIntent: '',
  canvasView: 'workspace',
  rawJd: '',
  jobRequirements: DEFAULT_REQUIREMENTS,
  requirementsVersion: 1,
  candidateShortlist: [],
  candidateScores: {},
  candidates: MOCK_CANDIDATES,
  rankingDelta: {},
  matchReports: MATCH_REPORTS,
  interviewQuestions: INTERVIEW_QUESTIONS,
  screeningRound: 1,
  finalDecision: null,
  topCandidateId: null,
  isReranking: false,
  toast: null,
})

export const useAgentStore = create<AgentStore>((set, get) => ({
  ...createInitialState(),
  explainCandidateId: null,

  startSearch: (query: string) => {
    const userMsg: ChatMessage = { id: uid(), role: 'user', content: query }
    const agentMsg: ChatMessage = {
      id: uid(),
      role: 'agent',
      content:
        'I parsed your requirements and scanned 100 resumes. Here are your top matches for Senior Frontend Engineer — React with 3+ years experience.',
      quickActions: ['Compare top 3', 'Add TypeScript as must-have', 'Show interview questions'],
      thinkingSteps: THINKING_STEPS.map((label, i) => ({
        id: `step-${i}`,
        label,
        status: 'complete' as const,
      })),
    }

    set({
      rawJd: query,
      currentIntent: 'new_search',
      canvasView: 'workspace',
      conversationHistory: [userMsg, agentMsg],
      jobRequirements: DEFAULT_REQUIREMENTS,
      requirementsVersion: 1,
      candidateShortlist: INITIAL_SHORTLIST,
      candidateScores: initialScores,
      screeningRound: 1,
      rankingDelta: {},
      finalDecision: null,
      topCandidateId: null,
    })
  },

  sendMessage: (content: string) => {
    const state = get()
    const lower = content.toLowerCase()
    const userMsg: ChatMessage = { id: uid(), role: 'user', content }

    if (lower.includes('compare') && lower.includes('top')) {
      const agentMsg: ChatMessage = {
        id: uid(),
        role: 'agent',
        content: 'Here is a side-by-side comparison of your top 3 candidates against the job requirements.',
        quickActions: ['Why did John rank higher than Jane?', 'Add TypeScript as must-have'],
      }
      set({
        conversationHistory: [...state.conversationHistory, userMsg, agentMsg],
        currentIntent: 'compare_candidates',
        canvasView: 'compare',
      })
      return
    }

    if (lower.includes('why') && (lower.includes('john') || lower.includes('rank'))) {
      const agentMsg: ChatMessage = {
        id: uid(),
        role: 'agent',
        content:
          'John ranks higher than Jane primarily because he meets all must-haves including TypeScript, while Jane lacks TypeScript experience. See the full explainability breakdown.',
        quickActions: ['Add TypeScript as must-have', 'Compare top 3'],
      }
      set({
        conversationHistory: [...state.conversationHistory, userMsg, agentMsg],
        currentIntent: 'explain_ranking',
        canvasView: 'explain',
        explainCandidateId: 'john_doe',
      })
      return
    }

    if (lower.includes('typescript') && (lower.includes('must') || lower.includes('re-rank'))) {
      set({
        conversationHistory: [...state.conversationHistory, userMsg],
        isReranking: true,
        canvasView: 'refine',
      })

      setTimeout(() => {
        const agentMsg: ChatMessage = {
          id: uid(),
          role: 'agent',
          content:
            'Done — TypeScript is now a must-have. 3 candidates dropped in score. Jane moved from #2 to #5 (missing TypeScript). John stays #1 with a full match.',
          quickActions: ['Compare top 3', 'Give me the final recommendation'],
        }
        set({
          conversationHistory: [...get().conversationHistory, agentMsg],
          currentIntent: 'refine_requirements',
          canvasView: 'workspace',
          jobRequirements: REFINED_REQUIREMENTS,
          requirementsVersion: 2,
          candidateShortlist: REFINED_SHORTLIST,
          candidateScores: REFINED_SCORES,
          rankingDelta: REFINED_DELTAS,
          isReranking: false,
          toast: {
            message: 'Rankings updated',
            subtitle: 'Based on your new criteria',
          },
        })
      }, 1800)
      return
    }

    if (lower.includes('interview') || lower.includes('questions')) {
      // Try to extract a specific candidate name from the query
      const candidateEntries = Object.entries(MOCK_CANDIDATES)
      const targetCandidate =
        candidateEntries.find(([, c]) => lower.includes(c.name.toLowerCase()))?.[1] ??
        MOCK_CANDIDATES.john_doe
      const questions = INTERVIEW_QUESTIONS[targetCandidate.id] ??
        INTERVIEW_QUESTIONS.john_doe
      const agentMsg: ChatMessage = {
        id: uid(),
        role: 'agent',
        content: `Here are ${questions.length} tailored screening questions for ${targetCandidate.name}:\n\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`,
        quickActions: ['Give me the final recommendation'],
      }
      set({
        conversationHistory: [...state.conversationHistory, userMsg, agentMsg],
        currentIntent: 'generate_questions',
      })
      return
    }

    if (lower.includes('final') || lower.includes('recommendation')) {
      const agentMsg: ChatMessage = {
        id: uid(),
        role: 'agent',
        content:
          'Based on your criteria, John Doe is the strongest match for this role. He demonstrates exceptional proficiency in the technical stack and has a proven track record of the exact React migrations you specified.',
      }
      set({
        conversationHistory: [...state.conversationHistory, userMsg, agentMsg],
        currentIntent: 'finalize',
        canvasView: 'recommendation',
        screeningRound: 3,
        finalDecision: {
          john_doe: 'HIRE',
          jane_smith: 'BORDERLINE',
          alex_kumar: 'NO-HIRE',
          priya_nair: 'NO-HIRE',
          sam_wilson: 'NO-HIRE',
        },
        topCandidateId: 'john_doe',
        toast: {
          message: 'Recommendation Finalized',
          subtitle: 'AI has completed the talent evaluation.',
        },
      })
      return
    }

    if (lower.includes('react') || lower.includes('find')) {
      get().startSearch(content)
      return
    }

    const agentMsg: ChatMessage = {
      id: uid(),
      role: 'agent',
      content:
        'I can help you search candidates, compare matches, explain rankings, refine requirements, or give a final hire recommendation. Try one of the quick actions below.',
      quickActions: ['Compare top 3', 'Add TypeScript as must-have', 'Give me the final recommendation'],
    }
    set({ conversationHistory: [...state.conversationHistory, userMsg, agentMsg] })
  },

  setCanvasView: (view) => set({ canvasView: view }),

  toggleRequirement: (skill: string) => {
    const { jobRequirements } = get()
    const inMust = jobRequirements.must_have.includes(skill)
    const inNice = jobRequirements.nice_to_have.includes(skill)

    if (inNice) {
      get().sendMessage(`Make ${skill} a must-have, not optional`)
      return
    }

    if (inMust) {
      set({
        jobRequirements: {
          ...jobRequirements,
          must_have: jobRequirements.must_have.filter((s) => s !== skill),
          nice_to_have: [...jobRequirements.nice_to_have, skill],
        },
      })
    }
  },

  resetSession: () =>
    set({ ...createInitialState(), explainCandidateId: null }),

  dismissToast: () => set({ toast: null }),

  setExplainCandidate: (id) => set({ explainCandidateId: id, canvasView: id ? 'explain' : 'workspace' }),
}))

export function detectIntent(message: string): Intent {
  const lower = message.toLowerCase()
  if (lower.includes('compare')) return 'compare_candidates'
  if (lower.includes('why') || lower.includes('explain')) return 'explain_ranking'
  if (lower.includes('typescript') || lower.includes('must-have')) return 'refine_requirements'
  if (lower.includes('interview') || lower.includes('questions')) return 'generate_questions'
  if (lower.includes('final') || lower.includes('recommendation')) return 'finalize'
  if (lower.includes('find') || lower.includes('react')) return 'new_search'
  return ''
}

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAgentStore } from '../store/agentStore'
import { ChatPanel } from '../components/chat/ChatPanel'
import { FinalRecommendationView } from '../components/canvas/FinalRecommendationView'
import { INTERVIEW_QUESTIONS } from '../data/mockData'

export function FinalRecommendationPage() {
  const navigate = useNavigate()
  const {
    conversationHistory,
    sendMessage,
    startSearch,
    candidateShortlist,
    candidates,
    candidateScores,
    finalDecision,
    topCandidateId,
    resetSession,
  } = useAgentStore()

  useEffect(() => {
    if (!topCandidateId) {
      if (candidateShortlist.length === 0) {
        startSearch('Find React devs with 3+ years')
      }
      sendMessage('Give me the final recommendation')
    }
  }, [topCandidateId, candidateShortlist.length, startSearch, sendMessage])

  const top = topCandidateId ? candidates[topCandidateId] : null

  if (!top) {
    return (
      <div className="flex-1 flex items-center justify-center text-on-surface-variant">
        Loading recommendation...
      </div>
    )
  }

  const others = candidateShortlist
    .filter((id) => id !== topCandidateId)
    .slice(0, 4)
    .map((id) => ({
      candidate: candidates[id],
      verdict: finalDecision?.[id] ?? 'NO-HIRE',
    }))

  return (
    <div className="flex-1 flex overflow-hidden">
      <ChatPanel
        messages={conversationHistory}
        onSend={sendMessage}
        disabled
      />
      <section className="flex-1 bg-surface-dim overflow-y-auto p-stack-gap-lg custom-scrollbar">
        <FinalRecommendationView
          topCandidate={top}
          score={candidateScores[top.id] ?? top.score}
          otherCandidates={others}
          onCopyQuestions={() =>
            navigator.clipboard.writeText(INTERVIEW_QUESTIONS.john_doe?.join('\n') ?? '')
          }
          onNewSearch={() => {
            resetSession()
            navigate('/')
          }}
        />
      </section>
    </div>
  )
}

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAgentStore } from '../store/agentStore'
import { ChatPanel } from '../components/chat/ChatPanel'
import { FinalRecommendationView } from '../components/canvas/FinalRecommendationView'

export function FinalRecommendationPage() {
  const navigate = useNavigate()
  const {
    conversationHistory,
    sendMessage,
    candidateShortlist,
    candidates,
    candidateScores,
    finalDecision,
    topCandidateId,
    interviewQuestions,
    isLoading,
    resetSession,
  } = useAgentStore()

  useEffect(() => {
    if (!isLoading && candidateShortlist.length === 0) {
      navigate('/')
    }
  }, [candidateShortlist.length, isLoading, navigate])

  const top = topCandidateId ? candidates[topCandidateId] : null

  if (!top && isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-on-surface-variant">
        Loading recommendation...
      </div>
    )
  }

  if (!top) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-on-surface-variant">
        <p>No recommendation yet. Run a search and ask for a final recommendation.</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-primary hover:underline font-label-md"
        >
          Start a search
        </button>
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
        disabled={isLoading}
      />
      <section className="flex-1 bg-surface-dim overflow-y-auto p-stack-gap-lg custom-scrollbar">
        <FinalRecommendationView
          topCandidate={top}
          score={candidateScores[top.id] ?? top.score}
          otherCandidates={others}
          onCopyQuestions={() => {
            const questions = interviewQuestions[top.id] ?? []
            navigator.clipboard.writeText(questions.join('\n'))
          }}
          onNewSearch={() => {
            void resetSession()
            navigate('/')
          }}
        />
      </section>
    </div>
  )
}

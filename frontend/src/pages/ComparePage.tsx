import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAgentStore } from '../store/agentStore'
import { ChatPanel } from '../components/chat/ChatPanel'
import { CompareView } from '../components/canvas/CompareView'

export function ComparePage() {
  const navigate = useNavigate()
  const {
    candidateShortlist,
    candidates,
    candidateScores,
    jobRequirements,
    conversationHistory,
    sendMessage,
    isLoading,
  } = useAgentStore()

  useEffect(() => {
    if (!isLoading && candidateShortlist.length === 0) {
      navigate('/')
    }
  }, [candidateShortlist.length, isLoading, navigate])

  const top3 = candidateShortlist
    .slice(0, 3)
    .map((id) => candidates[id])
    .filter(Boolean)

  const insight = [...conversationHistory]
    .reverse()
    .find((m) => m.role === 'agent')?.content

  return (
    <div className="flex-1 flex overflow-hidden">
      <ChatPanel messages={conversationHistory} onSend={sendMessage} disabled={isLoading} />
      <section className="flex-1 bg-surface-dim overflow-y-auto p-stack-gap-lg custom-scrollbar">
        <CompareView
          candidates={top3}
          scores={candidateScores}
          requirements={jobRequirements}
          insight={insight}
        />
        <div className="max-w-5xl mx-auto mt-6 text-center">
          <button
            type="button"
            onClick={() => navigate('/workspace')}
            className="text-primary hover:underline font-label-md"
          >
            ← Back to workspace
          </button>
        </div>
      </section>
    </div>
  )
}

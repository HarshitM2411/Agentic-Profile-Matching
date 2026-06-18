import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAgentStore } from '../store/agentStore'
import { ChatPanel } from '../components/chat/ChatPanel'
import { CompareView } from '../components/canvas/CompareView'

export function ComparePage() {
  const navigate = useNavigate()
  const { candidateShortlist, candidates, candidateScores, conversationHistory, sendMessage, startSearch } =
    useAgentStore()

  useEffect(() => {
    if (candidateShortlist.length === 0) {
      startSearch('Find React devs with 3+ years')
    }
  }, [candidateShortlist.length, startSearch])

  const top3 = candidateShortlist
    .slice(0, 3)
    .map((id) => candidates[id])
    .filter(Boolean)

  return (
    <div className="flex-1 flex overflow-hidden">
      <ChatPanel messages={conversationHistory} onSend={sendMessage} />
      <section className="flex-1 bg-surface-dim overflow-y-auto p-stack-gap-lg custom-scrollbar">
        <CompareView candidates={top3} scores={candidateScores} />
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

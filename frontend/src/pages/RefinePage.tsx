import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useAgentStore } from '../store/agentStore'
import { ChatPanel } from '../components/chat/ChatPanel'
import { JobRequirementsCard } from '../components/canvas/JobRequirementsCard'
import { CandidateLeaderboard } from '../components/canvas/CandidateLeaderboard'
import { RefineOverlay, RefineSummary } from '../components/canvas/RefineView'

export function RefinePage() {
  const navigate = useNavigate()
  const [triggered, setTriggered] = useState(false)
  const {
    conversationHistory,
    sendMessage,
    startSearch,
    candidateShortlist,
    candidates,
    candidateScores,
    jobRequirements,
    requirementsVersion,
    rankingDelta,
    isReranking,
    toggleRequirement,
  } = useAgentStore()

  useEffect(() => {
    if (candidateShortlist.length === 0) {
      startSearch('Find React devs with 3+ years')
    }
  }, [candidateShortlist.length, startSearch])

  useEffect(() => {
    if (!triggered && candidateShortlist.length > 0) {
      setTriggered(true)
      setTimeout(() => sendMessage('Make TypeScript a must-have, not optional'), 500)
    }
  }, [triggered, candidateShortlist.length, sendMessage])

  return (
    <div className="flex-1 flex overflow-hidden relative">
      <ChatPanel messages={conversationHistory} onSend={sendMessage} />
      <section className="flex-1 bg-surface-dim overflow-y-auto p-stack-gap-lg custom-scrollbar relative">
        <AnimatePresence>{isReranking && <RefineOverlay />}</AnimatePresence>
        <div className="max-w-5xl mx-auto space-y-stack-gap-lg">
          <JobRequirementsCard
            requirements={jobRequirements}
            version={requirementsVersion}
            editable
            onToggle={toggleRequirement}
            animatingSkill={isReranking ? 'TypeScript' : undefined}
          />
          {!isReranking && Object.keys(rankingDelta).length > 0 && (
            <RefineSummary
              changes={[
                {
                  name: 'Jane Smith',
                  from: 2,
                  to: 5,
                  reason: 'TypeScript moved to must-have; Jane has no TS experience',
                },
                {
                  name: 'John Doe',
                  from: 1,
                  to: 1,
                  reason: 'Stays #1 (full match)',
                },
              ]}
            />
          )}
          <CandidateLeaderboard
            shortlist={candidateShortlist}
            candidates={candidates}
            scores={candidateScores}
            rankingDelta={rankingDelta}
          />
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/workspace')}
              className="text-primary hover:underline font-label-md"
            >
              ← Back to workspace
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

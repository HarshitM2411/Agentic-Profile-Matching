import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useAgentStore } from '../store/agentStore'
import { ChatPanel } from '../components/chat/ChatPanel'
import { JobRequirementsCard } from '../components/canvas/JobRequirementsCard'
import { CandidateLeaderboard } from '../components/canvas/CandidateLeaderboard'
import { RefineOverlay, RefineSummary } from '../components/canvas/RefineView'
import { buildRefineSummaryChanges } from '../services/stateMapper'

export function RefinePage() {
  const navigate = useNavigate()
  const {
    conversationHistory,
    sendMessage,
    candidateShortlist,
    candidates,
    candidateScores,
    jobRequirements,
    requirementsVersion,
    rankingDelta,
    isReranking,
    isLoading,
    toggleRequirement,
  } = useAgentStore()

  useEffect(() => {
    if (!isLoading && candidateShortlist.length === 0) {
      navigate('/')
    }
  }, [candidateShortlist.length, isLoading, navigate])

  const refineChanges = buildRefineSummaryChanges(rankingDelta, candidates)

  return (
    <div className="flex-1 flex overflow-hidden relative">
      <ChatPanel messages={conversationHistory} onSend={sendMessage} disabled={isLoading} />
      <section className="flex-1 bg-surface-dim overflow-y-auto p-stack-gap-lg custom-scrollbar relative">
        <AnimatePresence>{isReranking && <RefineOverlay />}</AnimatePresence>
        <div className="max-w-5xl mx-auto space-y-stack-gap-lg">
          <JobRequirementsCard
            requirements={jobRequirements}
            version={requirementsVersion}
            editable
            onToggle={toggleRequirement}
            animatingSkill={isReranking ? jobRequirements.nice_to_have[0] : null}
          />
          {!isReranking && refineChanges.length > 0 && (
            <RefineSummary changes={refineChanges} />
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

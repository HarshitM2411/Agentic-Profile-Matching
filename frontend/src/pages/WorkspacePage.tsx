import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useAgentStore } from '../store/agentStore'
import { ChatPanel } from '../components/chat/ChatPanel'
import { JobRequirementsCard } from '../components/canvas/JobRequirementsCard'
import { ScreeningFunnel } from '../components/canvas/ScreeningFunnel'
import { CandidateLeaderboard } from '../components/canvas/CandidateLeaderboard'
import { CompareView } from '../components/canvas/CompareView'
import { ExplainabilityPanel } from '../components/canvas/ExplainabilityPanel'
import { RefineOverlay, RefineSummary } from '../components/canvas/RefineView'
import { FinalRecommendationView } from '../components/canvas/FinalRecommendationView'
import { INTERVIEW_QUESTIONS } from '../data/mockData'
import type { MatchReport } from '../types/agent'

export function WorkspacePage() {
  const navigate = useNavigate()
  const {
    conversationHistory,
    currentIntent,
    candidateShortlist,
    candidates,
    candidateScores,
    jobRequirements,
    requirementsVersion,
    screeningRound,
    canvasView,
    isReranking,
    rankingDelta,
    matchReports,
    finalDecision,
    topCandidateId,
    explainCandidateId,
    sendMessage,
    toggleRequirement,
    setExplainCandidate,
    resetSession,
  } = useAgentStore()

  useEffect(() => {
    if (candidateShortlist.length === 0) {
      navigate('/')
    }
  }, [candidateShortlist.length, navigate])

  const top3Candidates = candidateShortlist
    .slice(0, 3)
    .map((id) => candidates[id])
    .filter(Boolean)

  const explainCandidate = explainCandidateId ? candidates[explainCandidateId] : null

  // Build a fallback report from candidate data if a formal report is missing
  const explainReport: MatchReport | null = explainCandidateId
    ? matchReports[explainCandidateId] ?? (() => {
        const c = candidates[explainCandidateId]
        if (!c) return null
        const pct = Math.round(c.score * 100)
        return {
          overallScore: pct,
          breakdown: {
            mustHaves: Math.min(pct + 5, 100),
            niceToHaves: Math.max(pct - 15, 0),
            experience: Math.min(pct + 8, 100),
            domain: pct,
          },
          strengths: c.strengths,
          gaps: c.gaps,
          suggestions: c.suggestions ?? [],
          evidence: c.evidence ?? [],
        } satisfies MatchReport
      })()
    : null

  // Only show "vs Jane Smith" callout when in explicit explain mode
  const explainCompareName = currentIntent === 'explain_ranking' ? 'Jane Smith' : undefined

  const handleCopyQuestions = () => {
    const id = explainCandidateId ?? 'john_doe'
    const questions = INTERVIEW_QUESTIONS[id] ?? INTERVIEW_QUESTIONS.john_doe ?? []
    navigator.clipboard.writeText(questions.join('\n'))
  }

  const renderCanvas = () => {
    if (canvasView === 'compare') {
      return <CompareView candidates={top3Candidates} scores={candidateScores} />
    }

    if (canvasView === 'recommendation' && topCandidateId) {
      const top = candidates[topCandidateId]
      const others = candidateShortlist
        .filter((id) => id !== topCandidateId)
        .slice(0, 4)
        .map((id) => ({
          candidate: candidates[id],
          verdict: finalDecision?.[id] ?? 'NO-HIRE',
        }))

      return (
        <FinalRecommendationView
          topCandidate={top}
          score={candidateScores[topCandidateId] ?? top.score}
          otherCandidates={others}
          onCopyQuestions={handleCopyQuestions}
          onNewSearch={() => {
            resetSession()
            navigate('/')
          }}
        />
      )
    }

    return (
      <div className="space-y-stack-gap-lg">
        {Object.keys(rankingDelta).length > 0 && (
          <RefineSummary
            changes={[
              {
                name: 'Jane Smith',
                from: 2,
                to: 5,
                reason: rankingDelta.jane_smith?.reason ?? '',
              },
              {
                name: 'John Doe',
                from: 1,
                to: 1,
                reason: 'Stays #1 — full match on all must-haves',
              },
            ]}
          />
        )}

        <JobRequirementsCard
          requirements={jobRequirements}
          version={requirementsVersion}
          editable
          onToggle={toggleRequirement}
          animatingSkill={isReranking ? 'TypeScript' : null}
        />
        <ScreeningFunnel activeRound={screeningRound} />
        <CandidateLeaderboard
          shortlist={candidateShortlist}
          candidates={candidates}
          scores={candidateScores}
          rankingDelta={rankingDelta}
          onViewReport={(id) => setExplainCandidate(id)}
          onInterviewQuestions={(id) =>
            sendMessage(`Show interview questions for ${candidates[id]?.name ?? id}`)
          }
          onCompare={() => sendMessage('Compare the top 3 matches side by side')}
        />
      </div>
    )
  }

  return (
    <div className="flex-1 flex overflow-hidden relative">
      <ChatPanel
        messages={conversationHistory}
        onSend={sendMessage}
        disabled={canvasView === 'recommendation'}
      />

      <section className="flex-1 bg-surface-dim overflow-y-auto relative p-stack-gap-lg custom-scrollbar">
        <AnimatePresence>{isReranking && <RefineOverlay />}</AnimatePresence>
        <div className="max-w-5xl mx-auto">{renderCanvas()}</div>
      </section>

      {explainCandidate && explainReport && (
        <ExplainabilityPanel
          candidate={explainCandidate}
          report={explainReport}
          compareName={explainCompareName}
          onClose={() => setExplainCandidate(null)}
        />
      )}
    </div>
  )
}

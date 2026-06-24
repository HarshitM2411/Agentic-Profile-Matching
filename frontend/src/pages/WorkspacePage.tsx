import { useEffect, useMemo } from 'react'
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
import { THINKING_STEPS } from '../data/uiConstants'
import { buildRefineSummaryChanges } from '../services/stateMapper'
import type { ChatMessage, MatchReport } from '../types/agent'

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
    isLoading,
    isReranking,
    rankingDelta,
    matchReports,
    finalDecision,
    topCandidateId,
    explainCandidateId,
    interviewQuestions,
    sendMessage,
    toggleRequirement,
    setExplainCandidate,
    resetSession,
  } = useAgentStore()

  useEffect(() => {
    if (!isLoading && candidateShortlist.length === 0 && conversationHistory.length === 0) {
      navigate('/')
    }
  }, [isLoading, candidateShortlist.length, conversationHistory.length, navigate])

  const loadingMessage: ChatMessage = useMemo(
    () => ({
      id: 'loading',
      role: 'agent',
      content: 'Analyzing resumes and ranking candidates…',
      thinkingSteps: THINKING_STEPS.map((label, i) => ({
        id: `step-${i}`,
        label,
        status: i < THINKING_STEPS.length - 1 ? 'active' : 'pending',
      })),
    }),
    [],
  )

  const displayMessages = isLoading
    ? [...conversationHistory, loadingMessage]
    : conversationHistory

  const refineChanges = buildRefineSummaryChanges(rankingDelta, candidates)

  const top3Candidates = candidateShortlist
    .slice(0, 3)
    .map((id) => candidates[id])
    .filter(Boolean)

  const explainCandidate = explainCandidateId ? candidates[explainCandidateId] : null

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

  const compareInsight = [...conversationHistory]
    .reverse()
    .find((m) => m.role === 'agent')?.content

  const explainCompareName =
    currentIntent === 'explain_ranking' && candidateShortlist[1]
      ? candidates[candidateShortlist[1]]?.name
      : undefined

  const handleCopyQuestions = () => {
    const id = explainCandidateId ?? topCandidateId ?? candidateShortlist[0]
    const questions = id ? interviewQuestions[id] ?? [] : []
    navigator.clipboard.writeText(questions.join('\n'))
  }

  const renderCanvas = () => {
    if (canvasView === 'compare') {
      return (
        <CompareView
          candidates={top3Candidates}
          scores={candidateScores}
          requirements={jobRequirements}
          insight={compareInsight}
        />
      )
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
            void resetSession()
            navigate('/')
          }}
        />
      )
    }

    return (
      <div className="space-y-stack-gap-lg">
        {refineChanges.length > 0 && <RefineSummary changes={refineChanges} />}

        <JobRequirementsCard
          requirements={jobRequirements}
          version={requirementsVersion}
          editable
          onToggle={toggleRequirement}
          animatingSkill={isReranking ? jobRequirements.nice_to_have[0] : null}
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
        messages={displayMessages}
        onSend={sendMessage}
        disabled={isLoading || canvasView === 'recommendation'}
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

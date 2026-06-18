import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Candidate, RankingDelta } from '../../types/agent'
import { MatchScoreRing } from '../ui/MatchScoreRing'
import { RankingDeltaBadge } from '../ui/RankingDeltaBadge'
import { Icon } from '../ui/Icon'

interface CandidateLeaderboardProps {
  shortlist: string[]
  candidates: Record<string, Candidate>
  scores: Record<string, number>
  rankingDelta?: Record<string, RankingDelta>
  onViewReport?: (id: string) => void
  onInterviewQuestions?: (id: string) => void
  onCompare?: () => void
}

export function CandidateLeaderboard({
  shortlist,
  candidates,
  scores,
  rankingDelta = {},
  onViewReport,
  onInterviewQuestions,
  onCompare,
}: CandidateLeaderboardProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
          <Icon name="leaderboard" className="text-primary" />
          Candidate Leaderboard
        </h3>
        {onCompare && (
          <button
            type="button"
            onClick={onCompare}
            className="text-body-sm text-primary hover:underline font-label-md"
          >
            Compare top 3
          </button>
        )}
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {shortlist.map((id, index) => {
            const candidate = candidates[id]
            if (!candidate) return null
            const score = scores[id] ?? candidate.score
            const delta = rankingDelta[id]
            const isExpanded = expanded === id

            return (
              <motion.div
                key={id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden hover:border-primary/20 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : id)}
                  className="w-full flex items-center gap-4 p-4 text-left"
                >
                  <span className="font-mono-data text-on-surface-variant w-6">
                    #{index + 1}
                  </span>
                  <img
                    src={candidate.avatar}
                    alt=""
                    className="w-10 h-10 rounded-full bg-surface-container-highest"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-headline-sm text-on-surface truncate">
                        {candidate.name}
                      </span>
                      {delta && <RankingDeltaBadge change={delta.positionChange} />}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {candidate.skills.slice(0, 3).map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 bg-surface-container-highest rounded text-[11px] text-on-surface-variant"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <MatchScoreRing score={score} size={48} />
                  <Icon
                    name={isExpanded ? 'expand_less' : 'expand_more'}
                    className="text-on-surface-variant"
                  />
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-outline-variant"
                    >
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border-l-4 border-l-primary-container pl-3">
                          <p className="font-label-md text-primary-container mb-2">Strengths</p>
                          <ul className="space-y-1 text-body-sm text-on-surface">
                            {candidate.strengths.map((s) => (
                              <li key={s} className="flex gap-2">
                                <Icon name="check_circle" className="text-primary text-sm shrink-0 mt-0.5" />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="border-l-4 border-l-secondary pl-3">
                          <p className="font-label-md text-secondary mb-2">Gaps</p>
                          <ul className="space-y-1 text-body-sm text-on-surface">
                            {candidate.gaps.map((g) => (
                              <li key={g} className="flex gap-2">
                                <Icon name="fiber_manual_record" className="text-secondary text-sm shrink-0 mt-0.5" />
                                {g}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="px-4 pb-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => onViewReport?.(id)}
                          className="px-3 py-1.5 bg-surface-container-highest rounded-lg text-body-sm hover:bg-primary/20 hover:text-primary transition-all"
                        >
                          View Report
                        </button>
                        <button
                          type="button"
                          onClick={() => onInterviewQuestions?.(id)}
                          className="px-3 py-1.5 bg-surface-container-highest rounded-lg text-body-sm hover:bg-primary/20 hover:text-primary transition-all"
                        >
                          Interview Questions
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}

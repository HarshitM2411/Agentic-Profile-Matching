import type { Candidate } from '../../types/agent'
import { MatchScoreRing } from '../ui/MatchScoreRing'
import { HireVerdictBadge } from '../ui/HireVerdictBadge'
import { Icon } from '../ui/Icon'

interface FinalRecommendationViewProps {
  topCandidate: Candidate
  score: number
  otherCandidates: { candidate: Candidate; verdict: string }[]
  onExport?: () => void
  onCopyQuestions?: () => void
  onNewSearch?: () => void
}

export function FinalRecommendationView({
  topCandidate,
  score,
  otherCandidates,
  onExport,
  onCopyQuestions,
  onNewSearch,
}: FinalRecommendationViewProps) {
  const pct = Math.round(score * 100)
  const circumference = 2 * Math.PI * 76

  return (
    <div className="max-w-5xl mx-auto space-y-stack-gap-lg">
      <div className="glass-panel p-8 rounded-3xl glow-teal relative overflow-hidden flex flex-col md:flex-row gap-8">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />

        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="relative w-40 h-40">
            <svg
              width="160"
              height="160"
              viewBox="0 0 160 160"
              className="w-full h-full -rotate-90"
            >
              <circle
                cx="80"
                cy="80"
                r="76"
                fill="transparent"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="8"
              />
              <circle
                cx="80"
                cy="80"
                r="76"
                fill="transparent"
                stroke="#57f1db"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - pct / 100)}
                strokeLinecap="round"
                strokeWidth="8"
              />
            </svg>
            <div className="absolute inset-2 rounded-full overflow-hidden border-2 border-primary/20">
              <img
                src={topCandidate.avatar}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-on-primary px-3 py-1 rounded-full text-xs font-bold shadow-lg">
              {pct}% MATCH
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 relative z-10">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-4xl font-display-lg text-on-surface">
                  {topCandidate.name}
                </h3>
                <HireVerdictBadge verdict="HIRE" />
              </div>
              <p className="font-headline-sm text-on-surface-variant mt-1">
                {topCandidate.role}
              </p>
            </div>
            <div className="text-right">
              <div className="font-label-md text-outline uppercase tracking-widest text-[10px]">
                Confidence
              </div>
              <div className="text-3xl font-headline-md text-primary">Very High</div>
            </div>
          </div>

          <div className="bg-surface-container/50 p-5 rounded-2xl border border-outline-variant">
            <p className="font-body-md text-on-surface leading-relaxed italic">
              "John exceeds all must-haves and nice-to-haves. He has led React migrations and is a TS core contributor, offering rare depth in architectural scalability."
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {topCandidate.skills.map((s) => (
              <span
                key={s}
                className="px-3 py-1 bg-surface-container-highest text-on-surface-variant rounded-lg text-sm border border-outline-variant"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-gap-md">
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-primary-container">
          <h4 className="font-headline-sm text-primary-container flex items-center gap-2 mb-4">
            <Icon name="trending_up" />
            Key Strengths
          </h4>
          <ul className="space-y-3">
            {topCandidate.strengths.map((s) => (
              <li key={s} className="flex items-start gap-2 text-body-sm text-on-surface">
                <Icon name="check_circle" className="text-primary text-sm mt-1" />
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-secondary">
          <h4 className="font-headline-sm text-secondary flex items-center gap-2 mb-4">
            <Icon name="info" />
            Growth Areas
          </h4>
          <ul className="space-y-3">
            {topCandidate.gaps.map((g) => (
              <li key={g} className="flex items-start gap-2 text-body-sm text-on-surface">
                <Icon name="fiber_manual_record" className="text-secondary text-sm mt-1" />
                {g}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {otherCandidates.length > 0 && (
        <div className="glass-panel rounded-2xl p-6">
          <h4 className="font-headline-sm text-on-surface mb-4">Other Candidates</h4>
          <div className="space-y-2">
            {otherCandidates.map(({ candidate, verdict }) => (
              <div
                key={candidate.id}
                className="flex items-center justify-between p-3 bg-surface-container rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <img src={candidate.avatar} alt="" className="w-8 h-8 rounded-full" />
                  <span className="text-body-sm text-on-surface">{candidate.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MatchScoreRing score={candidate.score} size={36} showLabel={false} />
                  <HireVerdictBadge verdict={verdict as 'HIRE' | 'NO-HIRE' | 'BORDERLINE'} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={onExport}
            className="bg-surface-container-highest text-on-surface hover:bg-primary/20 hover:text-primary transition-all px-4 py-2 rounded-xl flex items-center gap-2 font-label-md"
          >
            <Icon name="download" />
            Export Report
          </button>
          <button
            type="button"
            onClick={onCopyQuestions}
            className="bg-surface-container-highest text-on-surface hover:bg-primary/20 hover:text-primary transition-all px-4 py-2 rounded-xl flex items-center gap-2 font-label-md"
          >
            <Icon name="content_copy" />
            Interview Questions
          </button>
        </div>
        <button
          type="button"
          className="w-full md:w-auto bg-primary text-on-primary px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20"
        >
          <Icon name="calendar_today" />
          Schedule Interview
        </button>
      </div>

      <div className="text-center py-4">
        <p className="text-on-surface-variant font-body-sm mb-4">
          Want to explore more options or refine the criteria?
        </p>
        <button
          type="button"
          onClick={onNewSearch}
          className="inline-flex items-center gap-2 text-primary hover:underline font-label-md"
        >
          <Icon name="refresh" />
          Start New Candidate Search
        </button>
      </div>
    </div>
  )
}

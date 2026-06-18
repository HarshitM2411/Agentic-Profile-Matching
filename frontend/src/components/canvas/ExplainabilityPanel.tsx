import type { Candidate, MatchReport } from '../../types/agent'
import { MatchScoreRing } from '../ui/MatchScoreRing'
import { Icon } from '../ui/Icon'

interface ExplainabilityPanelProps {
  candidate: Candidate
  report: MatchReport
  compareName?: string
  onClose: () => void
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-body-sm mb-1">
        <span className="text-on-surface-variant">{label}</span>
        <span className="font-mono-data text-on-surface">{value}%</span>
      </div>
      <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

export function ExplainabilityPanel({
  candidate,
  report,
  compareName,
  onClose,
}: ExplainabilityPanelProps) {
  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden
      />
      <aside className="fixed right-0 top-0 h-full w-full max-w-lg bg-surface-container-low border-l border-outline-variant z-50 overflow-y-auto custom-scrollbar shadow-2xl">
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <MatchScoreRing score={report.overallScore / 100} size={72} />
              <div>
                <h2 className="font-headline-md text-on-surface">{candidate.name}</h2>
                <p className="text-body-sm text-on-surface-variant">
                  Match Report {compareName && `vs ${compareName}`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-on-surface-variant hover:text-primary rounded-lg"
              aria-label="Close panel"
            >
              <Icon name="close" />
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="font-label-md text-on-surface-variant uppercase tracking-wider">
              Score Breakdown
            </h3>
            <ScoreBar label="Must-haves met" value={report.breakdown.mustHaves} />
            <ScoreBar label="Nice-to-haves met" value={report.breakdown.niceToHaves} />
            <ScoreBar label="Experience fit" value={report.breakdown.experience} />
            <ScoreBar label="Domain alignment" value={report.breakdown.domain} />
          </div>

          {report.evidence.length > 0 && (
            <div>
              <h3 className="font-label-md text-on-surface-variant uppercase tracking-wider mb-3">
                Resume Evidence
              </h3>
              {report.evidence.map((quote) => (
                <blockquote
                  key={quote}
                  className="mb-2 p-3 bg-surface-container rounded-lg border-l-4 border-l-primary text-body-sm text-on-surface italic"
                >
                  {quote}
                </blockquote>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <div className="border-l-4 border-l-primary-container pl-4">
              <h3 className="font-headline-sm text-primary-container mb-2">Strengths</h3>
              <ul className="space-y-2 text-body-sm">
                {report.strengths.map((s) => (
                  <li key={s} className="flex gap-2 text-on-surface">
                    <Icon name="check_circle" className="text-primary text-sm shrink-0 mt-0.5" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-l-4 border-l-secondary pl-4">
              <h3 className="font-headline-sm text-secondary mb-2">Gaps</h3>
              <ul className="space-y-2 text-body-sm">
                {report.gaps.map((g) => (
                  <li key={g} className="flex gap-2 text-on-surface">
                    <Icon name="fiber_manual_record" className="text-secondary text-sm shrink-0 mt-0.5" />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {report.suggestions.length > 0 && (
            <div className="bg-surface-container rounded-xl p-4">
              <h3 className="font-label-md text-on-surface-variant mb-2">
                Coaching Suggestions
              </h3>
              <ul className="text-body-sm text-on-surface space-y-1">
                {report.suggestions.map((s) => (
                  <li key={s}>• {s}</li>
                ))}
              </ul>
            </div>
          )}

          {report.previousRank !== undefined && (
            <div className="glass-panel rounded-xl p-4 border border-secondary/30">
              <h3 className="font-label-md text-secondary mb-3 uppercase tracking-wider">
                Ranking Change
              </h3>
              <div className="flex items-center gap-4 text-body-sm">
                <div>
                  <span className="text-on-surface-variant">Before: </span>
                  <span className="font-mono-data">
                    #{report.previousRank} — {report.previousScore}%
                  </span>
                </div>
                <Icon name="arrow_forward" className="text-outline" />
                <div>
                  <span className="text-on-surface-variant">After: </span>
                  <span className="font-mono-data text-secondary">
                    #{report.previousRank + 3} — {report.overallScore}%
                  </span>
                </div>
              </div>
              <p className="mt-2 text-body-sm text-on-surface-variant">
                TypeScript moved to must-have; Jane has no TS experience.
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

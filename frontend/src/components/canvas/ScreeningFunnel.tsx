import clsx from 'clsx'
import { Icon } from '../ui/Icon'

interface FunnelStage {
  round: number
  title: string
  input: string
  output: string
}

const stages: FunnelStage[] = [
  { round: 1, title: 'Broad Search', input: '100 resumes scanned', output: 'Top 10 shortlisted' },
  { round: 2, title: 'Deep Analysis', input: 'Top 10 evaluated', output: 'Ranked with scores' },
  { round: 3, title: 'Final Verdict', input: 'Holistic review', output: 'Hire / No-Hire' },
]

interface ScreeningFunnelProps {
  activeRound: number
}

export function ScreeningFunnel({ activeRound }: ScreeningFunnelProps) {
  return (
    <div className="glass-panel rounded-2xl p-6">
      <h3 className="font-headline-sm text-headline-sm text-on-surface mb-4 flex items-center gap-2">
        <Icon name="filter_alt" className="text-primary" />
        Screening Funnel
      </h3>
      <div className="flex flex-col gap-3">
        {stages.map((stage) => {
          const isComplete = activeRound > stage.round
          const isActive = activeRound === stage.round
          return (
            <div
              key={stage.round}
              className={clsx(
                'relative flex items-center gap-4 p-4 rounded-xl border transition-all',
                isActive && 'bg-primary/10 border-primary/30 glow-teal',
                isComplete && 'bg-surface-container border-primary/20 opacity-80',
                !isActive && !isComplete && 'bg-surface-container-low border-outline-variant opacity-50',
              )}
              style={{
                marginLeft: `${(stage.round - 1) * 12}px`,
                marginRight: `${(3 - stage.round) * 12}px`,
              }}
            >
              <div
                className={clsx(
                  'w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-mono-data text-sm',
                  isActive && 'bg-primary text-on-primary',
                  isComplete && 'bg-primary/20 text-primary',
                  !isActive && !isComplete && 'bg-surface-container-highest text-outline',
                )}
              >
                {isComplete ? (
                  <Icon name="check" className="text-lg" />
                ) : (
                  stage.round
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-label-md text-label-md text-on-surface">
                  Round {stage.round}: {stage.title}
                </div>
                <div className="text-body-sm text-on-surface-variant flex flex-wrap gap-x-2">
                  <span>{stage.input}</span>
                  <Icon name="arrow_forward" className="text-sm text-primary" />
                  <span className="text-primary">{stage.output}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

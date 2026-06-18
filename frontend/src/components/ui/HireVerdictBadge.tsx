import clsx from 'clsx'
import type { Verdict } from '../../types/agent'

interface HireVerdictBadgeProps {
  verdict: Verdict
  className?: string
}

const styles: Record<Verdict, string> = {
  HIRE: 'bg-primary/20 text-primary border-primary/30',
  'NO-HIRE': 'bg-error/15 text-error border-error/30',
  BORDERLINE: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
}

export function HireVerdictBadge({ verdict, className }: HireVerdictBadgeProps) {
  return (
    <span
      className={clsx(
        'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border',
        styles[verdict],
        className,
      )}
    >
      {verdict === 'NO-HIRE' ? 'No Hire' : verdict.charAt(0) + verdict.slice(1).toLowerCase()}
    </span>
  )
}

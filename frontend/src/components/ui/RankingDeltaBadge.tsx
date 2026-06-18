import clsx from 'clsx'

interface RankingDeltaBadgeProps {
  change: number
  className?: string
}

export function RankingDeltaBadge({ change, className }: RankingDeltaBadgeProps) {
  if (change === 0) return null

  const up = change > 0
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-mono-data',
        up
          ? 'bg-primary/15 text-primary'
          : 'bg-secondary/15 text-secondary',
        className,
      )}
    >
      {up ? '▲' : '▼'} {Math.abs(change)}
    </span>
  )
}

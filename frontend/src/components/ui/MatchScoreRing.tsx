import clsx from 'clsx'

interface MatchScoreRingProps {
  score: number
  size?: number
  strokeWidth?: number
  showLabel?: boolean
  className?: string
}

export function MatchScoreRing({
  score,
  size = 56,
  strokeWidth = 4,
  showLabel = true,
  className,
}: MatchScoreRingProps) {
  const pct = Math.round(score * 100)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference

  const color =
    pct >= 80 ? '#57f1db' : pct >= 60 ? '#fbbf24' : '#fb7185'

  return (
    <div
      className={clsx('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Match score ${pct} percent`}
    >
      <svg
        className="-rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={pct >= 85 ? 'drop-shadow-[0_0_6px_rgba(87,241,219,0.5)]' : ''}
        />
      </svg>
      {showLabel && (
        <span className="absolute font-mono-data text-xs font-medium text-on-surface">
          {pct}%
        </span>
      )}
    </div>
  )
}

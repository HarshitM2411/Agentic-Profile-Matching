import { motion } from 'framer-motion'
import { Icon } from '../ui/Icon'

export function RefineOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex items-center justify-center bg-surface-dim/80 backdrop-blur-sm"
    >
      <div className="text-center space-y-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
          className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full mx-auto"
        />
        <p className="font-headline-sm text-primary">Re-ranking candidates…</p>
        <p className="text-body-sm text-on-surface-variant font-mono-data">
          &gt; APPLYING_CRITERIA_V2...
        </p>
      </div>
    </motion.div>
  )
}

interface RefineSummaryProps {
  changes: { name: string; from: number; to: number; reason: string }[]
}

export function RefineSummary({ changes }: RefineSummaryProps) {
  return (
    <div className="glass-panel rounded-2xl p-6 border border-primary/20">
      <h3 className="font-headline-sm text-primary mb-4 flex items-center gap-2">
        <Icon name="sync" />
        Requirements Updated — Ranking Changes
      </h3>
      <ul className="space-y-3">
        {changes.map((c) => (
          <li
            key={c.name}
            className="flex items-start gap-3 p-3 bg-surface-container rounded-xl"
          >
            <Icon
              name={c.to > c.from ? 'trending_down' : c.to < c.from ? 'trending_up' : 'remove'}
              className={c.to > c.from ? 'text-secondary' : c.to < c.from ? 'text-primary' : 'text-outline'}
            />
            <div>
              <p className="text-body-sm text-on-surface font-medium">
                {c.name}: #{c.from} → #{c.to}
              </p>
              <p className="text-body-sm text-on-surface-variant">{c.reason}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

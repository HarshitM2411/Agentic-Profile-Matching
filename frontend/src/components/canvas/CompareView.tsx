import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { RADAR_DATA } from '../../data/mockData'
import type { Candidate } from '../../types/agent'
import { MatchScoreRing } from '../ui/MatchScoreRing'
import { Icon } from '../ui/Icon'

interface CompareViewProps {
  candidates: Candidate[]
  scores: Record<string, number>
}

export function CompareView({ candidates, scores }: CompareViewProps) {
  const top3 = candidates.slice(0, 3)

  return (
    <div className="space-y-stack-gap-lg">
      <div className="glass-panel rounded-2xl p-6">
        <h3 className="font-headline-sm text-headline-sm text-on-surface mb-6 flex items-center gap-2">
          <Icon name="compare" className="text-primary" />
          Compare Top 3 Candidates
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {top3.map((c) => {
            const pct = Math.round((scores[c.id] ?? c.score) * 100)
            const color = pct >= 80 ? '#57f1db' : pct >= 60 ? '#fbbf24' : '#fb7185'
            return (
              <div
                key={c.id}
                className="bg-surface-container border border-outline-variant rounded-2xl p-5 text-center hover:border-primary/30 transition-all glow-teal"
              >
                {/* Avatar with ring — score label shown as separate badge, not inside ring */}
                <div className="flex flex-col items-center mb-3 gap-2">
                  <div className="relative">
                    <MatchScoreRing score={scores[c.id] ?? c.score} size={80} showLabel={false} />
                    <img
                      src={c.avatar}
                      alt={c.name}
                      className="absolute inset-2 rounded-full bg-surface-container-highest object-cover"
                    />
                  </div>
                  <span
                    className="text-xs font-mono-data font-bold px-2 py-0.5 rounded-full"
                    style={{ color, background: `${color}22` }}
                  >
                    {pct}%
                  </span>
                </div>
                <h4 className="font-headline-sm text-on-surface">{c.name}</h4>
                <p className="text-body-sm text-on-surface-variant mb-3">{c.role}</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {c.skills.map((s) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 bg-surface-container-highest rounded text-[11px] text-on-surface-variant"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={RADAR_DATA} cx="50%" cy="50%" outerRadius="75%">
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis
                dataKey="skill"
                tick={{ fill: '#bacac5', fontSize: 12 }}
              />
              <Radar
                name="John"
                dataKey="John"
                stroke="#57f1db"
                fill="#57f1db"
                fillOpacity={0.2}
                strokeWidth={2}
              />
              <Radar
                name="Jane"
                dataKey="Jane"
                stroke="#818cf8"
                fill="#818cf8"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Radar
                name="Alex"
                dataKey="Alex"
                stroke="#fb7185"
                fill="#fb7185"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Legend
                wrapperStyle={{ color: '#bacac5', fontSize: 12 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-6 border-l-4 border-l-primary">
        <h4 className="font-headline-sm text-primary mb-3 flex items-center gap-2">
          <Icon name="lightbulb" />
          Why John ranks higher
        </h4>
        <p className="text-body-md text-on-surface leading-relaxed">
          John ranks higher because he meets <strong className="text-primary">all must-have requirements</strong> including TypeScript, with 5 years of React experience. Jane has strong React skills but lacks TypeScript — a gap that becomes critical when TypeScript is required.
        </p>
        <blockquote className="mt-4 pl-4 border-l-2 border-primary/40 text-body-sm text-on-surface-variant italic">
          "Built production React + TypeScript apps serving 1M+ users" — John Doe resume
        </blockquote>
      </div>
    </div>
  )
}

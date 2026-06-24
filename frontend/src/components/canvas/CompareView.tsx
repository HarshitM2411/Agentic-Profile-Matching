import { useMemo } from 'react'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { Candidate, JobRequirements } from '../../types/agent'
import { MatchScoreRing } from '../ui/MatchScoreRing'
import { Icon } from '../ui/Icon'

const CHART_COLORS = ['#57f1db', '#818cf8', '#fb7185']

interface CompareViewProps {
  candidates: Candidate[]
  scores: Record<string, number>
  requirements: JobRequirements
  insight?: string
}

function buildRadarData(
  candidates: Candidate[],
  requirements: JobRequirements,
  scores: Record<string, number>,
) {
  const dimensions = [
    ...requirements.must_have,
    ...requirements.nice_to_have,
  ].slice(0, 5)

  if (dimensions.length === 0) {
    return { data: [], keys: [] as string[] }
  }

  const keys = candidates.slice(0, 3).map((c) => c.name.split(' ')[0])

  const data = dimensions.map((skill) => {
    const row: Record<string, string | number> = { skill }
    candidates.slice(0, 3).forEach((c, i) => {
      const base = Math.round((scores[c.id] ?? c.score) * 100)
      const hasSkill = c.skills.some(
        (s) => s.toLowerCase().includes(skill.toLowerCase().split(' ')[0]),
      )
      row[keys[i]] = hasSkill ? Math.min(base + 8, 100) : Math.max(base - 20, 20)
    })
    return row
  })

  return { data, keys }
}

export function CompareView({
  candidates,
  scores,
  requirements,
  insight,
}: CompareViewProps) {
  const top3 = candidates.slice(0, 3)
  const { data: radarData, keys: radarKeys } = useMemo(
    () => buildRadarData(top3, requirements, scores),
    [top3, requirements, scores],
  )

  const top = top3[0]
  const runnerUp = top3[1]

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

        {radarData.length > 0 && (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis
                  dataKey="skill"
                  tick={{ fill: '#bacac5', fontSize: 12 }}
                />
                {radarKeys.map((key, i) => (
                  <Radar
                    key={key}
                    name={key}
                    dataKey={key}
                    stroke={CHART_COLORS[i]}
                    fill={CHART_COLORS[i]}
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                ))}
                <Legend wrapperStyle={{ color: '#bacac5', fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {(insight || (top && runnerUp)) && (
        <div className="glass-panel rounded-2xl p-6 border-l-4 border-l-primary">
          <h4 className="font-headline-sm text-primary mb-3 flex items-center gap-2">
            <Icon name="lightbulb" />
            {top ? `Why ${top.name} ranks higher` : 'Comparison insight'}
          </h4>
          <p className="text-body-md text-on-surface leading-relaxed whitespace-pre-line">
            {insight ??
              `${top.name} leads with a ${Math.round((scores[top.id] ?? top.score) * 100)}% match score versus ${runnerUp?.name ?? 'others'}. Review strengths and gaps in each candidate card above.`}
          </p>
          {top?.evidence?.[0] && (
            <blockquote className="mt-4 pl-4 border-l-2 border-primary/40 text-body-sm text-on-surface-variant italic">
              {top.evidence[0]}
            </blockquote>
          )}
        </div>
      )}
    </div>
  )
}

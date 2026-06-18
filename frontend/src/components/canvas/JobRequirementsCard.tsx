import type { JobRequirements } from '../../types/agent'
import { RequirementTag } from '../ui/RequirementTag'
import { Icon } from '../ui/Icon'

interface JobRequirementsCardProps {
  requirements: JobRequirements
  version: number
  editable?: boolean
  onToggle?: (skill: string) => void
  animatingSkill?: string | null
}

export function JobRequirementsCard({
  requirements,
  version,
  editable,
  onToggle,
  animatingSkill,
}: JobRequirementsCardProps) {
  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
          <Icon name="work" className="text-primary" />
          Job Requirements
        </h3>
        <span className="px-2.5 py-1 bg-surface-container-highest border border-outline-variant rounded-full text-[11px] font-mono-data text-on-surface-variant">
          v{version}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-2">
            Must-have
          </p>
          <div className="flex flex-wrap gap-2">
            {requirements.must_have.map((skill) => (
              <RequirementTag
                key={skill}
                label={skill}
                variant="must-have"
                editable={editable}
                onToggle={() => onToggle?.(skill)}
                animating={animatingSkill === skill}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-2">
            Nice-to-have
          </p>
          <div className="flex flex-wrap gap-2">
            {requirements.nice_to_have.map((skill) => (
              <RequirementTag
                key={skill}
                label={skill}
                variant="nice-to-have"
                editable={editable}
                onToggle={() => onToggle?.(skill)}
              />
            ))}
            {editable && (
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg border border-dashed border-outline-variant text-on-surface-variant text-body-sm hover:border-primary/40 hover:text-primary transition-all"
              >
                + Add skill
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-4 pt-2 text-body-sm text-on-surface-variant">
          <span>
            <strong className="text-on-surface">Level:</strong> {requirements.role_level}
          </span>
          <span>
            <strong className="text-on-surface">Domain:</strong> {requirements.domain}
          </span>
        </div>
      </div>
    </div>
  )
}

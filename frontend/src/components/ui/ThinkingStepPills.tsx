import clsx from 'clsx'
import type { ThinkingStep } from '../../types/agent'
import { Icon } from './Icon'

interface ThinkingStepPillsProps {
  steps: ThinkingStep[]
}

export function ThinkingStepPills({ steps }: ThinkingStepPillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center gap-1">
          <span
            className={clsx(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-label-md uppercase tracking-wide border',
              step.status === 'complete' &&
                'bg-primary/10 border-primary/30 text-primary',
              step.status === 'active' &&
                'bg-primary/20 border-primary text-primary animate-pulse',
              step.status === 'pending' &&
                'bg-surface-container border-outline-variant text-outline',
            )}
          >
            {step.status === 'complete' && (
              <Icon name="check" className="text-xs" />
            )}
            {step.status === 'active' && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            )}
            {step.label}
          </span>
          {i < steps.length - 1 && (
            <Icon name="chevron_right" className="text-outline text-sm" />
          )}
        </div>
      ))}
    </div>
  )
}

import clsx from 'clsx'
import { Icon } from './Icon'

interface RequirementTagProps {
  label: string
  variant: 'must-have' | 'nice-to-have'
  editable?: boolean
  onToggle?: () => void
  onRemove?: () => void
  animating?: boolean
}

export function RequirementTag({
  label,
  variant,
  editable,
  onToggle,
  onRemove,
  animating,
}: RequirementTagProps) {
  return (
    <button
      type="button"
      onClick={editable ? onToggle : undefined}
      className={clsx(
        'group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body-sm border transition-all',
        variant === 'must-have'
          ? 'bg-secondary-container/30 border-secondary/40 text-on-secondary-container'
          : 'bg-surface-container-high border-outline-variant text-on-surface-variant',
        editable && 'hover:border-primary/40 cursor-pointer',
        animating && 'animate-pulse ring-2 ring-primary/50',
      )}
    >
      {variant === 'must-have' && (
        <Icon name="priority_high" className="text-sm text-secondary" />
      )}
      <span>{label}</span>
      {editable && onRemove && (
        <Icon
          name="close"
          className="text-sm opacity-0 group-hover:opacity-60 transition-opacity"
        />
      )}
    </button>
  )
}

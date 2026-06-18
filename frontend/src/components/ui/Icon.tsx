import clsx from 'clsx'

interface IconProps {
  name: string
  className?: string
  filled?: boolean
}

export function Icon({ name, className, filled }: IconProps) {
  return (
    <span
      className={clsx(
        'material-symbols-outlined leading-none',
        filled && 'material-symbols-filled',
        className,
      )}
    >
      {name}
    </span>
  )
}

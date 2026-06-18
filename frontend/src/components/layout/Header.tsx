import { Icon } from '../ui/Icon'

export function Header() {
  return (
    <header className="flex justify-between items-center w-full px-gutter h-16 bg-surface-dim/80 backdrop-blur-sm border-b border-outline-variant z-20 relative shrink-0">
      <div className="flex items-center gap-4">
        <div className="text-primary font-headline-md text-headline-md font-bold">
          AirTribe Match Agent
        </div>
        <span className="hidden sm:inline text-body-sm text-on-surface-variant">
          Hire with clarity, not guesswork.
        </span>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-1 bg-surface-container rounded-full border border-outline-variant text-on-surface-variant hover:text-primary transition-colors"
          aria-label="Notifications"
        >
          <Icon name="notifications" className="text-[18px]" />
        </button>
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-1 bg-surface-container rounded-full border border-outline-variant text-on-surface-variant hover:text-primary transition-colors"
          aria-label="Settings"
        >
          <Icon name="settings" className="text-[18px]" />
        </button>
        <div className="w-8 h-8 rounded-full bg-surface-container-highest border border-outline-variant overflow-hidden">
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=recruiter"
            alt="User avatar"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </header>
  )
}

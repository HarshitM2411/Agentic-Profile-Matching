import { NavLink, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { Icon } from '../ui/Icon'
import { useAgentStore } from '../../store/agentStore'

const navItems = [
  { to: '/', icon: 'home', label: 'Home', activeMatch: '/' },
  { to: '/workspace', icon: 'search_check', label: 'Workspace', activeMatch: '/workspace' },
  { to: '/compare', icon: 'compare', label: 'Compare', activeMatch: '/compare' },
  { to: '/refine', icon: 'tune', label: 'Refine', activeMatch: '/refine' },
  { to: '/recommendation', icon: 'verified', label: 'Recommendation', activeMatch: '/recommendation' },
]

export function Sidebar() {
  const navigate = useNavigate()
  const resetSession = useAgentStore((s) => s.resetSession)

  const handleNewSearch = () => {
    resetSession()
    navigate('/')
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-sidebar-width bg-surface-container-low backdrop-blur-md border-r border-outline-variant flex flex-col p-4 gap-stack-gap-md z-30">
      <div className="flex items-center gap-3 px-2 py-4 mb-2">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Icon name="hub" className="text-on-primary text-xl" filled />
        </div>
        <div>
          <h1 className="font-headline-sm text-headline-sm text-primary leading-tight">
            Airtribe AI
          </h1>
          <p className="font-label-md text-label-md text-on-surface-variant opacity-70">
            Collaborative Intelligence
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleNewSearch}
        className="w-full py-3 bg-primary text-on-primary rounded-lg font-headline-sm text-[16px] flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98] mb-4"
      >
        <Icon name="add" className="text-lg" />
        New Search
      </button>

      <nav className="flex flex-col gap-1 flex-grow">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-label-md text-label-md',
                isActive
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'text-on-surface-variant hover:bg-surface-container-highest',
              )
            }
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-1 border-t border-outline-variant/30 pt-4">
        <a
          href="#help"
          className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:bg-surface-container-highest rounded-lg transition-all font-label-md text-label-md"
        >
          <Icon name="help" />
          <span>Help</span>
        </a>
        <a
          href="#feedback"
          className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:bg-surface-container-highest rounded-lg transition-all font-label-md text-label-md"
        >
          <Icon name="rate_review" />
          <span>Feedback</span>
        </a>
      </div>
    </aside>
  )
}

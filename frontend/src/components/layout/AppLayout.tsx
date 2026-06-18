import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Footer } from './Footer'
import { Toast } from '../ui/Toast'
import { useAgentStore } from '../../store/agentStore'
import { useEffect } from 'react'

interface AppLayoutProps {
  showSidebar?: boolean
  fullHeight?: boolean
}

export function AppLayout({ showSidebar = true, fullHeight = false }: AppLayoutProps) {
  const toast = useAgentStore((s) => s.toast)
  const dismissToast = useAgentStore((s) => s.dismissToast)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(dismissToast, 4000)
    return () => clearTimeout(timer)
  }, [toast, dismissToast])

  return (
    <div className={fullHeight ? 'flex h-screen overflow-hidden' : 'min-h-screen flex flex-col'}>
      {showSidebar && <Sidebar />}
      <main
        className={
          showSidebar
            ? fullHeight
              ? 'ml-sidebar-width flex-1 flex flex-col overflow-hidden'
              : 'ml-sidebar-width flex-grow flex flex-col relative min-h-screen'
            : 'flex-grow flex flex-col'
        }
      >
        <Header />
        <div className={fullHeight ? 'flex-1 flex flex-col overflow-hidden' : 'flex-grow flex flex-col'}>
          <Outlet />
        </div>
        <Footer />
      </main>
      {toast && (
        <Toast
          message={toast.message}
          subtitle={toast.subtitle}
          onDismiss={dismissToast}
        />
      )}
    </div>
  )
}

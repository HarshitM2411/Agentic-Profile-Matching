import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from './Icon'

interface ToastProps {
  message: string
  subtitle?: string
  onDismiss: () => void
}

export function Toast({ message, subtitle, onDismiss }: ToastProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        className="fixed bottom-12 right-12 glass-panel px-6 py-4 rounded-2xl flex items-center gap-3 z-[100]"
      >
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shrink-0">
          <Icon name="check" className="text-on-primary text-lg" />
        </div>
        <div className="flex-1">
          <p className="font-label-md text-on-surface">{message}</p>
          {subtitle && (
            <p className="text-[10px] text-on-surface-variant">{subtitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-on-surface-variant hover:text-primary"
          aria-label="Dismiss"
        >
          <Icon name="close" className="text-lg" />
        </button>
      </motion.div>
    </AnimatePresence>
  )
}

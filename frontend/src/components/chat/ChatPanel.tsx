import { useEffect, useRef } from 'react'
import type { ChatMessage } from '../../types/agent'
import { Icon } from '../ui/Icon'
import { ThinkingStepPills } from '../ui/ThinkingStepPills'

interface ChatPanelProps {
  messages: ChatMessage[]
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatPanel({
  messages,
  onSend,
  disabled,
  placeholder = 'Ask about candidates, compare matches, refine criteria...',
}: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = () => {
    const value = inputRef.current?.value.trim()
    if (!value || disabled) return
    onSend(value)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <section className="w-sidebar-width bg-surface-container-low border-r border-outline-variant flex flex-col relative shrink-0">
      <div className="p-6 flex-1 overflow-y-auto space-y-6 custom-scrollbar relative z-10">
        {messages.length === 0 && (
          <div className="text-on-surface-variant text-body-sm italic">
            Start a conversation to screen candidates.
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col gap-2">
            {msg.role === 'user' ? (
              <div className="flex justify-end">
                <div className="bg-surface-container-high border border-outline-variant px-4 py-3 rounded-2xl rounded-tr-none max-w-[90%] text-body-sm">
                  {msg.content}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Icon name="smart_toy" className="text-primary" />
                  <span className="font-label-md text-primary">AirTribe Agent</span>
                </div>
                {msg.thinkingSteps && (
                  <ThinkingStepPills steps={msg.thinkingSteps} />
                )}
                <div className="bg-primary-container/10 border border-primary/20 p-4 rounded-2xl rounded-tl-none shadow-lg">
                  <p className="font-body-md text-on-surface leading-relaxed whitespace-pre-line">
                    {msg.content}
                  </p>
                </div>
                {msg.quickActions && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {msg.quickActions.map((action) => (
                      <button
                        key={action}
                        type="button"
                        onClick={() => onSend(action)}
                        className="px-3 py-1.5 bg-surface-container border border-outline-variant hover:border-primary/40 rounded-lg text-body-sm text-on-surface-variant hover:text-primary transition-all"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-6 border-t border-outline-variant bg-surface-container-low/50 backdrop-blur-md">
        <div className="relative">
          {disabled ? (
            <div className="w-full bg-surface-container-highest/50 border border-outline-variant rounded-xl p-3 pr-12 text-on-surface-variant flex items-center italic">
              Search finalized...
            </div>
          ) : (
            <textarea
              ref={inputRef}
              rows={2}
              placeholder={placeholder}
              className="w-full bg-surface-container border border-outline-variant rounded-xl p-3 pr-12 text-on-surface placeholder:text-outline/60 resize-none focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 custom-scrollbar"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
            />
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={disabled}
            className="absolute right-2 bottom-2 w-8 h-8 bg-primary text-on-primary rounded-lg flex items-center justify-center hover:opacity-90 disabled:opacity-40"
            aria-label="Send message"
          >
            <Icon name="send" className="text-lg" />
          </button>
        </div>
      </div>
    </section>
  )
}

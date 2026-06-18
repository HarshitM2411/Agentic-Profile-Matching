import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SUGGESTION_CHIPS } from '../data/mockData'
import { useAgentStore } from '../store/agentStore'
import { Icon } from '../components/ui/Icon'

export function DashboardPage() {
  const navigate = useNavigate()
  const startSearch = useAgentStore((s) => s.startSearch)
  const [query, setQuery] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const handleStart = (text?: string) => {
    const q = (text ?? query).trim()
    if (!q) return
    startSearch(q)
    navigate('/workspace')
  }

  return (
    <section className="flex-grow flex flex-col items-center justify-center px-gutter relative z-10 py-12">
      <div className="max-w-[720px] w-full flex flex-col items-center text-center">
        <div className="mb-8 flex items-center gap-2 px-4 py-1.5 bg-surface-container border border-primary/20 rounded-full text-primary font-mono-data text-mono-data animate-pulse-slow">
          <span className="w-2 h-2 rounded-full bg-primary" />
          SYSTEMS ACTIVE: READY TO MATCH
        </div>

        <h2 className="font-display-lg text-display-lg text-on-surface mb-6 leading-tight tracking-tight">
          Paste a job description or tell me what you&apos;re hiring for.
        </h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant mb-12 max-w-[600px]">
          I&apos;ll parse your JD, search resumes, rank matches, and explain every decision.
        </p>

        <div
          className={`w-full glass-panel ambient-glow rounded-2xl p-6 mb-10 transition-all ${
            dragOver ? 'bg-primary/5 scale-[1.01] border-primary/50' : ''
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const file = e.dataTransfer.files[0]
            if (file) {
              file.text().then((text) => setQuery(text.slice(0, 2000)))
            }
          }}
        >
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-48 bg-transparent border-none text-on-surface font-body-md text-body-md placeholder:text-outline/60 focus:outline-none resize-none custom-scrollbar mb-4"
            placeholder="Paste your JD or query here (e.g. 'Find React devs with 3+ years experience...')"
          />
          <div className="flex items-center justify-between border-t border-outline-variant/30 pt-4 flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 px-3 py-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-all cursor-pointer">
                <Icon name="upload_file" className="text-[20px]" />
                <span className="font-label-md text-label-md">Upload JD File</span>
                <input
                  type="file"
                  accept=".txt,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) file.text().then((text) => setQuery(text.slice(0, 2000)))
                  }}
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => handleStart()}
              className="bg-primary text-on-primary px-6 py-2.5 rounded-lg font-headline-sm text-[16px] hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-primary/10"
            >
              Start Analysis
              <Icon name="arrow_forward" className="text-[20px]" />
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 w-full">
          <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest opacity-60">
            Try asking for
          </span>
          <div className="flex flex-wrap justify-center gap-3">
            {SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleStart(chip)}
                className="px-4 py-2 bg-surface-container border border-outline-variant hover:border-primary/40 hover:bg-surface-container-high rounded-lg text-on-surface transition-all font-body-sm text-body-sm"
              >
                &quot;{chip}&quot;
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 right-12 w-64 opacity-20 pointer-events-none hidden lg:block">
        <div className="font-mono-data text-[11px] text-primary flex flex-col gap-1.5 border-l border-primary/30 pl-4 py-4">
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 bg-primary rounded-full animate-pulse" />
            <span>&gt; INITIALIZING_AGENT_CORE...</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 bg-primary/40 rounded-full" />
            <span>&gt; SYNCING_POOL_V2_4...</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 bg-primary/40 rounded-full" />
            <span>&gt; AWAITING_INPUT_SIGNAL</span>
          </div>
        </div>
      </div>
    </section>
  )
}

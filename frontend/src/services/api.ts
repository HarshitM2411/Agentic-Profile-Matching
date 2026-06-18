import type { AgentState } from '../types/agent'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

export interface ChatResponse {
  state: Partial<AgentState>
  message: string
}

/** POST /api/chat — send user message, receive updated agent state */
export async function sendChatMessage(
  message: string,
  sessionId?: string,
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id: sessionId }),
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

/** GET /api/state — fetch current session state */
export async function fetchAgentState(sessionId: string): Promise<Partial<AgentState>> {
  const res = await fetch(`${API_BASE}/state/${sessionId}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

import type { BackendAgentState } from './stateMapper'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

const SESSION_KEY = 'airtribe_session_id'

export function getStoredSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY)
}

export function storeSessionId(sessionId: string): void {
  localStorage.setItem(SESSION_KEY, sessionId)
}

export function clearStoredSessionId(): void {
  localStorage.removeItem(SESSION_KEY)
}

export interface ChatResponse {
  session_id: string
  message: string
  state: BackendAgentState
}

/** POST /api/chat — send user message, receive updated agent state */
export async function sendChatMessage(
  message: string,
  sessionId?: string,
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id: sessionId ?? null }),
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(detail || `API error: ${res.status}`)
  }
  return res.json()
}

/** GET /api/state — fetch current session state */
export async function fetchAgentState(sessionId: string): Promise<BackendAgentState> {
  const res = await fetch(`${API_BASE}/state/${sessionId}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

/** DELETE /api/session — clear server-side session */
export async function deleteSession(sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/session/${sessionId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
}

/** GET /api/health — verify backend is reachable */
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`)
    return res.ok
  } catch {
    return false
  }
}

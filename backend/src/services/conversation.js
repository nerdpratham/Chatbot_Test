// In-memory session store. Replace with Redis/DB for production.
const sessions = new Map()

const MAX_HISTORY = 100  // messages per session

export function getSession(sessionId) {
  return sessions.get(sessionId) ?? []
}

export function appendToSession(sessionId, message) {
  const history = sessions.get(sessionId) ?? []
  history.push(message)
  if (history.length > MAX_HISTORY) {
    // Drop oldest pairs to stay within limit while preserving message pairing
    history.splice(0, 2)
  }
  sessions.set(sessionId, history)
}

export function deleteSession(sessionId) {
  sessions.delete(sessionId)
}

const BASE_URL = '/api'

/**
 * Sends a message and streams the assistant reply via SSE.
 * Calls `onChunk` for each text delta received.
 */
export async function sendMessageStream({ sessionId, content }, onChunk) {
  const res = await fetch(`${BASE_URL}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, content }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Server error ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() // incomplete line stays in buffer

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') return
        try {
          const { delta } = JSON.parse(payload)
          if (delta) onChunk(delta)
        } catch {
          // malformed event — skip
        }
      }
    }
  }
}

export async function clearSession(sessionId) {
  const res = await fetch(`${BASE_URL}/chat/${sessionId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to clear session')
}

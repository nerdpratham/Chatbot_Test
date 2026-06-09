import { useState, useCallback, useRef } from 'react'
import { sendMessageStream, clearSession } from '../services/api'

const SESSION_KEY = 'chatbot_session_id'

function getSessionId() {
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}

export function useChat() {
  const [messages, setMessages] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState(null)
  const sessionId = useRef(getSessionId())

  const sendMessage = useCallback(async (content) => {
    setError(null)

    const userMsg = { id: crypto.randomUUID(), role: 'user', content }
    setMessages(prev => [...prev, userMsg])

    const assistantMsg = { id: crypto.randomUUID(), role: 'assistant', content: '', properties: [] }
    setMessages(prev => [...prev, assistantMsg])
    setIsStreaming(true)

    const updateLast = (patch) => {
      setMessages(prev => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        updated[updated.length - 1] = { ...last, ...patch(last) }
        return updated
      })
    }

    try {
      await sendMessageStream(
        { sessionId: sessionId.current, content },
        {
          onChunk: (chunk) => updateLast(last => ({ content: last.content + chunk })),
          onProperties: (properties) => updateLast(() => ({ properties })),
        },
      )
    } catch (err) {
      setError(err.message ?? 'Something went wrong. Please try again.')
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setIsStreaming(false)
    }
  }, [])

  const clearHistory = useCallback(async () => {
    try {
      await clearSession(sessionId.current)
    } catch {
      // best-effort; clear locally regardless
    }
    setMessages([])
    setError(null)
  }, [])

  return { messages, isStreaming, error, sendMessage, clearHistory }
}

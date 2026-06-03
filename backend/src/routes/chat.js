import { Router } from 'express'
import { getSession, appendToSession, deleteSession } from '../services/conversation.js'
import { streamLLMResponse } from '../services/llm.js'

const router = Router()

// POST /api/chat/stream — streaming chat endpoint (SSE)
router.post('/stream', async (req, res) => {
  const { sessionId, content } = req.body
  if (!sessionId || !content?.trim()) {
    return res.status(400).json({ error: 'sessionId and content are required' })
  }

  const history = getSession(sessionId)
  appendToSession(sessionId, { role: 'user', content: content.trim() })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  let fullResponse = ''

  try {
    await streamLLMResponse(
      [...history, { role: 'user', content: content.trim() }],
      (delta) => {
        fullResponse += delta
        res.write(`data: ${JSON.stringify({ delta })}\n\n`)
      },
    )

    appendToSession(sessionId, { role: 'assistant', content: fullResponse })
    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    console.error('LLM error:', err)
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
})

// GET /api/chat/:sessionId — fetch conversation history
router.get('/:sessionId', (req, res) => {
  const history = getSession(req.params.sessionId)
  res.json({ history })
})

// DELETE /api/chat/:sessionId — clear conversation
router.delete('/:sessionId', (req, res) => {
  deleteSession(req.params.sessionId)
  res.json({ success: true })
})

export default router

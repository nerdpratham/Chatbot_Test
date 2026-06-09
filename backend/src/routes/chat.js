import { Router } from 'express'
import { getSession, appendToSession, deleteSession } from '../services/conversation.js'
import { streamLLMResponse } from '../services/llm.js'
import { extractRequirements, findMissingFields, buildFollowUp } from '../services/requirements.js'
import { searchProperties } from '../services/propertyStore.js'
import { buildGroundedSystemPrompt } from '../services/realEstateAgent.js'

const router = Router()

const sse = (res, obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`)

// POST /api/chat/stream — RAG real-estate chat endpoint (SSE)
router.post('/stream', async (req, res, next) => {
  try {
    const { sessionId, content } = req.body
    if (!sessionId || !content?.trim()) {
      return res.status(400).json({ error: 'sessionId and content are required' })
    }

    appendToSession(sessionId, { role: 'user', content: content.trim() })
    const history = getSession(sessionId)

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    let fullResponse = ''
    const write = (text) => { fullResponse += text; sse(res, { delta: text }) }

    try {
      // 1. Understand the requirement from the whole conversation.
      const requirements = await extractRequirements(history)

      // 2. Gate: enough info to search? If not, ask a follow-up and stop.
      const missing = findMissingFields(requirements)
      if (missing.length > 0) {
        write(buildFollowUp(missing))
      } else {
        // 3. Retrieve matching properties from the data folder.
        const matches = searchProperties(requirements)

        // 3a. Send the structured matches so the UI can render them as cards.
        if (matches.length > 0) {
          sse(res, { properties: matches })
        }

        // 4. Ground the LLM on the matched properties and stream a short intro.
        const systemPrompt = buildGroundedSystemPrompt(requirements, matches)
        await streamLLMResponse(history, write, systemPrompt)
      }

      appendToSession(sessionId, { role: 'assistant', content: fullResponse })
      res.write('data: [DONE]\n\n')
      res.end()
    } catch (err) {
      // Headers already flushed — surface the error as an SSE event.
      console.error('Chat pipeline error:', err.message)
      sse(res, { error: err.message })
      res.end()
    }
  } catch (err) {
    // Headers not yet sent — pass to Express error handler.
    next(err)
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

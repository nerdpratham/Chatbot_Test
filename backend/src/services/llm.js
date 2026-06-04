import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'

// Read at call-time so .env changes take effect on restart without code edits
// Active model: gemini-2.5-flash-lite
const getProvider = () => process.env.LLM_PROVIDER ?? 'anthropic'
const getModel = () => process.env.LLM_MODEL ?? 'claude-sonnet-4-6'
const getSystemPrompt = () => process.env.SYSTEM_PROMPT ?? 'You are a helpful assistant.'

// Lazy singletons — only the active provider's client is created
let anthropicClient
let openaiClient
let geminiClient

function getAnthropicClient() {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return anthropicClient
}

function getOpenAIClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openaiClient
}

function getGeminiClient() {
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  }
  return geminiClient
}

/**
 * Streams an LLM response for the given message history.
 * Calls `onDelta` with each text chunk as it arrives.
 *
 * @param {Array}  messages       - [{ role, content }]
 * @param {Function} onDelta      - called with each text chunk
 * @param {string} [systemOverride] - overrides the env system prompt for this call
 */
export async function streamLLMResponse(messages, onDelta, systemOverride) {
  const provider = getProvider()
  const system = systemOverride ?? getSystemPrompt()
  switch (provider) {
    case 'anthropic': return streamAnthropic(messages, onDelta, system)
    case 'openai':    return streamOpenAI(messages, onDelta, system)
    case 'gemini':    return streamGemini(messages, onDelta, system)
    default:
      throw new Error(`Unknown LLM_PROVIDER: "${provider}". Use "anthropic", "openai", or "gemini".`)
  }
}

/**
 * Non-streaming completion that returns the full response as a string.
 * Used for internal tasks like requirement extraction.
 */
export async function generateText(messages, systemOverride) {
  const provider = getProvider()
  const system = systemOverride ?? getSystemPrompt()
  switch (provider) {
    case 'anthropic': return completeAnthropic(messages, system)
    case 'openai':    return completeOpenAI(messages, system)
    case 'gemini':    return completeGemini(messages, system)
    default:
      throw new Error(`Unknown LLM_PROVIDER: "${provider}". Use "anthropic", "openai", or "gemini".`)
  }
}

// ── Anthropic ────────────────────────────────────────────────────────────────
async function streamAnthropic(messages, onDelta, system) {
  const stream = await getAnthropicClient().messages.stream({
    model: getModel(),
    max_tokens: 4096,
    system,
    messages,
  })
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      onDelta(event.delta.text)
    }
  }
}

async function completeAnthropic(messages, system) {
  const resp = await getAnthropicClient().messages.create({
    model: getModel(),
    max_tokens: 1024,
    system,
    messages,
  })
  return resp.content.map(b => (b.type === 'text' ? b.text : '')).join('')
}

// ── OpenAI ───────────────────────────────────────────────────────────────────
async function streamOpenAI(messages, onDelta, system) {
  const stream = await getOpenAIClient().chat.completions.create({
    model: getModel() || 'gpt-4o',
    messages: [{ role: 'system', content: system }, ...messages],
    stream: true,
  })
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) onDelta(delta)
  }
}

async function completeOpenAI(messages, system) {
  const resp = await getOpenAIClient().chat.completions.create({
    model: getModel() || 'gpt-4o',
    messages: [{ role: 'system', content: system }, ...messages],
  })
  return resp.choices[0]?.message?.content ?? ''
}

// ── Gemini ───────────────────────────────────────────────────────────────────
function toGeminiContents(messages) {
  return messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
}

async function streamGemini(messages, onDelta, system) {
  const stream = await getGeminiClient().models.generateContentStream({
    model: getModel() || 'gemini-2.0-flash',
    config: { systemInstruction: system },
    contents: toGeminiContents(messages),
  })
  for await (const chunk of stream) {
    const text = chunk.text
    if (text) onDelta(text)
  }
}

async function completeGemini(messages, system) {
  const resp = await getGeminiClient().models.generateContent({
    model: getModel() || 'gemini-2.0-flash',
    config: { systemInstruction: system },
    contents: toGeminiContents(messages),
  })
  return resp.text ?? ''
}

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

const provider = process.env.LLM_PROVIDER ?? 'anthropic'
const model = process.env.LLM_MODEL ?? 'claude-sonnet-4-6'
const systemPrompt = process.env.SYSTEM_PROMPT ?? 'You are a helpful assistant.'

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
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  }
  return geminiClient
}

/**
 * Streams an LLM response for the given message history.
 * Calls `onDelta` with each text chunk as it arrives.
 *
 * Set LLM_PROVIDER in .env to: "anthropic" | "openai" | "gemini"
 */
export async function streamLLMResponse(messages, onDelta) {
  switch (provider) {
    case 'anthropic': return streamAnthropic(messages, onDelta)
    case 'openai':    return streamOpenAI(messages, onDelta)
    case 'gemini':    return streamGemini(messages, onDelta)
    default:
      throw new Error(`Unknown LLM_PROVIDER: "${provider}". Use "anthropic", "openai", or "gemini".`)
  }
}

async function streamAnthropic(messages, onDelta) {
  const stream = await getAnthropicClient().messages.stream({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      onDelta(event.delta.text)
    }
  }
}

async function streamOpenAI(messages, onDelta) {
  const stream = await getOpenAIClient().chat.completions.create({
    model: model || 'gpt-4o',
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    stream: true,
  })

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) onDelta(delta)
  }
}

async function streamGemini(messages, onDelta) {
  const genModel = getGeminiClient().getGenerativeModel({
    model: model || 'gemini-1.5-flash',
    systemInstruction: systemPrompt,
  })

  // Gemini uses role "model" instead of "assistant", and wraps content in parts
  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  const lastMessage = messages[messages.length - 1].content

  const chat = genModel.startChat({ history })
  const result = await chat.sendMessageStream(lastMessage)

  for await (const chunk of result.stream) {
    const text = chunk.text()
    if (text) onDelta(text)
  }
}

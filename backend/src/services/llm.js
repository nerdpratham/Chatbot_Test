import Anthropic from '@anthropic-ai/sdk'

const provider = process.env.LLM_PROVIDER ?? 'anthropic'
const model = process.env.LLM_MODEL ?? 'claude-sonnet-4-6'
const systemPrompt = process.env.SYSTEM_PROMPT ?? 'You are a helpful assistant.'

let anthropicClient

function getAnthropicClient() {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return anthropicClient
}

/**
 * Streams an LLM response for the given message history.
 * Calls `onDelta` for each text chunk received.
 */
export async function streamLLMResponse(messages, onDelta) {
  if (provider === 'anthropic') {
    return streamAnthropic(messages, onDelta)
  }
  throw new Error(`Unsupported LLM provider: "${provider}". Add a handler in llm.js.`)
}

async function streamAnthropic(messages, onDelta) {
  const client = getAnthropicClient()

  const stream = await client.messages.stream({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  })

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      onDelta(event.delta.text)
    }
  }
}

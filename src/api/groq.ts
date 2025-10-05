import axios from 'axios'

export interface GroqItemSummary {
  name: string
  quantity?: number
  unit?: string
  expiresInDays?: number | null
  category?: string
  status: 'active' | 'consumed'
  consumedAt?: string
}

export interface GroqAssistantPayload {
  activeItems: GroqItemSummary[]
  consumedItems: GroqItemSummary[]
  householdName?: string
}

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions'
const DEFAULT_MODEL = 'llama3-8b-8192'

export async function fetchGroqAssistantSuggestions(payload: GroqAssistantPayload): Promise<string> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY

  if (!apiKey) {
    throw new Error('Missing Groq API key. Please set VITE_GROQ_API_KEY in your environment.')
  }

  const messages = buildMessages(payload)

  const response = await axios.post(
    GROQ_CHAT_URL,
    {
      model: DEFAULT_MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 512
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  )

  const content = response.data?.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('Groq response did not include any advice. Please try again later.')
  }

  return content.trim()
}

interface GroqMessage {
  role: 'system' | 'user'
  content: string
}

function buildMessages(payload: GroqAssistantPayload): GroqMessage[] {
  const { activeItems, consumedItems, householdName } = payload

  const inventoryLines = formatItems(activeItems)
  const consumedLines = formatItems(consumedItems)

  const userPromptParts: string[] = []

  userPromptParts.push(
    householdName
      ? `Household name: ${householdName}`
      : 'Household name is not specified.'
  )

  userPromptParts.push(
    inventoryLines.length > 0
      ? `Current inventory (max 12 items):\n${inventoryLines.join('\n')}`
      : 'Current inventory list is empty.'
  )

  userPromptParts.push(
    consumedLines.length > 0
      ? `Items consumed in the past 3 days (max 10 items):\n${consumedLines.join('\n')}`
      : 'No items have been consumed in the past 3 days.'
  )

  userPromptParts.push(
    'Provide concise nutritional and low-carbon shopping or consumption suggestions tailored to the available ingredients above. '
    + 'Highlight quick wins to reduce waste and improve nutritional balance, and include a short carbon footprint tip at the end.'
  )

  return [
    {
      role: 'system',
      content:
        'You are UseItUp\'s sustainability assistant. Analyse household food inventory and very recent consumption to recommend balanced meal ideas, '
        + 'smart shopping reminders, and actions that lower carbon footprint. Respond with actionable bullet points (max 4) and conclude with a single carbon tip.'
    },
    {
      role: 'user',
      content: userPromptParts.join('\n\n')
    }
  ]
}

function formatItems(items: GroqItemSummary[]): string[] {
  return items.map((item, index) => {
    const baseLabel = `${index + 1}. ${item.name}`
    const detailParts: string[] = []

    if (item.quantity != null && Number.isFinite(item.quantity)) {
      detailParts.push(`${item.quantity}${item.unit ? ` ${item.unit}` : ''}`.trim())
    }

    if (item.expiresInDays != null) {
      if (item.expiresInDays < 0) {
        detailParts.push('expired')
      } else if (item.expiresInDays === 0) {
        detailParts.push('expires today')
      } else if (item.expiresInDays === 1) {
        detailParts.push('expires in 1 day')
      } else {
        detailParts.push(`expires in ${item.expiresInDays} days`)
      }
    }

    if (item.status === 'consumed' && item.consumedAt) {
      detailParts.push(`consumed at ${item.consumedAt}`)
    }

    if (item.category) {
      detailParts.push(item.category)
    }

    const details = detailParts.length > 0 ? ` (${detailParts.join(', ')})` : ''

    return `${baseLabel}${details}`
  })
}

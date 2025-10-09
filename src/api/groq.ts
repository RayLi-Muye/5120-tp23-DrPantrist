import axios from 'axios'
import inventoryAPI from '@/api/inventory'

export interface GroqAssistantRequest {
  loginCode: string
  householdName?: string
}

interface GroqChatMessage {
  role: 'system' | 'user'
  content: string
}

const DEFAULT_LAMBDA_URL = 'https://lzfj5zwzzj.execute-api.ap-southeast-2.amazonaws.com/groq'
const ASSISTANT_URL = import.meta.env.VITE_GROQ_ASSISTANT_URL || DEFAULT_LAMBDA_URL

export async function fetchGroqAssistantSuggestions(
  request: GroqAssistantRequest
): Promise<string> {
  const loginCode = request.loginCode?.trim()
  if (!loginCode) {
    throw new Error('Missing login code. Please sign in again to use the assistant.')
  }

  const items = await inventoryAPI.getInventoryByLoginCode(loginCode)
  const groceryNames = dedupeNames(items.map(item => item.name).filter(Boolean))

  const messages = buildMessages(groceryNames, request.householdName)

  const response = await axios.post(
    ASSISTANT_URL,
    {
      messages
    },
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  )

  const content = response.data?.choices?.[0]?.message?.content

  if (!content || typeof content !== 'string') {
    throw new Error('The assistant did not return any suggestions. Please try again later.')
  }

  return content.trim()
}

function buildMessages(names: string[], householdName?: string): GroqChatMessage[] {
  const safeHouseholdName = householdName?.trim() || 'Dr.Pantrist household'
  const inventoryList = names.length > 0
    ? names.map((name, index) => `${index + 1}. ${name}`).join('\n')
    : 'No items currently in stock.'

  const userPrompt = [
    `Household: ${safeHouseholdName}`,
    'Here is the current grocery inventory list:',
    inventoryList,
    '',
    'Please recommend up to three new grocery items to purchase soon.',
    'Balance nutritional variety and a lower carbon footprint.',
    'Consider the listed items so you avoid duplicates and reduce waste.',
    'Keep the reply concise (under 80 words) with clear bullet points and finish with a single sustainability tip.'
  ].join('\n')

  return [
    {
      role: 'system',
      content:
        'You are Dr.Pantrist\'s sustainability assistant. You help households plan their next grocery purchases while minimising food waste, '
        + 'supporting balanced nutrition, and lowering carbon footprint. Keep answers practical, friendly, and brief.'
    },
    {
      role: 'user',
      content: userPrompt
    }
  ]
}

function dedupeNames(names: string[]): string[] {
  const seen = new Set<string>()
  const unique: string[] = []

  for (const name of names) {
    const trimmed = name.trim()
    if (!trimmed) continue

    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    unique.push(trimmed)
  }

  return unique
}

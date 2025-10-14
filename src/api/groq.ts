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
    'Current grocery inventory list:',
    inventoryList,
    '',
    'Task: Act as a household grocery planner.',
    '1. Suggest two to four grocery items to purchase in the next week. Avoid duplicates with the current items and highlight anything low in stock.',
    '2. For each suggestion, include a reason that references nutrition balance, meal planning opportunities, or reducing waste.',
    '3. Add a short section titled "Carbon footprint insight" that shares a practical sustainability fact tied to the recommendations.',
    '4. Close with an encouraging action-oriented sentence that summarises the next steps.',
    'Format: Use clear headings and bullet points where useful. Aim for a thorough response (roughly 120-180 words) that stays friendly and easy to skim.'
  ].join('\n')

  return [
    {
      role: 'system',
      content:
        'You are Dr.Pantrist\'s sustainability assistant. You help households plan their next grocery purchases while minimising food waste, '
        + 'supporting balanced nutrition, and lowering carbon footprint. Provide warm, practical, and well-developed guidance that references the specific inventory when helpful.'
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

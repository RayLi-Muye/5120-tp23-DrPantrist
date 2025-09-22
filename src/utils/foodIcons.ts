// Food icon resolution helpers
// Centralized mapping to keep item/category icons consistent.

export interface FoodIconInput {
  name?: string | null
  categoryId?: number | null
  category?: string | null
}

interface IconRule {
  keywords: string[]
  icon: string
}

const NAME_ICON_RULES: IconRule[] = [
  { keywords: ['milk', 'dairy', 'latte'], icon: '🥛' },
  { keywords: ['bread', 'baguette', 'toast'], icon: '🥖' },
  { keywords: ['egg', 'omelette'], icon: '🥚' },
  { keywords: ['butter'], icon: '🧈' },
  { keywords: ['yogurt', 'yoghurt'], icon: '🥣' },
  { keywords: ['cheese'], icon: '🧀' },
  { keywords: ['cream'], icon: '🍶' },
  { keywords: ['banana'], icon: '🍌' },
  { keywords: ['apple'], icon: '🍎' },
  { keywords: ['orange'], icon: '🍊' },
  { keywords: ['lemon'], icon: '🍋' },
  { keywords: ['lime'], icon: '🍈' },
  { keywords: ['berry', 'blueberry', 'strawberry', 'raspberry'], icon: '🫐' },
  { keywords: ['grape'], icon: '🍇' },
  { keywords: ['melon'], icon: '🍈' },
  { keywords: ['pineapple'], icon: '🍍' },
  { keywords: ['avocado'], icon: '🥑' },
  { keywords: ['tomato'], icon: '🍅' },
  { keywords: ['carrot'], icon: '🥕' },
  { keywords: ['potato'], icon: '🥔' },
  { keywords: ['lettuce', 'salad', 'greens'], icon: '🥬' },
  { keywords: ['broccoli'], icon: '🥦' },
  { keywords: ['cabbage'], icon: '🥬' },
  { keywords: ['spinach'], icon: '🥬' },
  { keywords: ['pepper', 'capsicum', 'chilli', 'chili'], icon: '🌶️' },
  { keywords: ['onion'], icon: '🧅' },
  { keywords: ['garlic'], icon: '🧄' },
  { keywords: ['cucumber'], icon: '🥒' },
  { keywords: ['mushroom'], icon: '🍄' },
  { keywords: ['chicken'], icon: '🍗' },
  { keywords: ['beef', 'steak'], icon: '🥩' },
  { keywords: ['pork', 'bacon'], icon: '🥓' },
  { keywords: ['sausage'], icon: '🌭' },
  { keywords: ['tofu'], icon: '🍢' },
  { keywords: ['fish', 'salmon', 'tuna'], icon: '🐟' },
  { keywords: ['shrimp', 'prawn'], icon: '🍤' },
  { keywords: ['rice'], icon: '🍚' },
  { keywords: ['pasta', 'spaghetti', 'noodle'], icon: '🍝' },
  { keywords: ['noodle', 'ramen'], icon: '🍜' },
  { keywords: ['cereal', 'oat', 'granola'], icon: '🥣' },
  { keywords: ['soup', 'broth'], icon: '🥣' },
  { keywords: ['coffee'], icon: '☕' },
  { keywords: ['tea'], icon: '🫖' },
  { keywords: ['juice'], icon: '🧃' },
  { keywords: ['soda', 'cola'], icon: '🥤' },
  { keywords: ['water'], icon: '🚰' },
  { keywords: ['oil'], icon: '🫗' },
  { keywords: ['sauce'], icon: '🧂' },
  { keywords: ['snack', 'chips'], icon: '🍿' },
  { keywords: ['chocolate'], icon: '🍫' },
  { keywords: ['ice cream', 'gelato'], icon: '🍨' },
  { keywords: ['cake'], icon: '🍰' },
  { keywords: ['cookie'], icon: '🍪' },
  { keywords: ['walnut', 'almond', 'nut'], icon: '🥜' }
]

const CATEGORY_ICON_MAP: Record<number, string> = {
  1: '🥛',
  2: '🥐',
  5: '🥤',
  6: '🧂',
  7: '🥛',
  8: '🧊',
  9: '🌾',
  10: '🥩',
  12: '🍖',
  14: '🍗',
  15: '🍗',
  18: '🍎',
  19: '🥦',
  20: '🐟',
  22: '🐟',
  23: '🥫'
}

const CATEGORY_NAME_ICON_MAP: Record<string, string> = {
  dairy: '🥛',
  bakery: '🥐',
  beverages: '🥤',
  condiments: '🧂',
  frozen: '🧊',
  grains: '🌾',
  meat: '🥩',
  poultry: '🍗',
  fruit: '🍎',
  fruits: '🍎',
  vegetable: '🥦',
  vegetables: '🥦',
  seafood: '🐟',
  pantry: '🥫',
  snacks: '🍿',
  dessert: '🍰',
  sweets: '🍭',
  household: '🧴'
}

/**
 * Resolve the best matching icon for a food item based on name/category.
 */
export function getFoodIcon({ name, categoryId, category }: FoodIconInput): string {
  const normalizedName = name?.trim().toLowerCase() ?? ''

  if (normalizedName) {
    const rule = NAME_ICON_RULES.find(({ keywords }) =>
      keywords.some(keyword => normalizedName.includes(keyword))
    )
    if (rule) {
      return rule.icon
    }
  }

  const iconById = categoryId != null ? CATEGORY_ICON_MAP[categoryId] : undefined
  if (iconById) {
    return iconById
  }

  if (category) {
    const normalizedCategory = category.trim().toLowerCase()
    const byName = CATEGORY_NAME_ICON_MAP[normalizedCategory]
    if (byName) {
      return byName
    }
  }

  return '🛒'
}

/**
 * Convenience wrapper to fetch a fallback icon purely from category data.
 */
export function getCategoryIcon(category: string | number | undefined): string {
  if (typeof category === 'number') {
    return CATEGORY_ICON_MAP[category] ?? '🛒'
  }

  if (typeof category === 'string') {
    const normalized = category.trim().toLowerCase()
    return CATEGORY_NAME_ICON_MAP[normalized] ?? '🛒'
  }

  return '🛒'
}

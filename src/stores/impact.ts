// Impact Store
// Use-It-Up PWA Frontend

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import inventoryAPI, { type ImpactData, type TotalImpactData, type ImpactStats, InventoryAPIError } from '@/api/inventory'
import { formatCurrency, formatCO2, getCO2Comparison } from '@/utils/formatters'
import { subDays, format, differenceInCalendarDays, parseISO, isValid, startOfDay } from 'date-fns'
// Removed error handler imports for MVP

export interface ImpactCardState {
  visible: boolean
  data: ImpactData | null
  autoHideTimer: number | null
}

export interface FormattedImpactData {
  moneySaved: string
  co2Avoided: string
  co2Comparison: string
  itemName: string
  actionType: string
}

export interface FormattedTotalImpact {
  totalMoneySaved: string
  totalCo2Avoided: string
  totalCo2Comparison: string
  itemsUsed: number
  itemsUsedText: string
}

export interface WeeklyImpactTrend {
  labels: string[]
  money: number[]
  co2: number[]
}

export type ImpactHistoryScope =
  | { type: 'shared' }
  | { type: 'private'; profilePosition: number }

interface StoredImpactHistoryEntry extends ImpactData {
  timestamp: string
  scope: 'shared' | 'private'
  profilePosition?: number
}

const IMPACT_HISTORY_STORAGE_KEY = 'use_it_up_impact_history'
const IMPACT_HISTORY_MAX_DAYS = 30
const TREND_DAYS = 7

function matchesScope(entry: StoredImpactHistoryEntry, scope: ImpactHistoryScope): boolean {
  if (scope.type === 'shared') {
    return entry.scope === 'shared'
  }
  if (entry.scope !== 'private') return false
  return entry.profilePosition === scope.profilePosition
}

function parseImpactTimestamp(timestamp: string): Date | null {
  if (!timestamp) return null
  const parsed = parseISO(timestamp)
  if (isValid(parsed)) {
    return parsed
  }
  const fallback = new Date(timestamp)
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

function loadImpactHistory(): StoredImpactHistoryEntry[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(IMPACT_HISTORY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .map(entry => {
        const record = entry as Partial<StoredImpactHistoryEntry>
        const timestamp = typeof record.timestamp === 'string' ? record.timestamp : ''
        if (!timestamp) return null

        const moneySaved = Number(record.moneySaved ?? 0)
        const co2Avoided = Number(record.co2Avoided ?? 0)
        const actionType = record.actionType === 'used' ? 'used' : 'discarded'
        const scope = record.scope === 'private' ? 'private' : 'shared'
        const profilePosition =
          scope === 'private' && Number.isFinite(record.profilePosition)
            ? Number(record.profilePosition)
            : undefined

        return {
          itemId: typeof record.itemId === 'string' ? record.itemId : '',
          itemName: typeof record.itemName === 'string' ? record.itemName : '',
          moneySaved: Number.isFinite(moneySaved) ? moneySaved : 0,
          co2Avoided: Number.isFinite(co2Avoided) ? co2Avoided : 0,
          actionType,
          timestamp,
          scope,
          profilePosition
        } satisfies StoredImpactHistoryEntry
      })
      .filter((entry): entry is StoredImpactHistoryEntry => entry !== null)
  } catch (error) {
    console.warn('Failed to load impact history from storage:', error)
    return []
  }
}

function persistImpactHistory(entries: StoredImpactHistoryEntry[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(IMPACT_HISTORY_STORAGE_KEY, JSON.stringify(entries))
  } catch (error) {
    console.warn('Failed to persist impact history:', error)
  }
}

function pruneImpactHistory(entries: StoredImpactHistoryEntry[]): StoredImpactHistoryEntry[] {
  const threshold = subDays(new Date(), IMPACT_HISTORY_MAX_DAYS - 1)
  return entries.filter(entry => {
    const parsed = parseImpactTimestamp(entry.timestamp)
    return parsed ? parsed >= threshold : false
  })
}

function computeWeeklyTrend(entries: StoredImpactHistoryEntry[]): WeeklyImpactTrend {
  const now = startOfDay(new Date())
  const baseLabels: string[] = []
  const baseMoney: number[] = []
  const baseCo2: number[] = []
  const usageFlags: boolean[] = []

  for (let offset = TREND_DAYS - 1; offset >= 0; offset--) {
    const targetDate = startOfDay(subDays(now, offset))
    const label = format(targetDate, 'EEE')
    let moneyTotal = 0
    let co2Total = 0

    for (const entry of entries) {
      if (entry.actionType !== 'used') continue
      const parsed = parseImpactTimestamp(entry.timestamp)
      if (!parsed) continue

      if (differenceInCalendarDays(parsed, targetDate) === 0) {
        moneyTotal += entry.moneySaved
        co2Total += entry.co2Avoided
      }
    }

    const moneyRounded = Number(moneyTotal.toFixed(2))
    const co2Rounded = Number(co2Total.toFixed(3))

    baseLabels.push(label)
    baseMoney.push(moneyRounded)
    baseCo2.push(co2Rounded)
    usageFlags.push(moneyRounded > 0 || co2Rounded > 0)
  }

  if (!usageFlags.some(Boolean)) {
    return {
      labels: baseLabels,
      money: baseMoney,
      co2: baseCo2
    }
  }

  const firstUsageIndex = usageFlags.findIndex(flag => flag)
  let lastUsageIndex =
    usageFlags.length - 1 - usageFlags.slice().reverse().findIndex(flag => flag)
  if (lastUsageIndex < firstUsageIndex) {
    lastUsageIndex = firstUsageIndex
  }

  const sliceStart = Math.max(0, firstUsageIndex - 1)
  const sliceEnd = Math.min(baseLabels.length, lastUsageIndex + 2)

  const labels = baseLabels.slice(sliceStart, sliceEnd)
  const money = baseMoney.slice(sliceStart, sliceEnd)
  const co2 = baseCo2.slice(sliceStart, sliceEnd)

  if (labels.length === 1 && baseLabels.length > 1) {
    if (sliceEnd < baseLabels.length) {
      labels.push(baseLabels[sliceEnd])
      money.push(baseMoney[sliceEnd])
      co2.push(baseCo2[sliceEnd])
    } else if (sliceStart > 0) {
      labels.unshift(baseLabels[sliceStart - 1])
      money.unshift(baseMoney[sliceStart - 1])
      co2.unshift(baseCo2[sliceStart - 1])
    }
  }

  return {
    labels,
    money,
    co2
  }
}

// Auto-hide duration: 3 seconds
const AUTO_HIDE_DURATION = 3000

export const useImpactStore = defineStore('impact', () => {
  // State
  const impactCard = ref<ImpactCardState>({
    visible: false,
    data: null,
    autoHideTimer: null
  })

  const totalImpact = ref<TotalImpactData>({
    totalMoneySaved: 0,
    totalCo2Avoided: 0,
    itemsUsed: 0
  })
  const impactHistory = ref<StoredImpactHistoryEntry[]>(pruneImpactHistory(loadImpactHistory()))
  const lastImpactScope = ref<ImpactHistoryScope>({ type: 'shared' })

  const isLoadingTotal = ref(false)
  const isLoadingStats = ref(false)
  const error = ref<string | null>(null)

  // Computed properties for formatted display values
  const formattedCurrentImpact = computed((): FormattedImpactData | null => {
    if (!impactCard.value.data) return null

    const data = impactCard.value.data

    return {
      moneySaved: formatCurrency(data.moneySaved),
      co2Avoided: formatCO2(data.co2Avoided),
      co2Comparison: getCO2Comparison(data.co2Avoided),
      itemName: data.itemName,
      actionType: data.actionType
    }
  })

  const formattedTotalImpact = computed((): FormattedTotalImpact => {
    const data = totalImpact.value

    return {
      totalMoneySaved: formatCurrency(data.totalMoneySaved),
      totalCo2Avoided: formatCO2(data.totalCo2Avoided),
      totalCo2Comparison: getCO2Comparison(data.totalCo2Avoided),
      itemsUsed: data.itemsUsed,
      itemsUsedText: data.itemsUsed === 1 ? '1 item used' : `${data.itemsUsed} items used`
    }
  })

  // Persistent impact stats fetched from backend (by login code)
  const stats = ref<ImpactStats | null>(null)

  const sharedImpactFormatted = computed(() => {
    const bucket = stats.value?.shared || { moneySaved: 0, co2SavedKg: 0 }
    return {
      money: formatCurrency(bucket.moneySaved),
      co2: formatCO2(bucket.co2SavedKg)
    }
  })

  function profileImpactFormatted(position: number) {
    const entry = stats.value?.profiles.find(p => p.position === position)
    const money = entry?.moneySaved ?? 0
    const co2 = entry?.co2SavedKg ?? 0
    return {
      money: formatCurrency(money),
      co2: formatCO2(co2)
    }
  }

  // Helper to clear auto-hide timer
  function clearAutoHideTimer(): void {
    if (impactCard.value.autoHideTimer) {
      clearTimeout(impactCard.value.autoHideTimer)
      impactCard.value.autoHideTimer = null
    }
  }

  // Actions
  function showImpact(
    impactData: ImpactData,
    scope: ImpactHistoryScope = { type: 'shared' }
  ): void {
    // Clear any existing timer
    clearAutoHideTimer()

    // Set impact data and show card
    impactCard.value.data = impactData
    impactCard.value.visible = true
    recordImpactHistory(impactData, scope)
    lastImpactScope.value = scope

    // Set auto-hide timer
    impactCard.value.autoHideTimer = window.setTimeout(() => {
      hideImpact()
    }, AUTO_HIDE_DURATION)
  }

  function hideImpact(): void {
    clearAutoHideTimer()
    impactCard.value.visible = false

    // Clear data after a short delay to allow for exit animations
    setTimeout(() => {
      if (!impactCard.value.visible) {
        impactCard.value.data = null
      }
    }, 300)
  }

  function dismissImpact(): void {
    hideImpact()
  }

  async function fetchTotalImpact(userId: string): Promise<void> {
    if (!userId) {
      error.value = 'User ID is required'
      return
    }

    isLoadingTotal.value = true
    error.value = null

    try {
      const data = await inventoryAPI.getTotalImpact(userId)
      totalImpact.value = data

      // Clear any previous errors on successful fetch
      error.value = null
    } catch (err) {
      const errorMessage = 'fetch your impact data'

      if (err instanceof InventoryAPIError) {
        error.value = err.message
      } else if (err instanceof Error && err.message.includes('network')) {
        error.value = 'Network error - using cached impact data if available'
      } else {
        error.value = 'Failed to fetch impact data. Please try again.'
      }
      console.error(errorMessage, err)

      console.error('Failed to fetch total impact:', err)
    } finally {
      isLoadingTotal.value = false
    }
  }

  async function fetchImpactStatsByLoginCode(loginCode: string): Promise<void> {
    if (!loginCode) {
      error.value = 'Login code is required'
      return
    }
    isLoadingStats.value = true
    try {
      const data = await inventoryAPI.getImpactStatsByLoginCode(loginCode)
      stats.value = data
      error.value = null
    } catch (err) {
      if (err instanceof InventoryAPIError) {
        error.value = err.message
      } else if (err instanceof Error && err.message.toLowerCase().includes('network')) {
        error.value = 'Network error - using cached impact stats if available'
      } else {
        error.value = 'Failed to fetch impact stats. Please try again.'
      }
      console.error('Failed to fetch impact stats:', err)
    } finally {
      isLoadingStats.value = false
    }
  }

  function updateTotalImpact(impactData: ImpactData): void {
    // Update total impact when an item is used
    if (impactData.actionType === 'used') {
      totalImpact.value.totalMoneySaved += impactData.moneySaved
      totalImpact.value.totalCo2Avoided += impactData.co2Avoided
      totalImpact.value.itemsUsed += 1
    }
  }

  function clearError(): void {
    error.value = null
  }

  function resetTotalImpact(): void {
    totalImpact.value = {
      totalMoneySaved: 0,
      totalCo2Avoided: 0,
      itemsUsed: 0
    }
    clearImpactHistory()
  }

  // Helper to check if impact card is currently visible
  const isImpactVisible = computed(() => impactCard.value.visible)

  // Helper to get motivational message based on impact
  const motivationalMessage = computed((): string => {
    if (!impactCard.value.data) return ''

    const data = impactCard.value.data
    const totalSaved = totalImpact.value.totalMoneySaved + data.moneySaved

    if (totalSaved < 10) {
      return "Great start! Every item counts."
    } else if (totalSaved < 50) {
      return "You're building momentum!"
    } else if (totalSaved < 100) {
      return "Fantastic progress! Keep it up!"
    } else {
      return "Amazing impact! You're a waste warrior!"
    }
  })

  // Cleanup function for component unmounting
  function cleanup(): void {
    clearAutoHideTimer()
  }

  function recordImpactHistory(impactData: ImpactData, scope: ImpactHistoryScope): void {
    if (impactData.actionType !== 'used') {
      return
    }

    const timestamp = impactData.timestamp || new Date().toISOString()
    const entry: StoredImpactHistoryEntry = {
      ...impactData,
      timestamp,
      scope: scope.type,
      profilePosition: scope.type === 'private' ? scope.profilePosition : undefined
    }

    impactHistory.value = pruneImpactHistory([...impactHistory.value, entry])
    persistImpactHistory(impactHistory.value)
  }

  function getWeeklyTrendForScope(scope: ImpactHistoryScope): WeeklyImpactTrend {
    const entries = impactHistory.value.filter(entry => matchesScope(entry, scope))
    return computeWeeklyTrend(entries)
  }

  const activeWeeklyImpactTrend = computed<WeeklyImpactTrend>(() =>
    getWeeklyTrendForScope(lastImpactScope.value)
  )

  function clearImpactHistory(): void {
    impactHistory.value = []
    persistImpactHistory(impactHistory.value)
  }

  return {
    // State
    impactCard: computed(() => impactCard.value),
    totalImpact: computed(() => totalImpact.value),
    isLoadingTotal,
    isLoadingStats,
    error,

    // Computed
    formattedCurrentImpact,
    formattedTotalImpact,
    isImpactVisible,
    motivationalMessage,

    // Actions
    showImpact,
    hideImpact,
    dismissImpact,
    fetchTotalImpact,
    fetchImpactStatsByLoginCode,
    updateTotalImpact,
    clearError,
    resetTotalImpact,
    cleanup,
    activeWeeklyImpactTrend,
    getWeeklyTrendForScope,
    lastImpactScope,
    clearImpactHistory,
    // Stats
    stats: computed(() => stats.value),
    sharedImpactFormatted,
    profileImpactFormatted
  }
})

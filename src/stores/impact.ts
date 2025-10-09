// Impact Store
// Use-It-Up PWA Frontend

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import inventoryAPI, {
  type ImpactData,
  type TotalImpactData,
  type ImpactStats,
  InventoryAPIError,
  type ImpactLedgerDailyTotals,
  type ImpactLedgerProfileBucket
} from '@/api/inventory'
import { formatCurrency, formatCO2, getCO2Comparison } from '@/utils/formatters'
import { parseISO, isValid, eachDayOfInterval, format, startOfDay } from 'date-fns'

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

export type ImpactScope =
  | { type: 'shared' }
  | { type: 'profile'; profileId: string }
  | { type: 'profile-position'; profilePosition: number }

const AUTO_HIDE_DURATION = 3000
const LEDGER_DEFAULT_DAYS = 7
const EMPTY_TREND: WeeklyImpactTrend = { labels: [], money: [], co2: [] }

function toStartOfDay(dateString: string): Date | null {
  if (!dateString) return null
  const parsed = parseISO(dateString)
  if (!isValid(parsed)) return null
  return startOfDay(parsed)
}

function buildTrend(rangeStart: string, rangeEnd: string, totals: ImpactLedgerDailyTotals[]): WeeklyImpactTrend {
  const start = toStartOfDay(rangeStart)
  const end = toStartOfDay(rangeEnd)

  if (!start || !end || end < start) {
    return { ...EMPTY_TREND }
  }

  let days: Date[]
  try {
    days = eachDayOfInterval({ start, end })
  } catch {
    days = [start]
  }

  const totalsMap = new Map<string, ImpactLedgerDailyTotals>()
  for (const entry of totals) {
    totalsMap.set(entry.day, entry)
  }

  const labels: string[] = []
  const money: number[] = []
  const co2: number[] = []

  for (const day of days) {
    const key = format(day, 'yyyy-MM-dd')
    const entry = totalsMap.get(key)
    labels.push(format(day, 'EEE'))
    money.push(entry ? Number(entry.moneySaved.toFixed(2)) : 0)
    co2.push(entry ? Number(entry.co2SavedKg.toFixed(3)) : 0)
  }

  return { labels, money, co2 }
}

function trendClone(trend: WeeklyImpactTrend): WeeklyImpactTrend {
  return {
    labels: [...trend.labels],
    money: [...trend.money],
    co2: [...trend.co2]
  }
}

function resolveScopeKey(
  scope: ImpactScope,
  positionToId: Record<number, string>
): string | null {
  if (scope.type === 'shared') return 'shared'
  if (scope.type === 'profile') {
    return scope.profileId ? `profile:${scope.profileId}` : null
  }
  const profileId = positionToId[scope.profilePosition]
  return profileId ? `profile:${profileId}` : null
}

function mapLedgerProfiles(
  buckets: ImpactLedgerProfileBucket[],
  rangeStart: string,
  rangeEnd: string
): Record<string, WeeklyImpactTrend> {
  const trends: Record<string, WeeklyImpactTrend> = {}
  let hasSharedBucket = false

  for (const bucket of buckets) {
    const trend = buildTrend(rangeStart, rangeEnd, bucket.dailyTotals ?? [])
    if (bucket.bucket === 'shared') {
      hasSharedBucket = true
      trends['shared'] = trend
    } else if (bucket.profileId) {
      trends[`profile:${bucket.profileId}`] = trend
    }
  }

  if (!hasSharedBucket) {
    trends['shared'] = buildTrend(rangeStart, rangeEnd, [])
  }

  return trends
}

export const useImpactStore = defineStore('impact', () => {
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

  const stats = ref<ImpactStats | null>(null)
  const isLoadingTotal = ref(false)
  const isLoadingStats = ref(false)
  const isLoadingLedger = ref(false)
  const error = ref<string | null>(null)
  const ledgerError = ref<string | null>(null)

  const ledgerTrends = ref<Record<string, WeeklyImpactTrend>>({})
  const profilePositionToId = ref<Record<number, string>>({})
  const lastImpactScope = ref<ImpactScope>({ type: 'shared' })
  const currentLoginCode = ref<string | null>(null)
  const ledgerDays = ref(LEDGER_DEFAULT_DAYS)

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

  function clearAutoHideTimer(): void {
    if (impactCard.value.autoHideTimer) {
      clearTimeout(impactCard.value.autoHideTimer)
      impactCard.value.autoHideTimer = null
    }
  }

  function showImpact(impactData: ImpactData, scope: ImpactScope = { type: 'shared' }): void {
    clearAutoHideTimer()
    impactCard.value.data = impactData
    impactCard.value.visible = true
    lastImpactScope.value = scope

    impactCard.value.autoHideTimer = window.setTimeout(() => {
      hideImpact()
    }, AUTO_HIDE_DURATION)

    if (currentLoginCode.value) {
      fetchImpactLedger(currentLoginCode.value, ledgerDays.value, { silent: true }).catch(error => {
        console.warn('Silent impact ledger refresh failed', error)
      })
    }
  }

  function hideImpact(): void {
    clearAutoHideTimer()
    impactCard.value.visible = false

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
      error.value = null
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      error.value = errorMessage || 'Failed to fetch impact data. Please try again.'
      console.error('Failed to fetch total impact:', err)
    } finally {
      isLoadingTotal.value = false
    }
  }

  function syncProfilePositionMapping(data: ImpactStats | null): void {
    const mapping: Record<number, string> = {}
    if (data) {
      for (const profile of data.profiles) {
        if (profile.profileId) {
          mapping[profile.position] = profile.profileId
        }
      }
    }
    profilePositionToId.value = mapping
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
      syncProfilePositionMapping(data)
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

  async function fetchImpactLedger(
    loginCode: string,
    days = LEDGER_DEFAULT_DAYS,
    options: { silent?: boolean } = {}
  ): Promise<void> {
    if (!loginCode) {
      if (!options.silent) {
        ledgerError.value = 'Login code is required'
      }
      return
    }

    const silent = options.silent ?? false
    if (!silent) {
      isLoadingLedger.value = true
      ledgerError.value = null
    }

    try {
      const response = await inventoryAPI.getImpactLedgerByLoginCode(loginCode, days)
      currentLoginCode.value = loginCode
      ledgerDays.value = days

      const trends = mapLedgerProfiles(response.profiles, response.range.start, response.range.end)
      ledgerTrends.value = trends
    } catch (err) {
      if (!silent) {
        const message = err instanceof InventoryAPIError ? err.message : 'Failed to load impact ledger.'
        ledgerError.value = message
      } else {
        console.warn('Silent impact ledger fetch error:', err)
      }
    } finally {
      if (!silent) {
        isLoadingLedger.value = false
      }
    }
  }

  function updateTotalImpact(impactData: ImpactData): void {
    if (impactData.actionType === 'used') {
      totalImpact.value.totalMoneySaved += impactData.moneySaved
      totalImpact.value.totalCo2Avoided += impactData.co2Avoided
      totalImpact.value.itemsUsed += 1
    }
  }

  function clearError(): void {
    error.value = null
  }

  function clearImpactHistory(): void {
    ledgerTrends.value = {}
  }

  function resetTotalImpact(): void {
    totalImpact.value = {
      totalMoneySaved: 0,
      totalCo2Avoided: 0,
      itemsUsed: 0
    }
    clearImpactHistory()
  }

  const isImpactVisible = computed(() => impactCard.value.visible)

  const motivationalMessage = computed((): string => {
    if (!impactCard.value.data) return ''

    const data = impactCard.value.data
    const totalSaved = totalImpact.value.totalMoneySaved + data.moneySaved

    if (totalSaved < 10) {
      return 'Great start! Every item counts.'
    } else if (totalSaved < 50) {
      return "You're building momentum!"
    } else if (totalSaved < 100) {
      return 'Fantastic progress! Keep it up!'
    } else {
      return "Amazing impact! You're a waste warrior!"
    }
  })

  function getWeeklyTrendForScope(scope: ImpactScope): WeeklyImpactTrend {
    const key = resolveScopeKey(scope, profilePositionToId.value)
    if (!key) {
      return trendClone(EMPTY_TREND)
    }
    const trend = ledgerTrends.value[key]
    return trend ? trendClone(trend) : trendClone(EMPTY_TREND)
  }

  const activeWeeklyImpactTrend = computed<WeeklyImpactTrend>(() =>
    getWeeklyTrendForScope(lastImpactScope.value)
  )

  function cleanup(): void {
    clearAutoHideTimer()
  }

  return {
    impactCard: computed(() => impactCard.value),
    totalImpact: computed(() => totalImpact.value),
    isLoadingTotal,
    isLoadingStats,
    isLoadingLedger,
    error,
    ledgerError,
    formattedCurrentImpact,
    formattedTotalImpact,
    isImpactVisible,
    motivationalMessage,
    sharedImpactFormatted,
    profileImpactFormatted,
    showImpact,
    hideImpact,
    dismissImpact,
    fetchTotalImpact,
    fetchImpactStatsByLoginCode,
    fetchImpactLedger,
    updateTotalImpact,
    clearError,
    resetTotalImpact,
    cleanup,
    activeWeeklyImpactTrend,
    getWeeklyTrendForScope,
    lastImpactScope,
    profilePositionToId,
    clearImpactHistory
  }
})

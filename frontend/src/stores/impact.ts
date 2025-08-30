// Impact Store
// Use-It-Up PWA Frontend

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import inventoryAPI, { type ImpactData, type TotalImpactData, InventoryAPIError } from '@/api/inventory'
import { formatCurrency, formatCO2, getCO2Comparison } from '@/utils/formatters'
import { handleAPIError, handleNetworkError } from '@/utils/errorHandler'

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

  const isLoadingTotal = ref(false)
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

  // Helper to clear auto-hide timer
  function clearAutoHideTimer(): void {
    if (impactCard.value.autoHideTimer) {
      clearTimeout(impactCard.value.autoHideTimer)
      impactCard.value.autoHideTimer = null
    }
  }

  // Actions
  function showImpact(impactData: ImpactData): void {
    // Clear any existing timer
    clearAutoHideTimer()

    // Set impact data and show card
    impactCard.value.data = impactData
    impactCard.value.visible = true

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
        handleAPIError(err, errorMessage)
      } else if (err instanceof Error && err.message.includes('network')) {
        error.value = 'Network error - using cached impact data if available'
        handleNetworkError(err, errorMessage)
      } else {
        error.value = 'Failed to fetch impact data. Please try again.'
        handleAPIError(err, errorMessage)
      }

      console.error('Failed to fetch total impact:', err)
    } finally {
      isLoadingTotal.value = false
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
  }

  // Helper to check if impact card is currently visible
  const isImpactVisible = computed(() => impactCard.value.visible)

  // Helper to get motivational message based on impact
  const motivationalMessage = computed((): string => {
    if (!impactCard.value.data) return ''

    const data = impactCard.value.data
    const totalSaved = totalImpact.value.totalMoneySaved + data.moneySaved
    const totalCO2 = totalImpact.value.totalCo2Avoided + data.co2Avoided

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

  return {
    // State
    impactCard: computed(() => impactCard.value),
    totalImpact: computed(() => totalImpact.value),
    isLoadingTotal,
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
    updateTotalImpact,
    clearError,
    resetTotalImpact,
    cleanup
  }
})

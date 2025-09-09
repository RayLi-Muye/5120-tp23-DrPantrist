// Unify inventory access via login code or user ID
// Keep function names descriptive and simple to read

import { useAuthStore } from '@/stores/auth'
import { useInventoryStore } from '@/stores/inventory'
import type { ImpactData, MarkAsUsedResponse } from '@/api/inventory'

export function useInventoryAccess() {
  const authStore = useAuthStore()
  const inventoryStore = useInventoryStore()

  async function loadInventory(forceRefresh = false): Promise<void> {
    if (!authStore.user) return
    if (authStore.user.loginCode) {
      await inventoryStore.fetchInventoryByLoginCode(authStore.user.loginCode, forceRefresh)
    } else {
      await inventoryStore.fetchInventory(authStore.user.id, forceRefresh)
    }
  }

  async function markItemAsUsedUnified(itemId: string): Promise<{
    impact: ImpactData | null
    consumedResponse: MarkAsUsedResponse | null
  }> {
    if (!authStore.user) return { impact: null, consumedResponse: null }

    if (authStore.user.loginCode) {
      const consumed = await inventoryStore.markItemAsUsedByLoginCode(itemId, authStore.user.loginCode)
      return { impact: null, consumedResponse: consumed }
    } else {
      const impact = await inventoryStore.markItemAsUsed(itemId)
      return { impact, consumedResponse: null }
    }
  }

  async function deleteInventoryItem(itemId: string): Promise<boolean> {
    return inventoryStore.deleteItem(itemId)
  }

  return {
    loadInventory,
    markItemAsUsedUnified,
    deleteInventoryItem
  }
}


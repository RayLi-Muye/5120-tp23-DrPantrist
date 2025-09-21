// Unify inventory access via login code or user ID
// Keep function names descriptive and simple to read

import { useAuthStore } from '@/stores/auth'
import { useInventoryStore } from '@/stores/inventory'
import type { ImpactData, ConsumeItemResult, InventoryItem } from '@/api/inventory'
import inventoryRoomsAPI from '@/api/inventory-rooms'
import { logger } from '@/utils/logger'

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
    consumedResponse: ConsumeItemResult['consumed']
  }> {
    if (!authStore.user) return { impact: null, consumedResponse: null }

    if (authStore.user.loginCode) {
      const result = await inventoryStore.markItemAsUsedByLoginCode(itemId, authStore.user.loginCode)
      return {
        impact: result?.impact ?? null,
        consumedResponse: result?.consumed ?? null
      }
    } else {
      const impact = await inventoryStore.markItemAsUsed(itemId)
      return { impact, consumedResponse: null }
    }
  }

  async function deleteInventoryItem(itemId: string): Promise<boolean> {
    return inventoryStore.deleteItem(itemId)
  }

  async function addInventoryItemUnified(params: {
    groceryId: number
    quantity: number
    purchasedAt: string
    actualExpiry: string
    visibility?: 'shared' | 'private'
    profilePosition?: number | null
  }): Promise<InventoryItem | null> {
    if (!authStore.user) return null

    // Prefer login code flow when available
    if (authStore.user.loginCode) {
      try {
        const created = await inventoryStore.addItemByLoginCode({
          login_code: authStore.user.loginCode,
          grocery_id: params.groceryId,
          quantity: params.quantity,
          purchased_at: params.purchasedAt,
          actual_expiry: params.actualExpiry,
          visibility: params.visibility,
          ...(params.profilePosition != null ? { profile_position: params.profilePosition } : {})
        })
        // Visibility overrides retained for compatibility until backend fully supports it
        if (created && params.visibility) inventoryStore.setItemVisibility(created.id, params.visibility)
        return created
      } catch (err) {
        logger.warn('Login code add failed, will try inventory_id flow', err)
        // fallthrough to inventory flow
      }
    }

    const currentRoom = inventoryRoomsAPI.getCurrentRoom()
    if (!currentRoom) {
      logger.error('No active room found when adding item')
      return null
    }

    const created = await inventoryStore.addItemToInventory({
      inventory_id: currentRoom.inventoryId,
      grocery_id: params.groceryId,
      created_by: authStore.user.id,
      quantity: params.quantity,
      purchased_at: params.purchasedAt,
      actual_expiry: params.actualExpiry
    })
    if (created && params.visibility) {
      inventoryStore.setItemVisibility(created.id, params.visibility)
    }
    return created
  }

  return {
    loadInventory,
    markItemAsUsedUnified,
    deleteInventoryItem,
    addInventoryItemUnified
  }
}

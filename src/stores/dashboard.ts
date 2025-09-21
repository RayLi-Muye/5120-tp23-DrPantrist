import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import inventoryRoomsAPI from '@/api/inventory-rooms'

export interface HouseholdProfile {
  profileId: string
  profileName: string
  position: number
  createdAt?: string
}

interface ProfileSlot {
  position: number
  profile: HouseholdProfile | null
}

const ACTIVE_PROFILE_KEY_PREFIX = 'dashboard_active_profile_' // + inventoryId

function makeActiveProfileKey(inventoryId: string) {
  return `${ACTIVE_PROFILE_KEY_PREFIX}${inventoryId}`
}

export const useDashboardStore = defineStore('dashboard', () => {
  const profiles = ref<HouseholdProfile[]>([])
  const currentInventoryId = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const activePosition = ref<number | null>(null)

  const slots = computed<ProfileSlot[]>(() => {
    const byPosition = new Map<number, HouseholdProfile>()
    profiles.value.forEach(profile => {
      byPosition.set(profile.position, profile)
    })
    const output: ProfileSlot[] = []
    for (let pos = 1; pos <= 3; pos += 1) {
      output.push({
        position: pos,
        profile: byPosition.get(pos) ?? null
      })
    }
    return output
  })

  const activeProfile = computed<HouseholdProfile | null>(() => {
    if (activePosition.value == null) return null
    const match = profiles.value.find(profile => profile.position === activePosition.value)
    return match ?? null
  })

  function ensureActivePositionPersisted() {
    if (!currentInventoryId.value) return
    const key = makeActiveProfileKey(currentInventoryId.value)
    if (activePosition.value != null) {
      try {
        localStorage.setItem(key, activePosition.value.toString())
      } catch {
        /* noop */
      }
    } else {
      try {
        localStorage.removeItem(key)
      } catch {
        /* noop */
      }
    }
  }

  function restoreActivePosition(inventoryId: string, availableProfiles: HouseholdProfile[]) {
    const key = makeActiveProfileKey(inventoryId)
    let restoredPosition: number | null = null
    try {
      const stored = localStorage.getItem(key)
      if (stored) {
        const parsed = Number(stored)
        if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 3) {
          restoredPosition = parsed
        }
      }
    } catch {
      restoredPosition = null
    }

    if (restoredPosition != null) {
      const exists = availableProfiles.some(profile => profile.position === restoredPosition)
      activePosition.value = exists ? restoredPosition : null
    }

    if (activePosition.value == null) {
      const firstProfile = availableProfiles.sort((a, b) => a.position - b.position)[0]
      activePosition.value = firstProfile ? firstProfile.position : null
    }

    ensureActivePositionPersisted()
  }

  async function loadProfiles(loginCode: string, inventoryId: string): Promise<void> {
    if (!loginCode || !inventoryId) {
      error.value = 'Missing login or inventory information'
      return
    }

    isLoading.value = true
    error.value = null

    try {
      // Prefer full inventory info (which may include profiles) then fall back
      type RawProfile = { profile_id: string; profile_name: string; position: number; created_at?: string }
      type InventoryWithProfiles = { inventory_id: string; profiles?: RawProfile[] }

      let profilesResponse: InventoryWithProfiles
      try {
        const inventoryInfo = await inventoryRoomsAPI.getInventoryByLoginCode(loginCode) as unknown as InventoryWithProfiles
        if (inventoryInfo && Array.isArray(inventoryInfo.profiles)) {
          profilesResponse = inventoryInfo
        } else {
          throw new Error('Profiles missing in inventory response')
        }
      } catch {
        profilesResponse = await inventoryRoomsAPI.getProfilesByLoginCode(loginCode) as unknown as InventoryWithProfiles
      }

      currentInventoryId.value = profilesResponse.inventory_id || inventoryId
      const mapped = (profilesResponse.profiles ?? []).map(profile => ({
        profileId: profile.profile_id,
        profileName: profile.profile_name,
        position: profile.position,
        createdAt: profile.created_at
      }))
      profiles.value = mapped.sort((a, b) => a.position - b.position)
      restoreActivePosition(currentInventoryId.value, profiles.value)
    } catch (err) {
      console.error('Failed to load profiles', err)
      error.value = err instanceof Error ? err.message : 'Failed to load profiles'
      profiles.value = []
      currentInventoryId.value = inventoryId
      activePosition.value = null
    } finally {
      isLoading.value = false
    }
  }

  async function addProfile(loginCode: string, inventoryId: string, profileName: string, position?: number): Promise<void> {
    if (!loginCode || !inventoryId) {
      throw new Error('Missing login or inventory information')
    }
    const trimmed = profileName.trim()
    if (!trimmed) {
      throw new Error('Profile name is required')
    }

    await inventoryRoomsAPI.addOrRenameProfile({
      inventoryId,
      body: {
        login_code: loginCode,
        profile_name: trimmed,
        ...(position != null ? { position } : {})
      }
    })

    await loadProfiles(loginCode, inventoryId)
    const sortedPositions = [...profiles.value].sort((a, b) => a.position - b.position).map(profile => profile.position)
    const chosenPosition = position ?? sortedPositions[sortedPositions.length - 1] ?? null
    if (chosenPosition != null) {
      selectProfile(chosenPosition)
    }
  }

  async function renameProfile(loginCode: string, inventoryId: string, position: number, profileName: string): Promise<void> {
    await addProfile(loginCode, inventoryId, profileName, position)
  }

  function selectProfile(position: number | null) {
    if (position != null && (position < 1 || position > 3)) return
    if (position != null) {
      const exists = profiles.value.some(profile => profile.position === position)
      if (!exists) return
    }
    activePosition.value = position
    ensureActivePositionPersisted()
  }

  return {
    profiles,
    slots,
    activeProfile,
    activePosition,
    isLoading,
    error,
    loadProfiles,
    addProfile,
    renameProfile,
    selectProfile
  }
})

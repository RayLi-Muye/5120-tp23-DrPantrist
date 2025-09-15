<template>
  <div class="household-view">
    <header class="header">
      <h1>Household Management</h1>
      <router-link class="back-link" to="/dashboard">← Back to Dashboard</router-link>
    </header>

    <section class="section" v-if="authStore.user">
      <div class="cards">
        <!-- Create Household -->
        <div class="card">
          <h2>Create Household</h2>
          <p class="muted">Create a new household to share groceries with housemates.</p>
          <form @submit.prevent="onCreateHousehold">
            <label class="label" for="hhName">Household Name</label>
            <input id="hhName" v-model.trim="householdName" type="text" placeholder="e.g., Family Kitchen" maxlength="50" />
            <button class="btn btn--primary" :disabled="isBusy || !householdName">Create Household</button>
          </form>
          <p v-if="createError" class="error">{{ createError }}</p>
          <p v-if="createSuccess" class="success">Household created.</p>
        </div>

        <!-- Join Household -->
        <div class="card">
          <h2>Join Household</h2>
          <p class="muted">Enter the Household ID and PIN shared by the owner.</p>
          <form @submit.prevent="onJoin">
            <label class="label" for="invId">Household ID</label>
            <input id="invId" v-model.trim="joinInventoryId" type="text" placeholder="Inventory ID (UUID)" />
            <label class="label" for="pin">PIN</label>
            <input id="pin" v-model.trim="joinPin" type="text" placeholder="Share PIN (e.g., K7M2Q9XZ)" />
            <button class="btn btn--secondary" :disabled="isBusy || !joinInventoryId || !joinPin">Join</button>
          </form>
          <p v-if="joinError" class="error">{{ joinError }}</p>
        </div>
      </div>
    </section>

    <!-- Owner Panel: PIN + Members -->
    <section class="section" v-if="inventoryInfo">
      <div class="card">
        <h2>Household Details</h2>
        <div class="row">
          <div>
            <div class="label">Household Name</div>
            <div class="value">{{ inventoryInfo.inventory_name }}</div>
          </div>
          <div>
            <div class="label">Household ID</div>
            <div class="value mono">{{ inventoryInfo.inventory_id }}</div>
          </div>
        </div>

        <div class="pin-row" v-if="inventoryInfo.share_code">
          <div class="label">Join PIN</div>
          <div class="pin-box">
            <span class="mono">{{ inventoryInfo.share_code }}</span>
            <button class="link" @click="copyPin">Copy</button>
            <button class="link" @click="copyJoinLink">Copy Join Link</button>
          </div>
          <p class="muted small">Share this PIN with housemates to join. Use the Join form above with Household ID + PIN.</p>
        </div>
      </div>

      <div class="card">
        <h2>Members</h2>
        <div v-if="members.length === 0" class="muted">No members yet.</div>
        <ul class="member-list" v-else>
          <li v-for="m in members" :key="m.user_id" class="member-item">
            <div>
              <div class="name">{{ m.display_name }}</div>
              <div class="role">{{ m.role }}</div>
            </div>
            <div class="actions" v-if="isOwner && m.user_id !== inventoryInfo?.owner_user_id">
              <button class="danger-btn" disabled title="Pending backend endpoint">Remove</button>
            </div>
          </li>
        </ul>
      </div>
    </section>

    <div v-if="globalError" class="error global">{{ globalError }}</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import inventoryRoomsAPI from '@/api/inventory-rooms'

const router = useRouter()
const authStore = useAuthStore()

const isBusy = ref(false)
const globalError = ref('')

// Create Household
const householdName = ref('')
const createError = ref('')
const createSuccess = ref(false)

async function onCreateHousehold() {
  if (!householdName.value.trim()) return
  isBusy.value = true
  createError.value = ''
  createSuccess.value = false
  try {
    await authStore.createHousehold(householdName.value)
    createSuccess.value = true
    // Refresh inventory info (to get PIN)
    await loadInventoryInfo()
    householdName.value = ''
  } catch (e: any) {
    createError.value = e?.message || 'Failed to create household'
  } finally {
    isBusy.value = false
  }
}

// Join by PIN + Inventory ID
const joinInventoryId = ref('')
const joinPin = ref('')
const joinError = ref('')

async function onJoin() {
  if (!joinInventoryId.value.trim() || !joinPin.value.trim()) return
  isBusy.value = true
  joinError.value = ''
  globalError.value = ''
  try {
    const userId = inventoryRoomsAPI.getCurrentUserId()
    if (!userId) throw new Error('User ID not found; please log in again')
    await inventoryRoomsAPI.joinRoom(joinInventoryId.value.trim(), userId, joinPin.value.trim())
    // After joining, go back to dashboard
    await router.replace('/dashboard')
  } catch (e: any) {
    joinError.value = e?.message || 'Failed to join household. Check PIN and Household ID.'
  } finally {
    isBusy.value = false
  }
}

// Inventory info + members (owner panel)
const inventoryInfo = ref<{
  inventory_id: string
  inventory_name: string
  owner_user_id: string
  share_code: string
  role?: string
  joined_at?: string
} | null>(null)

const members = ref<Array<{ user_id: string; display_name: string; role: string }>>([])

const isOwner = computed(() => {
  const u = authStore.user
  if (!u || !inventoryInfo.value) return false
  return u.id === inventoryInfo.value.owner_user_id
})

async function loadInventoryInfo() {
  try {
    const loginCode = authStore.user?.loginCode
    if (!loginCode) return
    // Fetch full inventory info (contains share_code)
    const inv = await inventoryRoomsAPI.getInventoryByLoginCode(loginCode)
    inventoryInfo.value = {
      inventory_id: inv.inventory_id,
      inventory_name: inv.inventory_name,
      owner_user_id: inv.owner_user_id,
      share_code: (inv as any).share_code,
      role: (inv as any).role,
      joined_at: (inv as any).joined_at
    }
    // Fetch members
    members.value = await inventoryRoomsAPI.getInventoryMembersByLoginCode(loginCode)
  } catch (e: any) {
    globalError.value = e?.message || 'Failed to load household details'
  }
}

function copy(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {})
}

function copyPin() {
  if (!inventoryInfo.value?.share_code) return
  copy(inventoryInfo.value.share_code)
}

function copyJoinLink() {
  const inv = inventoryInfo.value
  if (!inv?.share_code || !inv.inventory_id) return
  const url = `${location.origin}/#/household?join=${encodeURIComponent(inv.inventory_id)}:${encodeURIComponent(inv.share_code)}`
  copy(url)
}

onMounted(async () => {
  if (!authStore.user) return
  await loadInventoryInfo()
  // Parse optional join param (link paste)
  const hash = location.hash || ''
  const match = /join=([^&]+)/.exec(hash)
  if (match && match[1]) {
    const [invId, pin] = decodeURIComponent(match[1]).split(':')
    if (invId && pin) {
      joinInventoryId.value = invId
      joinPin.value = pin
    }
  }
})
</script>

<style scoped>
.household-view {
  min-height: 100vh;
  padding: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #1f2937;
}
.header { display: flex; justify-content: space-between; align-items: center; color: #fff; margin-bottom: 16px; }
.back-link { color: #fff; opacity: 0.9; text-decoration: none; }
.section { display: grid; gap: 16px; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
.card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
.label { font-size: 12px; color: #6b7280; margin: 6px 0; }
input { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 10px; }
.btn { padding: 10px 14px; border-radius: 8px; border: 1px solid transparent; cursor: pointer; }
.btn--primary { background: #2563eb; color: #fff; }
.btn--secondary { background: #e5e7eb; }
.error { color: #b91c1c; margin-top: 8px; }
.success { color: #065f46; margin-top: 8px; }
.muted { color: #6b7280; }
.small { font-size: 12px; }
.row { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-top: 8px; }
.value { font-weight: 600; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; }
.pin-row { margin-top: 14px; }
.pin-box { display: flex; gap: 8px; align-items: center; }
.link { background: transparent; border: none; color: #2563eb; cursor: pointer; }
.member-list { list-style: none; padding: 0; margin: 0; }
.member-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
.name { font-weight: 600; }
.role { font-size: 12px; color: #6b7280; }
.actions { display: flex; gap: 8px; }
.danger-btn { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; padding: 6px 10px; border-radius: 6px; cursor: not-allowed; }
.global { margin-top: 12px; }
@media (max-width: 480px) { .household-view { padding: 12px; } }
</style>


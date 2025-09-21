<template>
  <div class="recent-activity">
    <!-- Loading State -->
    <div v-if="isLoading" class="activity-loading">
      <div class="loading-spinner"></div>
      <span>Loading recent activity...</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="activities.length === 0" class="activity-empty">
      <div class="empty-icon">📝</div>
      <p>No recent activity</p>
      <router-link to="/add-item" class="btn btn--small">
        Add your first item
      </router-link>
    </div>

    <!-- Activity List -->
    <div v-else class="activity-list">
      <div
        v-for="activity in activities"
        :key="activity.id"
        class="activity-item"
        :class="`activity-item--${activity.type}`"
      >
        <div class="activity-icon">{{ getActivityIcon(activity.type) }}</div>
        <div class="activity-content">
          <div class="activity-title">{{ activity.title }}</div>
          <div class="activity-subtitle">{{ activity.subtitle }}</div>
          <div class="activity-time">{{ formatTime(activity.timestamp) }}</div>
        </div>
        <div v-if="activity.impact" class="activity-impact">
          <span class="impact-money">+{{ formatCurrency(activity.impact.moneySaved) }}</span>
          <span class="impact-co2">-{{ formatCO2(activity.impact.co2Avoided) }}</span>
        </div>
      </div>
    </div>

    <!-- View All Link -->
    <div v-if="activities.length > 0" class="activity-footer">
      <router-link to="/inventory" class="view-all-link">
        View full inventory →
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { formatCurrency, formatCO2 } from '@/utils/formatters'

interface ActivityItem {
  id: string
  type: 'added' | 'used' | 'expired'
  title: string
  subtitle: string
  timestamp: string
  impact?: {
    moneySaved: number
    co2Avoided: number
  }
}

const inventoryStore = useInventoryStore()
const isLoading = ref(false)

// Mock recent activities - in real app this would come from API
const activities = computed((): ActivityItem[] => {
  const recentItems = inventoryStore.items
    .filter(item => item.status === 'used')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  return recentItems.map(item => ({
    id: item.id,
    type: 'used' as const,
    title: `Used ${item.name}`,
    subtitle: `${item.quantity} ${item.unit}`,
    timestamp: item.updatedAt,
    impact: {
      moneySaved: item.quantity * 2.5, // Mock calculation
      co2Avoided: item.quantity * 0.1   // Mock calculation
    }
  }))
})

const getActivityIcon = (type: string): string => {
  switch (type) {
    case 'added': return '➕'
    case 'used': return '✅'
    case 'expired': return '⚠️'
    default: return '📝'
  }
}

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

  if (diffInHours < 1) {
    return 'Just now'
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`
  } else {
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }
}

onMounted(async () => {
  // Activities are derived from inventory items, so no separate loading needed
})
</script>

<style scoped>
.recent-activity {
  background: white;
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.activity-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xl);
  color: var(--color-text-secondary);
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-border);
  border-top: 2px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.activity-empty {
  text-align: center;
  padding: var(--spacing-xl);
}

.empty-icon {
  font-size: 2rem;
  margin-bottom: var(--spacing-md);
  opacity: 0.6;
}

.activity-empty p {
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-md);
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.activity-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  transition: background-color var(--duration-fast) ease;
}

.activity-item:hover {
  background: var(--color-bg-secondary);
}

.activity-item--used {
  border-left: 3px solid var(--color-fresh);
}

.activity-item--added {
  border-left: 3px solid var(--color-primary);
}

.activity-item--expired {
  border-left: 3px solid var(--color-expired);
}

.activity-icon {
  font-size: var(--font-size-lg);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-secondary);
  border-radius: 50%;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-title {
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
}

.activity-subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
}

.activity-time {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.activity-impact {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--spacing-xs);
  flex-shrink: 0;
}

.impact-money {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-fresh);
}

.impact-co2 {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.activity-footer {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
  text-align: center;
}

.view-all-link {
  color: var(--color-primary);
  text-decoration: none;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition: color var(--duration-fast) ease;
}

.view-all-link:hover {
  color: #0056b3;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  text-decoration: none;
  border: 1px solid var(--color-primary);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--duration-fast) ease;
  background: var(--color-primary);
  color: white;
}

.btn--small {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-xs);
}

.btn:hover {
  background: #0056b3;
  border-color: #0056b3;
}

/* Mobile optimizations */
@media (max-width: 480px) {
  .recent-activity {
    padding: var(--spacing-md);
  }

  .activity-item {
    padding: var(--spacing-sm);
    gap: var(--spacing-sm);
  }

  .activity-icon {
    width: 28px;
    height: 28px;
    font-size: var(--font-size-base);
  }

  .activity-impact {
    display: none; /* Hide on very small screens */
  }
}
</style>

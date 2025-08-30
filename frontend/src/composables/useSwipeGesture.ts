// Enhanced Swipe Gesture Composable with Visual Feedback
// Use-It-Up PWA Frontend

import { ref, readonly, computed } from 'vue'
import { triggerSwipeHapticFeedback } from '@/utils/hapticFeedback'

export interface SwipeGestureOptions {
  threshold?: number // Minimum distance for swipe (default: 80px)
  direction?: 'horizontal' | 'vertical' | 'both' // Swipe direction (default: 'horizontal')
  velocityThreshold?: number // Minimum velocity for swipe (default: 0.3)
  maxTime?: number // Maximum time for swipe gesture (default: 300ms)
  feedbackThreshold?: number // Distance to start showing visual feedback (default: 20px)
}

export interface TouchPosition {
  x: number
  y: number
  time: number
}

export interface SwipeProgress {
  distance: number
  progress: number // 0-1 based on threshold
  direction: 'left' | 'right' | 'up' | 'down' | null
}

/**
 * Enhanced composable for handling swipe gestures with visual feedback
 *
 * @param onSwipeRight - Callback for right swipe
 * @param onSwipeLeft - Callback for left swipe (optional)
 * @param options - Configuration options
 */
export function useSwipeGesture(
  onSwipeRight: () => void,
  onSwipeLeft?: () => void,
  options: SwipeGestureOptions = {}
) {
  const {
    threshold = 80,
    direction = 'horizontal',
    velocityThreshold = 0.3,
    maxTime = 300,
    feedbackThreshold = 20
  } = options

  const touchStart = ref<TouchPosition | null>(null)
  const touchCurrent = ref<TouchPosition | null>(null)
  const isSwiping = ref(false)
  const swipeProgress = ref<SwipeProgress>({
    distance: 0,
    progress: 0,
    direction: null
  })
  const lastHapticProgress = ref(0)

  // Computed properties for visual feedback
  const swipeDistance = computed(() => swipeProgress.value.distance)
  const swipeProgressPercent = computed(() => Math.min(swipeProgress.value.progress * 100, 100))
  const isSwipeActive = computed(() => isSwiping.value && swipeProgress.value.distance > feedbackThreshold)

  const handleTouchStart = (event: TouchEvent) => {
    // Prevent default to avoid scrolling issues
    if (direction === 'horizontal') {
      event.preventDefault()
    }

    const touch = event.touches[0]
    const now = Date.now()

    touchStart.value = {
      x: touch.clientX,
      y: touch.clientY,
      time: now
    }
    touchCurrent.value = touchStart.value
    isSwiping.value = true

    // Reset progress
    swipeProgress.value = {
      distance: 0,
      progress: 0,
      direction: null
    }
  }

  const handleTouchMove = (event: TouchEvent) => {
    if (!isSwiping.value || !touchStart.value) return

    const touch = event.touches[0]
    const now = Date.now()

    touchCurrent.value = {
      x: touch.clientX,
      y: touch.clientY,
      time: now
    }

    // Calculate deltas
    const deltaX = touchCurrent.value.x - touchStart.value.x
    const deltaY = touchCurrent.value.y - touchStart.value.y
    const absDeltaX = Math.abs(deltaX)
    const absDeltaY = Math.abs(deltaY)

    // Update progress for visual feedback
    if (direction === 'horizontal' || direction === 'both') {
      if (absDeltaX > absDeltaY) {
        const progress = Math.min(absDeltaX / threshold, 1)
        swipeProgress.value = {
          distance: absDeltaX,
          progress,
          direction: deltaX > 0 ? 'right' : 'left'
        }

        // Provide progressive haptic feedback
        if (progress >= 0.5 && lastHapticProgress.value < 0.5) {
          triggerSwipeHapticFeedback(progress, false)
          lastHapticProgress.value = 0.5
        } else if (progress >= 0.8 && lastHapticProgress.value < 0.8) {
          triggerSwipeHapticFeedback(progress, false)
          lastHapticProgress.value = 0.8
        }

        // Prevent vertical scrolling during horizontal swipe
        if (absDeltaX > feedbackThreshold) {
          event.preventDefault()
        }
      }
    }

    if (direction === 'vertical' || direction === 'both') {
      if (absDeltaY > absDeltaX) {
        const progress = Math.min(absDeltaY / threshold, 1)
        swipeProgress.value = {
          distance: absDeltaY,
          progress,
          direction: deltaY > 0 ? 'down' : 'up'
        }

        // Provide progressive haptic feedback
        if (progress >= 0.5 && lastHapticProgress.value < 0.5) {
          triggerSwipeHapticFeedback(progress, false)
          lastHapticProgress.value = 0.5
        } else if (progress >= 0.8 && lastHapticProgress.value < 0.8) {
          triggerSwipeHapticFeedback(progress, false)
          lastHapticProgress.value = 0.8
        }

        // Prevent horizontal scrolling during vertical swipe
        if (absDeltaY > feedbackThreshold) {
          event.preventDefault()
        }
      }
    }
  }

  const handleTouchEnd = (event: TouchEvent) => {
    if (!touchStart.value || !touchCurrent.value || !isSwiping.value) {
      resetSwipeState()
      return
    }

    const touch = event.changedTouches[0]
    const endTime = Date.now()
    const endPosition = {
      x: touch.clientX,
      y: touch.clientY,
      time: endTime
    }

    // Calculate final deltas and velocity
    const deltaX = endPosition.x - touchStart.value.x
    const deltaY = endPosition.y - touchStart.value.y
    const absDeltaX = Math.abs(deltaX)
    const absDeltaY = Math.abs(deltaY)
    const timeDelta = endTime - touchStart.value.time
    const velocityX = absDeltaX / timeDelta
    const velocityY = absDeltaY / timeDelta

    // Check if swipe meets requirements
    let isValidSwipe = false
    let swipeDirection: 'left' | 'right' | 'up' | 'down' | null = null

    // Horizontal swipe validation
    if (direction === 'horizontal' || direction === 'both') {
      if (absDeltaX >= threshold &&
          absDeltaX > absDeltaY &&
          velocityX >= velocityThreshold &&
          timeDelta <= maxTime) {
        isValidSwipe = true
        swipeDirection = deltaX > 0 ? 'right' : 'left'
      }
    }

    // Vertical swipe validation
    if ((direction === 'vertical' || direction === 'both') && !isValidSwipe) {
      if (absDeltaY >= threshold &&
          absDeltaY > absDeltaX &&
          velocityY >= velocityThreshold &&
          timeDelta <= maxTime) {
        isValidSwipe = true
        swipeDirection = deltaY > 0 ? 'down' : 'up'
      }
    }

    // Execute callbacks if valid swipe
    if (isValidSwipe) {
      // Provide haptic feedback for successful swipe
      triggerSwipeHapticFeedback(1, true)

      if (swipeDirection === 'right' && onSwipeRight) {
        onSwipeRight()
      } else if (swipeDirection === 'left' && onSwipeLeft) {
        onSwipeLeft()
      }
    }

    // Reset state with animation
    resetSwipeState()
  }

  const handleTouchCancel = () => {
    resetSwipeState()
  }

  const resetSwipeState = () => {
    touchStart.value = null
    touchCurrent.value = null
    isSwiping.value = false
    lastHapticProgress.value = 0
    swipeProgress.value = {
      distance: 0,
      progress: 0,
      direction: null
    }
  }

  return {
    // Event handlers
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,

    // State (readonly)
    isSwiping: readonly(isSwiping),
    swipeProgress: readonly(swipeProgress),

    // Computed properties for UI feedback
    swipeDistance: readonly(swipeDistance),
    swipeProgressPercent: readonly(swipeProgressPercent),
    isSwipeActive: readonly(isSwipeActive),

    // Utility
    resetSwipeState
  }
}



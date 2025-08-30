// Swipe Gesture Composable
// Use-It-Up PWA Frontend

import { ref, readonly } from 'vue'

export interface SwipeGestureOptions {
  threshold?: number // Minimum distance for swipe (default: 100px)
  direction?: 'horizontal' | 'vertical' | 'both' // Swipe direction (default: 'horizontal')
}

export interface TouchPosition {
  x: number
  y: number
}

/**
 * Composable for handling swipe gestures on touch devices
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
    threshold = 100,
    direction = 'horizontal'
  } = options

  const touchStart = ref<TouchPosition | null>(null)
  const touchEnd = ref<TouchPosition | null>(null)
  const isSwiping = ref(false)

  const handleTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0]
    touchStart.value = {
      x: touch.clientX,
      y: touch.clientY
    }
    touchEnd.value = null
    isSwiping.value = true
  }

  const handleTouchMove = (event: TouchEvent) => {
    if (!isSwiping.value) return

    const touch = event.touches[0]
    touchEnd.value = {
      x: touch.clientX,
      y: touch.clientY
    }
  }

  const handleTouchEnd = (event: TouchEvent) => {
    if (!touchStart.value || !isSwiping.value) {
      isSwiping.value = false
      return
    }

    // Use the last touch position if touchEnd is not set
    if (!touchEnd.value) {
      const touch = event.changedTouches[0]
      touchEnd.value = {
        x: touch.clientX,
        y: touch.clientY
      }
    }

    const deltaX = touchEnd.value.x - touchStart.value.x
    const deltaY = touchEnd.value.y - touchStart.value.y
    const absDeltaX = Math.abs(deltaX)
    const absDeltaY = Math.abs(deltaY)

    // Check if swipe meets threshold requirements
    let isValidSwipe = false

    if (direction === 'horizontal' || direction === 'both') {
      isValidSwipe = absDeltaX >= threshold && absDeltaX > absDeltaY
    }

    if ((direction === 'vertical' || direction === 'both') && !isValidSwipe) {
      isValidSwipe = absDeltaY >= threshold && absDeltaY > absDeltaX
    }

    if (isValidSwipe) {
      if (direction === 'horizontal' || direction === 'both') {
        if (deltaX > 0 && onSwipeRight) {
          // Right swipe
          onSwipeRight()
        } else if (deltaX < 0 && onSwipeLeft) {
          // Left swipe
          onSwipeLeft()
        }
      }
    }

    // Reset state
    touchStart.value = null
    touchEnd.value = null
    isSwiping.value = false
  }

  const handleTouchCancel = () => {
    touchStart.value = null
    touchEnd.value = null
    isSwiping.value = false
  }

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    isSwiping: readonly(isSwiping)
  }
}



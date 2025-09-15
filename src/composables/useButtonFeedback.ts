// Button Feedback Composable
// Use-It-Up PWA Frontend

import { ref } from 'vue'
import { triggerButtonHapticFeedback } from '@/utils/hapticFeedback'

/**
 * Composable for enhanced button interactions with haptic and visual feedback
 */
export function useButtonFeedback() {
  const isPressed = ref(false)

  const handleTouchStart = (event: TouchEvent) => {
    isPressed.value = true
    triggerButtonHapticFeedback()

    // Add visual feedback class
    const target = event.currentTarget as HTMLElement
    if (target) {
      target.classList.add('btn--touched')
    }
  }

  const handleTouchEnd = (event: TouchEvent) => {
    isPressed.value = false

    // Remove visual feedback class after animation
    const target = event.currentTarget as HTMLElement
    if (target) {
      setTimeout(() => {
        target.classList.remove('btn--touched')
      }, 150)
    }
  }

  const handleTouchCancel = (event: TouchEvent) => {
    isPressed.value = false

    // Remove visual feedback class
    const target = event.currentTarget as HTMLElement
    if (target) {
      target.classList.remove('btn--touched')
    }
  }

  const handleClick = (callback?: () => void) => {
    // Provide additional haptic feedback for click
    triggerButtonHapticFeedback()

    if (callback) {
      callback()
    }
  }

  return {
    isPressed,
    handleTouchStart,
    handleTouchEnd,
    handleTouchCancel,
    handleClick
  }
}

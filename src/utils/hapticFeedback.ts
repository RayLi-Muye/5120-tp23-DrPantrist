// Haptic Feedback Utilities
// Use-It-Up PWA Frontend

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'

/**
 * Provides haptic feedback if supported by the device
 * @param pattern - The type of haptic feedback to provide
 */
export function triggerHapticFeedback(pattern: HapticPattern = 'light'): void {
  // Check if vibration API is supported
  if (!('vibrate' in navigator)) {
    return
  }

  // Define vibration patterns
  const patterns: Record<HapticPattern, number | number[]> = {
    light: 25,
    medium: 50,
    heavy: 100,
    success: [50, 50, 50],
    warning: [100, 50, 100],
    error: [200, 100, 200]
  }

  const vibrationPattern = patterns[pattern]

  try {
    navigator.vibrate(vibrationPattern)
  } catch (error) {
    // Silently fail if vibration is not supported or blocked
    console.debug('Haptic feedback not available:', error)
  }
}

/**
 * Provides haptic feedback for swipe gestures
 * @param progress - Swipe progress (0-1)
 * @param isComplete - Whether the swipe is complete
 */
export function triggerSwipeHapticFeedback(progress: number, isComplete: boolean): void {
  if (isComplete) {
    triggerHapticFeedback('success')
  } else if (progress >= 0.8) {
    triggerHapticFeedback('medium')
  } else if (progress >= 0.5) {
    triggerHapticFeedback('light')
  }
}

/**
 * Provides haptic feedback for button interactions
 */
export function triggerButtonHapticFeedback(): void {
  triggerHapticFeedback('light')
}

/**
 * Provides haptic feedback for form interactions
 */
export function triggerFormHapticFeedback(): void {
  triggerHapticFeedback('light')
}

/**
 * Provides haptic feedback for navigation
 */
export function triggerNavigationHapticFeedback(): void {
  triggerHapticFeedback('medium')
}

/**
 * Provides haptic feedback for errors
 */
export function triggerErrorHapticFeedback(): void {
  triggerHapticFeedback('error')
}

/**
 * Provides haptic feedback for success actions
 */
export function triggerSuccessHapticFeedback(): void {
  triggerHapticFeedback('success')
}

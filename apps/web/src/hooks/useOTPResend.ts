'use client'

import { useState, useEffect, useCallback } from 'react'
import { authLogger } from '@/lib/auth-logger'

const DEFAULT_COOLDOWN_SECONDS = 60

/**
 * Hook for managing OTP resend functionality
 * Handles cooldown timer and resend logic
 *
 * @param onSuccess - Callback when OTP is successfully resent
 * @param onError - Callback when resend fails
 * @param cooldownSeconds - Cooldown duration in seconds (default: 60)
 */
export function useOTPResend(
  onSuccess: (message: string) => void,
  onError: (error: string) => void,
  cooldownSeconds: number = DEFAULT_COOLDOWN_SECONDS
) {
  const [resendCooldown, setResendCooldown] = useState(0)
  const [isResending, setIsResending] = useState(false)

  // Start cooldown when OTP is sent
  useEffect(() => {
    if (resendCooldown === 0) return

    const timer = setTimeout(() => {
      setResendCooldown(resendCooldown - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [resendCooldown])

  // Trigger cooldown when OTP is sent
  const startCooldown = useCallback(() => {
    setResendCooldown(cooldownSeconds)
  }, [cooldownSeconds])

  // Handle resend with cooldown check
  const handleResend = useCallback(
    async (
      value: string,
      requestFn: (value: string) => Promise<{ success: boolean; error?: string }>
    ) => {
      // Check cooldown
      if (resendCooldown > 0) {
        onError(`Please wait ${resendCooldown}s before resending`)
        return false
      }

      if (isResending) {
        return false
      }

      setIsResending(true)
      try {
        const result = await requestFn(value.trim())

        if (result.success) {
          onSuccess('OTP resent successfully!')
          startCooldown()
          return true
        } else {
          const errorMsg = result.error || 'Failed to resend OTP'
          authLogger.warn('[useOTPResend] Resend failed', { error: errorMsg })
          onError(errorMsg)
          return false
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Error resending OTP'
        authLogger.error('[useOTPResend] Exception', error instanceof Error ? error : { error })
        onError(errorMsg)
        return false
      } finally {
        setIsResending(false)
      }
    },
    [resendCooldown, isResending, onSuccess, onError, startCooldown]
  )

  return {
    resendCooldown,
    isResending,
    handleResend,
    startCooldown,
  }
}

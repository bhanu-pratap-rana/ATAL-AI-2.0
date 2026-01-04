'use client'

import { useState, useCallback } from 'react'

/**
 * Common form state for authentication flows
 */
export interface AuthFormData {
  password?: string
  confirmPassword?: string
  name?: string
  gender?: string
  className?: string
  rollNumber?: string
  [key: string]: string | undefined
}

/**
 * Hook for managing authentication form state
 * Handles form data, field updates, and error management
 */
export function useAuthFormState(initialData: Partial<AuthFormData> = {}) {
  const [formData, setFormData] = useState<AuthFormData>(initialData as AuthFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Update a single field
  const updateField = useCallback((field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }, [errors])

  // Update multiple fields at once
  const updateFields = useCallback((updates: Partial<AuthFormData>) => {
    setFormData((prev) => ({
      ...prev,
      ...updates,
    }))
  }, [])

  // Set error for a field
  const setFieldError = useCallback((field: string, error: string) => {
    setErrors((prev) => ({
      ...prev,
      [field]: error,
    }))
  }, [])

  // Set multiple errors at once
  const setFieldErrors = useCallback((newErrors: Record<string, string>) => {
    setErrors(newErrors)
  }, [])

  // Clear error for a field
  const clearFieldError = useCallback((field: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }, [])

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  // Reset form to initial state
  const reset = useCallback((newInitial?: Partial<AuthFormData>) => {
    if (newInitial) {
      setFormData(newInitial as AuthFormData)
    } else {
      setFormData(initialData as AuthFormData)
    }
    setErrors({})
    setIsSubmitting(false)
  }, [initialData])

  // Get field value
  const getFieldValue = useCallback(
    (field: string): string => {
      return formData[field] || ''
    },
    [formData]
  )

  // Get field error
  const getFieldError = useCallback(
    (field: string): string | undefined => {
      return errors[field]
    },
    [errors]
  )

  // Check if form has any errors
  const hasErrors = Object.keys(errors).length > 0

  return {
    formData,
    errors,
    isSubmitting,
    setIsSubmitting,
    updateField,
    updateFields,
    setFieldError,
    setFieldErrors,
    clearFieldError,
    clearErrors,
    reset,
    getFieldValue,
    getFieldError,
    hasErrors,
  }
}

/**
 * Join class specific state management hook
 * Manages class code and PIN entry for joining an existing class
 * Extracted from the 671-line useAuthState god-object
 */

import { useState, useCallback } from 'react'

export interface JoinClassState {
  classCode: string
  pin: string
  error: string | null
}

export interface JoinClassActions {
  setClassCode: (value: string) => void
  setPin: (value: string) => void
  setError: (error: string | null) => void
  resetAll: () => void
}

const initialState: JoinClassState = {
  classCode: '',
  pin: '',
  error: null,
}

/**
 * Manages join class state for students to join existing classes
 * Extracted from the monolithic useAuthState hook
 */
export function useJoinClassState(): {
  state: JoinClassState
  actions: JoinClassActions
} {
  const [state, setState] = useState<JoinClassState>(initialState)

  const setClassCode = useCallback((value: string) => {
    setState((prev) => ({ ...prev, classCode: value }))
  }, [])

  const setPin = useCallback((value: string) => {
    setState((prev) => ({ ...prev, pin: value }))
  }, [])

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }))
  }, [])

  const resetAll = useCallback(() => {
    setState(initialState)
  }, [])

  const actions: JoinClassActions = {
    setClassCode,
    setPin,
    setError,
    resetAll,
  }

  return { state, actions }
}

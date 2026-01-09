"use client";

/**
 * Modal State Management Hook
 * Consolidates duplicated modal/dialog state management across components
 * Used by: AdminListTable, AdminDeleteDialog, CreateClassDialog, etc.
 */

import { useState, useCallback } from "react";

export interface UseModalStateResult<T> {
  /** Whether modal is open */
  isOpen: boolean;
  /** Data associated with modal */
  data: T;
  /** Open modal with data */
  open: (newData: T) => void;
  /** Close modal and reset data */
  close: () => void;
  /** Update modal data */
  setData: (data: T) => void;
}

/**
 * Hook for managing modal/dialog state with data
 *
 * @param initialState Initial data state
 * @returns Modal state and handlers
 *
 * @example
 * const modal = useModalState<{ id: string; email: string } | null>(null);
 *
 * const openResetModal = (id: string, email: string) => {
 *   modal.open({ id, email });
 * };
 *
 * return (
 *   <>
 *     <button onClick={() => openResetModal(adminId, email)}>Reset</button>
 *     {modal.isOpen && <ResetModal data={modal.data} onClose={modal.close} />}
 *   </>
 * );
 */
export function useModalState<T>(initialState: T): UseModalStateResult<T> {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<T>(initialState);

  const open = useCallback((newData: T) => {
    setData(newData);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setData(initialState);
  }, [initialState]);

  return {
    isOpen,
    data,
    open,
    close,
    setData,
  };
}

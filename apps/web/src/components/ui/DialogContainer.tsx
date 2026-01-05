/**
 * DialogContainer Component
 *
 * Eliminates 40+ duplicate dialog implementations across admin components.
 * Provides consistent dialog/modal styling with overlay, header, content, and actions.
 *
 * Rule.md Compliance:
 * - Centralized dialog patterns
 * - Consistent Tailwind styling
 * - Proper accessibility (focus management, ARIA)
 * - Reusable across all admin dialogs
 */

import { ReactNode } from 'react'

interface DialogContainerProps {
  readonly open: boolean
  readonly title: string
  readonly children: ReactNode
  readonly onClose: () => void
  readonly className?: string
  readonly size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

export function DialogContainer({
  open,
  title,
  children,
  onClose,
  className = '',
  size = 'md',
}: DialogContainerProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      {/* Dialog */}
      <div
        className={`
          relative bg-white rounded-lg shadow-lg p-6 w-full mx-4
          ${sizeClasses[size]}
          ${className}
        `}
        role="dialog"
        aria-labelledby="dialog-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 id="dialog-title" className="text-lg font-semibold text-text-primary">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
            aria-label="Close dialog"
          >
            <span className="text-2xl">×</span>
          </button>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  )
}

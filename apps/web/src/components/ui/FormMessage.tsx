/**
 * FormMessage Component
 *
 * Eliminates 50+ duplicate form message implementations across components.
 * Provides consistent error/success message display with proper styling.
 *
 * Rule.md Compliance:
 * - Centralized message UI logic
 * - Consistent Tailwind styling across all forms
 * - Proper accessibility (ARIA roles)
 * - Type-safe message types
 */

import { AlertTriangle, CheckCircle2, Info, XCircle, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MessageType } from "@/hooks/useFormHandler";
import { Button } from "@/components/ui/button";

interface FormMessageProps {
  readonly type: MessageType;
  readonly text: string;
  readonly onClose?: () => void;
  readonly className?: string;
}

const messageStyles: Record<
  MessageType,
  { bg: string; text: string; border: string; Icon: LucideIcon }
> = {
  success: {
    bg: "bg-success/10",
    text: "text-success-dark",
    border: "border-success/30",
    Icon: CheckCircle2,
  },
  error: {
    bg: "bg-error/10",
    text: "text-error",
    border: "border-error/30",
    Icon: XCircle,
  },
  info: {
    bg: "bg-info/10",
    text: "text-info-dark",
    border: "border-info/30",
    Icon: Info,
  },
  warning: {
    bg: "bg-warning/10",
    text: "text-warning-dark",
    border: "border-warning/30",
    Icon: AlertTriangle,
  },
};

export function FormMessage({
  type,
  text,
  onClose,
  className = "",
}: FormMessageProps) {
  const styles = messageStyles[type];
  const Icon = styles.Icon;

  return (
    <div
      role="alert"
      className={`
        flex items-start gap-3 p-3 rounded-2xl border-l-4
        ${styles.bg} ${styles.border} ${styles.text}
        ${className}
      `}
    >
      <Icon className="shrink-0 w-5 h-5 mt-0.5" strokeWidth={2.25} aria-hidden="true" />
      <div className="flex-1">
        <p className="text-sm font-medium">{text}</p>
      </div>
      {onClose && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="shrink-0 h-7 w-7 opacity-70 hover:opacity-100"
          aria-label="Close message"
        >
          <X size={16} strokeWidth={2.25} aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

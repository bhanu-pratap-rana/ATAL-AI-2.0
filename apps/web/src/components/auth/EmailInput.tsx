import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EmailInputProps {
  readonly id: string;
  readonly label?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly helperText?: string;
  readonly autoFocus?: boolean;
  readonly required?: boolean;
}

/**
 * Reusable email input component
 * Handles email input with built-in validation feedback
 */
export function EmailInput({
  id,
  label = "Email Address",
  value,
  onChange,
  error,
  disabled = false,
  placeholder = "you@example.com",
  helperText,
  autoFocus = false,
  required = true,
}: EmailInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="email"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoFocus={autoFocus}
        required={required}
        className="bg-muted"
        aria-label={label}
        aria-describedby={
          error ? `${id}-error` : helperText ? `${id}-helper` : undefined
        }
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${id}-helper`} className="text-xs text-text-secondary">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Input } from "./input";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps {
  readonly id: string;
  readonly label?: string;
  readonly placeholder?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly disabled?: boolean;
  readonly helpText?: string;
  readonly ariaLabelShow?: string;
  readonly ariaLabelHide?: string;
  readonly "aria-describedby"?: string;
  readonly className?: string;
  readonly showPassword?: boolean;
  readonly onShowPasswordChange?: (show: boolean) => void;
}

/**
 * PasswordInput - Reusable password input field with visibility toggle
 *
 * Features:
 * - Eye/EyeOff icon toggle to show/hide password
 * - Optional label and help text
 * - ARIA accessibility attributes
 * - Consistent styling across forms
 * - Flexible state management (internal or external)
 */
export function PasswordInput({
  id,
  label,
  placeholder = "Enter password",
  value,
  onChange,
  disabled = false,
  helpText,
  ariaLabelShow = "Show password",
  ariaLabelHide = "Hide password",
  "aria-describedby": ariaDescribedBy,
  className = "",
  showPassword: externalShowPassword,
  onShowPasswordChange: externalOnShowPasswordChange,
}: PasswordInputProps) {
  // Use internal state if external state not provided
  const [internalShowPassword, setInternalShowPassword] = useState(false);

  const showPassword =
    externalShowPassword ?? internalShowPassword;

  const handleShowPasswordChange = (newValue: boolean) => {
    if (externalOnShowPasswordChange) {
      externalOnShowPasswordChange(newValue);
    } else {
      setInternalShowPassword(newValue);
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={id} className="text-sm font-semibold">
          {label}
        </label>
      )}

      <div className="relative">
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-describedby={ariaDescribedBy}
          className={`focus:ring-primary focus:border-primary pr-10 ${className}`}
        />
        <button
          type="button"
          onClick={() => handleShowPasswordChange(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text disabled:opacity-50"
          disabled={disabled}
          aria-label={showPassword ? ariaLabelHide : ariaLabelShow}
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </div>

      {helpText && (
        <p id={ariaDescribedBy} className="text-xs text-text-secondary">
          {helpText}
        </p>
      )}
    </div>
  );
}

"use client";

/**
 * AssessmentOption
 *
 * Single answer choice row in the assessment runner. Renders a native
 * <input type="radio"> (sr-only) wrapped in a clickable <label>, with
 * a visible circular indicator and the option text.
 *
 * Extracted from AssessmentRunner.tsx as part of SP8 T8.3 (PR-2).
 * The parent owns shuffle order, selection state, and submit gating;
 * this component is pure presentation + one onSelect callback.
 *
 * Accessibility:
 * - Real radio input keeps native keyboard navigation (arrow keys)
 * - aria-label includes the positional letter so a screen reader can
 *   announce "Option C: Bandwidth is..."
 * - 44px min-height on the label hits WCAG 2.5.5 (Target Size)
 */

import {
  getOptionButtonClasses,
  getRadioButtonClasses,
} from "./runner-utils";

interface AssessmentOptionProps {
  readonly option: { id: string; text: string };
  readonly index: number;
  readonly selected: boolean;
  readonly disabled: boolean;
  readonly fontClass: string;
  readonly onSelect: (index: number) => void;
}

export function AssessmentOption({
  option,
  index,
  selected,
  disabled,
  fontClass,
  onSelect,
}: AssessmentOptionProps) {
  // Fixed positional labels: A, B, C, D always in order
  // Option content shuffles but labels stay sequential
  const label = String.fromCodePoint(65 + index); // A=65
  const status = selected ? "selected" : "unselected";

  return (
    <label
      className={`w-full text-left p-4 min-h-11 rounded-2xl border-2 transition-all duration-200 cursor-pointer focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 ${getOptionButtonClasses(status)} ${disabled ? "pointer-events-none opacity-50" : ""}`}
    >
      <input
        type="radio"
        name="assessment-option"
        checked={selected}
        onChange={() => onSelect(index)}
        disabled={disabled}
        className="sr-only"
        aria-label={`Option ${label}: ${option.text}`}
      />
      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className={`shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center transition-colors ${getRadioButtonClasses(status)}`}
        >
          {selected && <div className="w-4 h-4 bg-white rounded-full" />}
        </div>
        <span className={`text-base text-slate-800 wrap-break-word ${fontClass}`}>
          <span className="font-semibold mr-2">{label}.</span>
          {option.text}
        </span>
      </div>
    </label>
  );
}

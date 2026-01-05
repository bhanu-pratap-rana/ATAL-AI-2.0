"use client";

import { useEffect, useState } from "react";

/**
 * ATAL AI Assessment Result Circle - Jyoti Theme
 *
 * Rule.md Compliant: Uses CSS variable classes from globals.css
 * NO hardcoded hex values - all colors via design tokens
 *
 * Features:
 * - Circular SVG progress display
 * - Animated fill
 * - Color-coded by percentage (success ≥80%, warning ≥60%, error <60%)
 */

interface ResultCircleProps {
  /** Score percentage (0-100) */
  readonly percentage: number;
  /** Size of the circle in pixels */
  readonly size?: number;
  /** Stroke width in pixels */
  readonly strokeWidth?: number;
  /** Label text below percentage */
  readonly label?: string;
  /** Whether to animate the fill */
  readonly animate?: boolean;
  /** Custom class name */
  readonly className?: string;
}

export function ResultCircle({
  percentage,
  size = 160,
  strokeWidth = 12,
  label = "Score",
  animate = true,
  className = "",
}: ResultCircleProps) {
  const [displayPercentage, setDisplayPercentage] = useState(
    animate ? 0 : percentage,
  );

  // Calculate SVG values
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (displayPercentage / 100) * circumference;

  // Determine color class based on percentage
  const getColorClass = (pct: number) => {
    if (pct >= 80) return "text-success";
    if (pct >= 60) return "text-warning";
    return "text-error";
  };

  const getPerformanceText = (pct: number) => {
    if (pct >= 80) return "Excellent!";
    if (pct >= 60) return "Good!";
    return "Keep Practicing";
  };

  // Animate percentage on mount
  useEffect(() => {
    if (!animate) {
      setDisplayPercentage(percentage);
      return;
    }

    const duration = 1500; // ms
    const steps = 60;
    const increment = percentage / steps;
    let current = 0;

    const interval = setInterval(() => {
      current += increment;
      if (current >= percentage) {
        setDisplayPercentage(percentage);
        clearInterval(interval);
      } else {
        setDisplayPercentage(Math.round(current));
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [percentage, animate]);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* SVG Circle */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
          role="img"
          aria-label={`Score: ${percentage}%`}
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-border"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={`${getColorClass(percentage)} transition-[stroke-dashoffset] duration-1000 ease-out`}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`text-4xl md:text-5xl font-bold tabular-nums ${getColorClass(percentage)}`}
          >
            {displayPercentage}%
          </span>
          <span className="text-sm text-text-secondary mt-1">{label}</span>
        </div>
      </div>

      {/* Performance text */}
      <p className={`mt-4 text-lg font-semibold ${getColorClass(percentage)}`}>
        {getPerformanceText(percentage)}
      </p>
    </div>
  );
}

/**
 * Compact version for use in cards/lists
 */
export function CompactResultCircle({
  percentage,
  size = 64,
  strokeWidth = 6,
}: Pick<ResultCircleProps, "percentage" | "size" | "strokeWidth">) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColorClass = (pct: number) => {
    if (pct >= 80) return "text-success";
    if (pct >= 60) return "text-warning";
    return "text-error";
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
        role="img"
        aria-label={`Score: ${percentage}%`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={getColorClass(percentage)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-bold ${getColorClass(percentage)}`}>
          {percentage}%
        </span>
      </div>
    </div>
  );
}

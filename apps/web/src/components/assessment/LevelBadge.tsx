"use client";

/**
 * ATAL AI Assessment Level Badge - Jyoti Theme
 *
 * Rule.md Compliant: Uses CSS variable classes from globals.css
 * NO hardcoded hex values - all colors via design tokens
 *
 * Features:
 * - Beginner / Intermediate / Advanced levels
 * - Icon indicators
 * - Based on score thresholds
 */

type SkillLevel = "beginner" | "intermediate" | "advanced";

interface LevelBadgeProps {
  /** Score percentage (0-100) to determine level */
  readonly score?: number;
  /** Direct level specification (overrides score) */
  readonly level?: SkillLevel;
  /** Size variant */
  readonly size?: "sm" | "md" | "lg";
  /** Custom class name */
  readonly className?: string;
}

const LEVEL_CONFIG: Record<
  SkillLevel,
  {
    label: string;
    icon: string;
    description: string;
    colorClass: string;
    bgClass: string;
  }
> = {
  beginner: {
    label: "Beginner",
    icon: "🌱",
    description: "Just starting your digital journey",
    colorClass: "text-primary",
    bgClass: "bg-primary-light",
  },
  intermediate: {
    label: "Intermediate",
    icon: "🌿",
    description: "Growing your digital skills",
    colorClass: "text-success",
    bgClass: "bg-success-light",
  },
  advanced: {
    label: "Advanced",
    icon: "🌳",
    description: "Mastering digital literacy",
    colorClass: "text-cyan",
    bgClass: "bg-cyan-light",
  },
};

/**
 * Determine skill level from percentage score
 * Thresholds: <50% Beginner, 50-79% Intermediate, ≥80% Advanced
 */
const getLevelFromScore = (score: number): SkillLevel => {
  if (score >= 80) return "advanced";
  if (score >= 50) return "intermediate";
  return "beginner";
};

/**
 * Determine skill level from score or explicit level prop
 */
function getSkillLevel(
  level: SkillLevel | undefined,
  score: number | undefined,
): SkillLevel {
  if (level) return level;
  if (score !== undefined) return getLevelFromScore(score);
  return "beginner";
}

export function LevelBadge({
  score,
  level,
  size = "md",
  className = "",
}: LevelBadgeProps) {
  // Determine level from score or prop
  const skillLevel = getSkillLevel(level, score);
  const config = LEVEL_CONFIG[skillLevel];

  // Size classes
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  const iconSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <output
      className={`
        inline-flex items-center gap-2 rounded-full font-semibold
        ${config.bgClass} ${config.colorClass}
        ${sizeClasses[size]}
        ${className}
      `}
      aria-label={`Skill level: ${config.label}`}
    >
      <span className={iconSizes[size]} aria-hidden="true">
        {config.icon}
      </span>
      <span>{config.label}</span>
    </output>
  );
}

/**
 * Expanded level display with description
 */
export function LevelCard({
  score,
  level,
  className = "",
}: Readonly<Omit<LevelBadgeProps, "size">>) {
  const skillLevel = getSkillLevel(level, score);
  const config = LEVEL_CONFIG[skillLevel];

  return (
    <div
      className={`
        rounded-xl p-4 text-center
        ${config.bgClass}
        ${className}
      `}
    >
      <div className="text-4xl mb-2" aria-hidden="true">
        {config.icon}
      </div>
      <h3 className={`text-lg font-black ${config.colorClass}`}>
        {config.label}
      </h3>
      <p className="text-sm text-slate-500 mt-1">{config.description}</p>
    </div>
  );
}

// Export utility function for external use
export { getLevelFromScore };

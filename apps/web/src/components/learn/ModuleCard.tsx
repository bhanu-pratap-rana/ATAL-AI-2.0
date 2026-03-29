"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLanguage, getLocalizedField } from "@/lib/i18n";

export interface ModuleProgress {
  readonly module_id: string;
  readonly topics_completed: number;
  readonly average_mastery: number;
  readonly is_complete: boolean;
}

export interface Module {
  readonly id: string;
  readonly name_en: string;
  readonly name_as: string;
  readonly description: string;
  readonly description_en?: string;
  readonly description_hi?: string;
  readonly description_as?: string;
  readonly icon: string;
  readonly topics: number;
  readonly color: string;
  readonly culturalNote?: string;
  readonly cultural_note_en?: string;
  readonly cultural_note_hi?: string;
  readonly cultural_note_as?: string;
  readonly name_hi?: string;
  [key: string]: unknown; // For getLocalizedField compatibility
}

interface ModuleCardProps {
  readonly module: Module;
  readonly progress: ModuleProgress;
  readonly progressPercent: number;
  readonly isUnlocked: boolean;
  readonly index: number;
}

export function ModuleCard({
  module,
  progress,
  progressPercent,
  isUnlocked,
  index,
}: ModuleCardProps) {
  const { language, t } = useLanguage();

  // Get localized module content
  const moduleName = getLocalizedField(module, "name", language);
  const moduleDescription = getLocalizedField(module, "description", language) || module.description;
  const culturalNote = getLocalizedField(module, "cultural_note", language) || module.culturalNote;

  // Get secondary name for display (show Assamese if not selected, or Hindi if Assamese selected)
  const secondaryName = language === "as"
    ? module.name_hi || module.name_en
    : module.name_as;

  // Get button label based on progress
  const getButtonLabel = () => {
    if (progress.is_complete) return t("learn.reviewModule");
    if (progress.topics_completed > 0) return t("learn.continueModule");
    return t("learn.startModule");
  };

  return (
    <div
      className={`bg-white rounded-3xl border p-5 shadow-[0_4px_20px_rgb(0,0,0,0.05)] transition-all ${
        isUnlocked
          ? "hover:shadow-[0_8px_30px_rgb(0,0,0,0.1)] cursor-pointer border-slate-100"
          : "opacity-60 cursor-not-allowed border-slate-100"
      } ${progress.is_complete ? "border-l-4 border-l-success border-slate-100" : ""}`}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* A11Y-002 FIX: Added role="img" and aria-label for screen reader accessibility */}
          <div
            className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${module.color} flex items-center justify-center text-2xl shadow-md flex-shrink-0`}
            role="img"
            aria-label={`${moduleName} module icon`}
          >
            {module.icon}
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              {moduleName}
              {progress.is_complete && (
                <span className="text-success text-sm">✓</span>
              )}
              {!isUnlocked && <span className="text-sm">🔒</span>}
            </h3>
            {secondaryName && (
              <p className="text-xs text-slate-400">{secondaryName}</p>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-sm font-bold text-slate-700">
            {progress.topics_completed}/{module.topics}
          </div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t("learn.topics")}</div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-500 mb-4 leading-relaxed">
        {moduleDescription}
      </p>

      {culturalNote && (
        <p className="text-xs text-warning-dark mb-3 flex items-center gap-1">
          <span>🏔️</span> {culturalNote}
        </p>
      )}

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
          <span className="font-semibold">{progressPercent}% {t("learn.complete")}</span>
          <span>{t("learn.avg")} {progress.average_mastery}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progress.is_complete
                ? "bg-success"
                : `bg-gradient-to-r ${module.color}`
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Action Button */}
      {isUnlocked && (
        <Link href={`/app/learn/${module.id}`}>
          <Button
            className="w-full"
            variant={progress.is_complete ? "outline" : "default"}
          >
            {getButtonLabel()}
          </Button>
        </Link>
      )}

      {!isUnlocked && (
        <div className="text-center text-sm text-slate-400">
          {t("learn.completeToUnlock", { n: String(index) })}
        </div>
      )}
    </div>
  );
}

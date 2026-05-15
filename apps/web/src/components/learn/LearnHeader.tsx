"use client";

/**
 * Learn Page Header Component
 *
 * Provides consistent header across Learn pages with:
 * - Back to Dashboard link
 * - Language selector with localStorage persistence
 * - Page title
 */

import Link from "next/link";
import { LanguageSelector } from "./LanguageSelector";
import { useLanguage } from "@/lib/i18n";

interface LearnHeaderProps {
  /** Title to display - can be a translation key like "learn.yourPath" or plain text */
  readonly title?: string;
  /** Custom back link (overrides default) */
  readonly backLink?: {
    href: string;
    label: string;
  };
  /** Whether to show the language selector */
  readonly showLanguageSelector?: boolean;
  /** Use translation keys for title instead of literal strings */
  readonly useTranslationKeys?: boolean;
}

export function LearnHeader({
  title,
  backLink,
  showLanguageSelector = true,
  useTranslationKeys = false,
}: LearnHeaderProps) {
  const { t } = useLanguage();

  const displayTitle = useTranslationKeys && title
    ? t(title)
    : title || t("learn.yourPath");

  const resolvedBackLink = backLink || {
    href: "/app/student/dashboard",
    label: "",
  };

  return (
    <div className="flex items-center justify-between gap-3 mb-6">
      <div className="flex items-center gap-3">
        <Link
          href={resolvedBackLink.href}
          aria-label={`Back to ${resolvedBackLink.label || "previous page"}`}
          className="w-11 h-11 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors shrink-0"
        >
          ←
        </Link>
        <h1 className="text-xl sm:text-2xl font-black text-slate-800">{displayTitle}</h1>
      </div>
      {showLanguageSelector && <LanguageSelector variant="compact" />}
    </div>
  );
}

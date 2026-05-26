/**
 * Translation core — pure functions, safe to import from both server and
 * client code. Anything that needs React context lives in LanguageProvider.
 */

import type {
  SupportedLanguage,
  InterpolationValues,
  TranslationFile,
} from "./types";

import enTranslations from "./locales/en.json";
import hiTranslations from "./locales/hi.json";
import asTranslations from "./locales/as.json";

/** Map of language codes to their translation objects. */
export const TRANSLATIONS: Record<SupportedLanguage, TranslationFile> = {
  en: enTranslations as TranslationFile,
  hi: hiTranslations as TranslationFile,
  as: asTranslations as TranslationFile,
};

/**
 * Gets a nested value from an object using dot notation.
 * Example: getNestedValue(obj, "common.loading") → obj.common.loading
 */
export function getNestedValue(obj: unknown, path: string): string | undefined {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === "string" ? current : undefined;
}

/**
 * Interpolates values into a translation string.
 * Example: interpolate("Hello, {name}!", { name: "John" }) → "Hello, John!"
 */
export function interpolate(
  template: string,
  values?: InterpolationValues,
): string {
  if (!values) {
    return template;
  }

  return template.replaceAll(/\{(\w+)\}/g, (match, key) => {
    const value = values[key];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Standalone translation function — no React context, safe on the server.
 * Use this in server components or in client components that receive an
 * explicit `language` prop.
 *
 * @example
 *   getTranslation("lessonPlayer.typeConcept", language) // → "अवधारणा"
 *   getTranslation("lessonCompletion.msgGood", language, { topic: "Internet Safety" })
 */
export function getTranslation(
  key: string,
  language: SupportedLanguage,
  values?: InterpolationValues,
): string {
  let value = getNestedValue(TRANSLATIONS[language], key);
  if (value === undefined && language !== "en") {
    value = getNestedValue(TRANSLATIONS.en, key);
  }
  if (value === undefined) return key;
  return interpolate(value, values);
}

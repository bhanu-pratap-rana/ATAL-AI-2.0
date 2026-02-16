/**
 * Database Localization Utilities
 *
 * Helpers for extracting localized content from database entities
 * that use the `field_en`, `field_hi`, `field_as` naming pattern.
 */

import type { SupportedLanguage } from "./types";

/**
 * Generic helper to get a localized field from a database entity
 *
 * Works with any entity that has fields like `name_en`, `name_hi`, `name_as`
 * Automatically falls back to English if the requested language is not available
 *
 * @param entity - The database entity object
 * @param field - The base field name (e.g., "name", "description")
 * @param language - The target language
 * @returns The localized string, or empty string if not found
 *
 * @example
 * ```typescript
 * const module = { name_en: "Computer Basics", name_hi: "कंप्यूटर मूल बातें", name_as: "কম্পিউটাৰ মূল কথা" };
 * getLocalizedField(module, "name", "hi"); // → "कंप्यूटर मूल बातें"
 * getLocalizedField(module, "name", "en"); // → "Computer Basics"
 * ```
 */
export function getLocalizedField<T extends Record<string, unknown>>(
  entity: T,
  field: string,
  language: SupportedLanguage
): string {
  // Try the requested language first
  const langKey = `${field}_${language}`;
  const langValue = entity[langKey];

  if (typeof langValue === "string" && langValue.length > 0) {
    return langValue;
  }

  // Fallback to English
  const fallbackKey = `${field}_en`;
  const fallbackValue = entity[fallbackKey];

  if (typeof fallbackValue === "string") {
    return fallbackValue;
  }

  // Last resort: return empty string
  return "";
}

// ============================================
// Pre-built helpers for common entities
// ============================================

/** Module entity type with index signature for flexibility */
interface ModuleEntity {
  name_en: string;
  name_hi?: string;
  name_as?: string;
  description_en?: string;
  description_hi?: string;
  description_as?: string;
  cultural_note_en?: string;
  cultural_note_hi?: string;
  cultural_note_as?: string;
  [key: string]: unknown;
}

/** Topic entity type with index signature for flexibility */
interface TopicEntity {
  name_en: string;
  name_hi?: string;
  name_as?: string;
  description_en?: string;
  description_hi?: string;
  description_as?: string;
  [key: string]: unknown;
}

/** Unit entity type with index signature for flexibility */
interface UnitEntity {
  unit_name_en: string;
  unit_name_hi?: string;
  unit_name_as?: string;
  unit_description_en?: string;
  unit_description_hi?: string;
  unit_description_as?: string;
  [key: string]: unknown;
}

/** Badge entity type with index signature for flexibility */
interface BadgeEntity {
  name_en: string;
  name_hi?: string;
  name_as?: string;
  description_en?: string;
  description_hi?: string;
  description_as?: string;
  [key: string]: unknown;
}

/**
 * Get localized module name
 */
export function getModuleName(
  module: ModuleEntity,
  language: SupportedLanguage
): string {
  return getLocalizedField(module, "name", language);
}

/**
 * Get localized module description
 */
export function getModuleDescription(
  module: ModuleEntity,
  language: SupportedLanguage
): string {
  return getLocalizedField(module, "description", language);
}

/**
 * Get localized module cultural note
 */
export function getModuleCulturalNote(
  module: ModuleEntity,
  language: SupportedLanguage
): string {
  return getLocalizedField(module, "cultural_note", language);
}

/**
 * Get localized topic name
 */
export function getTopicName(
  topic: TopicEntity,
  language: SupportedLanguage
): string {
  return getLocalizedField(topic, "name", language);
}

/**
 * Get localized topic description
 */
export function getTopicDescription(
  topic: TopicEntity,
  language: SupportedLanguage
): string {
  return getLocalizedField(topic, "description", language);
}

/**
 * Get localized unit name
 */
export function getUnitName(
  unit: UnitEntity,
  language: SupportedLanguage
): string {
  return getLocalizedField(unit, "unit_name", language);
}

/**
 * Get localized unit description
 */
export function getUnitDescription(
  unit: UnitEntity,
  language: SupportedLanguage
): string {
  return getLocalizedField(unit, "unit_description", language);
}

/**
 * Get localized badge name
 */
export function getBadgeName(
  badge: BadgeEntity,
  language: SupportedLanguage
): string {
  return getLocalizedField(badge, "name", language);
}

/**
 * Get localized badge description
 */
export function getBadgeDescription(
  badge: BadgeEntity,
  language: SupportedLanguage
): string {
  return getLocalizedField(badge, "description", language);
}

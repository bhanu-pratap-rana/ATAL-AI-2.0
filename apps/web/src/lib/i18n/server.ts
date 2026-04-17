import { cookies } from "next/headers";
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, type SupportedLanguage } from "./types";

const VALID_LANGUAGES: ReadonlySet<SupportedLanguage> = new Set(["en", "hi", "as"]);

function isSupportedLanguage(value: string | undefined): value is SupportedLanguage {
  return value !== undefined && VALID_LANGUAGES.has(value as SupportedLanguage);
}

export async function getServerLanguage(): Promise<SupportedLanguage> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LANGUAGE_STORAGE_KEY)?.value;
  return isSupportedLanguage(value) ? value : DEFAULT_LANGUAGE;
}

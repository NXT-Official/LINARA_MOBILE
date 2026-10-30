/**
 * The app's languages, the same set as the Business Console's (LINARA_ADMIN
 * D42) with Taglish in place of Filipino: Taglish is what the app has always
 * spoken to helpers, so it stays the default and the source every other
 * language is checked against. Each label is in its own language, so anyone
 * can find theirs.
 */
export const LOCALES = [
  { code: "tl", label: "Taglish" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "zh-CN", label: "简体中文" },
  { code: "ja", label: "日本語" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];

export const DEFAULT_LOCALE: Locale = "tl";

/** Where the phone keeps her choice: the language code only, nothing about her. */
export const LOCALE_STORAGE_KEY = "linara.locale";

export function parseLocale(raw: string | null | undefined): Locale {
  return LOCALES.find((l) => l.code === raw)?.code ?? DEFAULT_LOCALE;
}

export function localeLabel(locale: Locale): string {
  return (LOCALES.find((l) => l.code === locale) ?? LOCALES[0]).label;
}

/**
 * Her first language when she hasn't picked one: the phone's, but only for
 * the languages a helper's phone is set to because she reads them better.
 * Many Filipino phones are set to English, and the app has always spoken
 * Taglish to helpers, so English and anything unknown start in Taglish.
 */
export function localeFromDevice(tags: readonly string[]): Locale {
  for (const tag of tags) {
    const lower = tag.toLowerCase();
    if (lower.startsWith("es")) return "es";
    if (lower.startsWith("zh")) return "zh-CN";
    if (lower.startsWith("ja")) return "ja";
    if (lower.startsWith("fil") || lower.startsWith("tl") || lower.startsWith("en")) return "tl";
  }
  return DEFAULT_LOCALE;
}

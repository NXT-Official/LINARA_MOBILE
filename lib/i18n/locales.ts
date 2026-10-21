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

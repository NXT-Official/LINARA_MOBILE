import { createInstance, type ParseKeys } from "i18next";

import { DEFAULT_LOCALE, type Locale } from "./locales";
import { RESOURCES, type Catalog } from "./resources";

declare module "i18next" {
  interface CustomTypeOptions {
    resources: { translation: Catalog };
    returnNull: false;
  }
}

/**
 * The app's one i18next instance. Placeholders keep the app's `{name}` form
 * rather than i18next's `{{name}}`, and nothing is HTML-escaped: React
 * Native renders text, not markup. A key missing in a language falls back
 * to Taglish, never to the raw key.
 *
 * Plurals need Intl.PluralRules, which Hermes lacks; app/_layout.tsx loads
 * the intl-pluralrules polyfill before this runs on a phone.
 */
export const i18n = createInstance();

void i18n.init({
  resources: RESOURCES,
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  initAsync: false,
  interpolation: { prefix: "{", suffix: "}", escapeValue: false },
  returnNull: false,
});

/** A key, checked against the Taglish catalog. */
export type MessageKey = ParseKeys;

export type Vars = Record<string, string | number>;

/** Outside React (lib/, alerts built in services): one language, now. */
export function translate(locale: Locale, key: MessageKey, vars?: Vars): string {
  return i18n.getFixedT(locale)(key, vars ?? {});
}

/** Outside React, in the language she's using now (lib/, services/). */
export function tr(key: MessageKey, vars?: Vars): string {
  return i18n.t(key, vars ?? {});
}

/** The catalog's lists: day and month names (locales/<lang>/dates.json). */
export type ListKey = "dates.days" | "dates.daysShort" | "dates.monthsShort" | "dates.monthsLong";

/** A list from the catalog, in the current language, falling back to Taglish. */
export function trList(key: ListKey): string[] {
  const read = (lng: string) => i18n.getResource(lng, "translation", key) as unknown;
  const list = read(i18n.language);
  return Array.isArray(list) ? (list as string[]) : (read(DEFAULT_LOCALE) as string[]);
}

/** The tag Intl formatting should use for the current language. */
export function intlLocale(): string {
  return (
    { tl: "fil-PH", en: "en-PH", es: "es", "zh-CN": "zh-CN", ja: "ja-JP" }[
      (i18n.language as Locale) ?? DEFAULT_LOCALE
    ] ?? "fil-PH"
  );
}

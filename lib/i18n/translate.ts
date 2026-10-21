import type { Locale } from "./locales";
import { en } from "./messages/en";
import { es } from "./messages/es";
import { ja } from "./messages/ja";
import { tl, type MessageKey } from "./messages/tl";
import { zhCN } from "./messages/zh-CN";

export type { MessageKey };

export const MESSAGES: Record<Locale, Record<MessageKey, string>> = {
  tl,
  en,
  es,
  "zh-CN": zhCN,
  ja,
};

export type Vars = Record<string, string | number>;

/** Fills `{name}` placeholders. A missing value leaves the placeholder showing. */
export function translate(locale: Locale, key: MessageKey, vars?: Vars): string {
  const text = MESSAGES[locale][key] ?? tl[key];
  return vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => String(vars[k] ?? m)) : text;
}

/**
 * A text split around its placeholders, for a sentence with a link or bold
 * word inside it: the word's place differs between languages, so the screen
 * can't glue fixed pieces together. "a {x} b" -> ["a ", { name: "x" }, " b"].
 */
export function textParts(text: string): (string | { name: string })[] {
  const parts: (string | { name: string })[] = [];
  let last = 0;
  for (const m of text.matchAll(/\{(\w+)\}/g)) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push({ name: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

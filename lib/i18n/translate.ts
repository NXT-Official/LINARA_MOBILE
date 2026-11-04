export { translate, type MessageKey, type Vars } from "./instance";

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

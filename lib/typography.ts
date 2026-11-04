import { fonts } from "./theme";

type Weight = string | number | undefined;

/**
 * The Nunito Sans file for a text's weight, or null when the text already
 * names its own family (a Literata heading, the wordmark). Android and iOS
 * don't pick a bold file from one family name plus a weight, so each weight
 * is its own family; anything heavier than regular that isn't 700+ gets the
 * semibold file rather than being drawn regular.
 */
export function bodyFontFor(
  fontFamily: string | undefined,
  fontWeight: Weight,
): { fontFamily: string; fontWeight: "normal" } | null {
  if (fontFamily) return null;
  const w = fontWeight === "bold" ? 700 : Number(fontWeight ?? 400);
  const family =
    !Number.isFinite(w) || w < 500 ? fonts.body : w < 700 ? fonts.bodySemiBold : fonts.bodyBold;
  // The weight is in the file now; leaving it set makes Android thicken the
  // bold file again and iOS fall back to the system font.
  return { fontFamily: family, fontWeight: "normal" as const };
}

/**
 * An amount as typed: "1,500", "₱3,450.50", " 300 ". Commas group thousands,
 * as amounts are written in the Philippines; parseFloat stopped at the comma
 * and sent a "1,500" vale as ₱1 (../LINARA/KNOWN_GAPS.md C99, QA LMM-A7).
 * null when empty or not an amount (negative, letters, two dots).
 */
export function parseAmount(text: string): number | null {
  const t = text.replace(/[,₱\s]/g, "");
  if (!/^(\d+\.?\d*|\.\d+)$/.test(t)) return null;
  return Number(t);
}

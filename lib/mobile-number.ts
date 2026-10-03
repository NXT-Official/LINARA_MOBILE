/**
 * A GCash or Maya number as Linara stores it: 09 and nine digits
 * (../LINARA/supabase/add-direct-gcash-pay.sql checks the same). Takes what
 * people type: spaces, dashes, or +63 in front. Null if it isn't one.
 */
export function normalizeMobileNumber(raw: string): string | null {
  const digits = raw.replace(/[\s-]/g, "").replace(/^\+63/, "0");
  return /^09\d{9}$/.test(digits) ? digits : null;
}

/** 0917 123 4567, for reading back. */
export function spacedMobileNumber(n: string): string {
  return `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}`;
}

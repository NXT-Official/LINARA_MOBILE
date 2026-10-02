import { supabase } from "@/services/supabase";

export interface LedgerEntry {
  id: string;
  title: string;
  kind: "task" | "utos";
  durationMinutes: number;
  adjustMinutes: number;
  /** `null` means the entry hasn't been classified into rest-owed vs premium yet. */
  resolutionType: "rest_owed" | "premium_pay" | null;
  createdAt: string;
}

interface LedgerEntryRow {
  id: string;
  title: string;
  kind: "task" | "utos";
  duration_minutes: number;
  adjust_minutes: number;
  resolution_type: "rest_owed" | "premium_pay" | null;
  created_at: string;
}

/**
 * Lists the signed-in helper's own after-hours ledger (roadmap Story 11
 * step 3). `ledger_entries_isolation` RLS (../LINARA/architecture.md Section
 * 8) already scopes this to the caller's own household via a join through
 * helper_profiles -- the `helper_id` filter here just narrows to this one
 * helper's rows within it.
 */
export async function getMyLedgerEntries(helperId: string): Promise<LedgerEntry[]> {
  const { data, error } = await supabase
    .from("ledger_entries")
    .select("id, title, kind, duration_minutes, adjust_minutes, resolution_type, created_at")
    .eq("helper_id", helperId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: LedgerEntryRow) => ({
    id: row.id,
    title: row.title,
    kind: row.kind,
    durationMinutes: row.duration_minutes,
    adjustMinutes: row.adjust_minutes,
    resolutionType: row.resolution_type,
    createdAt: row.created_at,
  }));
}

/** An entry's real accrued minutes -- the manual adjustment on top of the auto-computed base, floored at zero. */
export function ledgerEntryMinutes(entry: LedgerEntry): number {
  return Math.max(0, entry.durationMinutes + entry.adjustMinutes);
}

/**
 * Total minutes accrued as time-off-in-lieu (roadmap Story 11's Rest Owed
 * Counter / plan.md 3.2).
 *
 * FALLBACK ONLY. The authoritative number is `rest_owed_balance_minutes`
 * (../LINARA/supabase/add-rest-off-requests.sql), read via
 * `getRestOwedBalance` -- the manager's dashboard, this app and the approval
 * guard all use it precisely so the three cannot disagree. This local sum
 * exists to show something while that query is in flight, and it is an
 * OVER-estimate: it does not subtract minutes already redeemed through an
 * approved rest-off request.
 *
 * `premium_pay` entries are COUNTED, matching the RPC's COUNT_PREMIUM_AS_REST
 * behaviour. This previously excluded them, on the strength of a comment
 * saying they were "paid in cash instead" -- they never were. Nothing has ever
 * paid a premium entry, so excluding them accrued rest-day work to NOTHING,
 * and the 2026-08-16 decision (../LINARA/KNOWN_GAPS.md C39) settled that
 * after-hours work is time, not money, with rest-day premium explicitly not
 * paid in cash either.
 *
 * ../LINARA's Session E / E2 made this urgent: for a few hours the default was
 * derived from employment, so a live-out helper's entries were all tagged
 * `premium_pay` and the old filter would have shown her a flat zero here until
 * the real balance arrived. That derivation was then removed
 * (fix-resolution-default-to-rest.sql) -- but a manager can still set the
 * premium tag per helper or per entry, so counting both remains necessary, not
 * merely defensive.
 */
export function restOwedMinutes(entries: LedgerEntry[]): number {
  return entries.reduce((sum, entry) => sum + ledgerEntryMinutes(entry), 0);
}

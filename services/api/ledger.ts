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
 * Total minutes owed back as time-off-in-lieu (roadmap Story 11's Rest Owed
 * Counter / plan.md 3.2). Premium-pay entries are paid in cash instead
 * (architecture.md Section 5.2) and deliberately excluded here.
 */
export function restOwedMinutes(entries: LedgerEntry[]): number {
  return entries
    .filter((entry) => entry.resolutionType === "rest_owed")
    .reduce((sum, entry) => sum + ledgerEntryMinutes(entry), 0);
}

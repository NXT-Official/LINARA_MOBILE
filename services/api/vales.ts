import { supabase } from "@/services/supabase";

export interface ValeRequest {
  id: string;
  amount: number;
  reason: string;
  status: "pending" | "approved" | "declined";
  createdAt: string;
}

interface ValeRow {
  id: string;
  amount: number;
  reason: string;
  status: "pending" | "approved" | "declined";
  created_at: string;
}

/**
 * Lists the signed-in helper's own vale (cash advance) requests (roadmap
 * Story 11 step 2). `vales_isolation` RLS scopes this to the caller's own
 * household via a join through helper_profiles, same pattern as
 * getMyLedgerEntries.
 */
export async function getMyVales(helperId: string): Promise<ValeRequest[]> {
  const { data, error } = await supabase
    .from("vales")
    .select("id, amount, reason, status, created_at")
    .eq("helper_id", helperId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: ValeRow) => ({
    id: row.id,
    amount: Number(row.amount),
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
  }));
}

/**
 * Submits a cash-advance request. `vales_isolation`'s `FOR ALL USING` clause
 * doubles as the `WITH CHECK` here (Postgres default when only USING is
 * given), so this insert succeeds as long as `helperId` resolves to a
 * helper_profiles row in the caller's own household -- true here since the
 * caller is that helper, requesting for themself.
 */
export async function requestVale(helperId: string, amount: number, reason: string): Promise<void> {
  const { error } = await supabase
    .from("vales")
    .insert({ helper_id: helperId, amount, reason, status: "pending" });

  if (error) {
    throw new Error(error.message);
  }
}

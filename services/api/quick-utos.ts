import { supabase } from "@/services/supabase";

export interface QuickUtoItem {
  id: string;
  senderName: string;
  content: string;
  afterHours: boolean;
  emergency: boolean;
  waiting: boolean;
  createdAt: string;
  /** Which house sent it (LINARA add-shared-staff-and-places.sql); null before that. */
  householdId: string | null;
}

/**
 * Fetches the floating Quick Utos feed (roadmap Story 7, step 5 / plan.md
 * 3.2). Only `sent` pings are returned -- per Story 7's acceptance
 * criteria the banners "vanish when acknowledged," so once a helper taps
 * Got It/Done the row drops out of this feed entirely rather than sticking
 * around with a checkmark the way the web dashboard's history view does.
 */
export async function getPendingQuickUtos(helperId: string): Promise<QuickUtoItem[]> {
  const { data, error } = await supabase
    .from("quick_utos")
    // "*" so household_id is read once it exists, without failing before.
    .select("*")
    .eq("recipient_id", helperId)
    .eq("ack_state", "sent")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    senderName: row.sender_name,
    content: row.content,
    afterHours: row.after_hours,
    emergency: row.emergency,
    waiting: row.waiting,
    createdAt: row.created_at,
    householdId: (row as { household_id?: string | null }).household_id ?? null,
  }));
}

/** Acknowledges a ping with "Got It" (seen) or "Done", removing it from the feed. */
export async function acknowledgeQuickUto(id: string, ackState: "seen" | "done"): Promise<void> {
  const { error } = await supabase.from("quick_utos").update({ ack_state: ackState }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

import { SEEN_UTOS_KEPT_MS, type UtosAck } from "@/lib/utos";
import { supabase } from "@/services/supabase";

export interface QuickUtoItem {
  id: string;
  senderName: string;
  content: string;
  afterHours: boolean;
  emergency: boolean;
  waiting: boolean;
  createdAt: string;
  /** "sent": not answered yet. "seen": she tapped Sige and still owes Tapos na. */
  ackState: UtosAck;
  /** Which house sent it (LINARA add-shared-staff-and-places.sql); null before that. */
  householdId: string | null;
}

/**
 * The Quick Utos feed on Ngayon (roadmap Story 7, step 5 / plan.md 3.2):
 * unanswered pings, and ones she said Sige to but hasn't marked Tapos na, as
 * the walkthrough has it (QA F-LM-004). Sige used to drop the row, leaving no
 * way to say it was done. A Sige older than a day drops out, so the ones
 * answered before this change don't all come back.
 */
export async function getPendingQuickUtos(
  helperId: string,
  now: Date = new Date(),
): Promise<QuickUtoItem[]> {
  const seenSince = new Date(now.getTime() - SEEN_UTOS_KEPT_MS).toISOString();
  const { data, error } = await supabase
    .from("quick_utos")
    // "*" so household_id is read once it exists, without failing before.
    .select("*")
    .eq("recipient_id", helperId)
    .or(`ack_state.eq.sent,and(ack_state.eq.seen,created_at.gte."${seenSince}")`)
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
    ackState: row.ack_state === "seen" ? "seen" : "sent",
    householdId: (row as { household_id?: string | null }).household_id ?? null,
  }));
}

/** Sige (seen) keeps it on Ngayon until Tapos na (done) takes it off. */
export async function acknowledgeQuickUto(id: string, ackState: "seen" | "done"): Promise<void> {
  const { error } = await supabase.from("quick_utos").update({ ack_state: ackState }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

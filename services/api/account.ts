import { supabase } from "@/services/supabase";

/**
 * Her request to have her account deleted (../LINARA/supabase/
 * add-account-deletion.sql, KNOWN_GAPS.md O8). It's carried out by hand
 * within 30 days; until then she can withdraw it and everything works.
 */
export interface DeletionRequest {
  id: string;
  requestedAt: string;
}

/** Her pending request, or null. Also null before the migration is applied. */
export async function getMyDeletionRequest(): Promise<DeletionRequest | null> {
  const { data, error } = await supabase
    .from("account_deletion_requests")
    .select("id, requested_at")
    .eq("status", "pending")
    .maybeSingle();
  if (error) {
    if (/account_deletion_requests/.test(error.message)) return null;
    throw new Error(error.message);
  }
  return data ? { id: data.id as string, requestedAt: data.requested_at as string } : null;
}

export async function requestAccountDeletion(note?: string): Promise<void> {
  const { error } = await supabase.rpc("request_account_deletion", {
    p_note: note?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

export async function cancelAccountDeletion(): Promise<void> {
  const { error } = await supabase.rpc("cancel_account_deletion");
  if (error) throw new Error(error.message);
}

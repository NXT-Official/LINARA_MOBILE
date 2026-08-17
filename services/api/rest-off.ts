import { supabase } from "@/services/supabase";

/**
 * Rest-off requests -- the kasambahay's route to actually redeem accrued rest
 * owed. After-hours work is TIME, not money (decision 2026-08-16): live-in
 * kasambahay are not paid hourly overtime, so off-hours work is balanced by
 * time-off-in-lieu. You ask for a date and a range; a manager approves it on
 * the web dashboard; the approved minutes are debited from your balance.
 *
 * Writes go through the SECURITY DEFINER RPCs in
 * ../LINARA/supabase/add-rest-off-requests.sql, never straight at the table --
 * the balance check has to run server-side under a lock, or two approvals can
 * overdraw it.
 *
 * `.rpc()` resolves to `unknown` here (no generated Database type), so row
 * shapes are described locally -- same approach as services/api/handshake.ts.
 */
export type RestOffStatus = "pending" | "approved" | "declined" | "cancelled";

export interface RestOffRequest {
  id: string;
  restDate: string;
  startTime: string;
  endTime: string;
  minutes: number;
  note: string | null;
  status: RestOffStatus;
  declineReason: string | null;
}

interface RestOffRequestRow {
  id: string;
  rest_date: string;
  start_time: string;
  end_time: string;
  minutes: number;
  note: string | null;
  status: RestOffStatus;
  decline_reason: string | null;
}

export async function getMyRestOffRequests(helperId: string): Promise<RestOffRequest[]> {
  const { data, error } = await supabase
    .from("rest_off_requests")
    .select("id, rest_date, start_time, end_time, minutes, note, status, decline_reason")
    .eq("helper_id", helperId)
    .order("rest_date", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: RestOffRequestRow) => ({
    id: row.id,
    restDate: row.rest_date,
    startTime: row.start_time,
    endTime: row.end_time,
    minutes: row.minutes,
    note: row.note,
    status: row.status,
    declineReason: row.decline_reason,
  }));
}

/**
 * Redeemable balance in minutes. Read from the same Postgres function the
 * manager's dashboard and the approval guard use, so all three agree -- the
 * "surfaced to both sides as the same number" rule.
 */
export async function getRestOwedBalance(helperId: string): Promise<number> {
  const { data, error } = await supabase.rpc("rest_owed_balance_minutes", {
    p_helper_id: helperId,
  });

  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export async function requestRestOff(
  helperId: string,
  restDate: string,
  startTime: string,
  endTime: string,
  note?: string,
): Promise<{ requestId: string; minutes: number; balanceAfterIfApproved: number }> {
  const { data, error } = await supabase.rpc("request_rest_off", {
    p_helper_id: helperId,
    p_rest_date: restDate,
    p_start_time: startTime,
    p_end_time: endTime,
    p_note: note ?? null,
  });

  if (error) throw new Error(error.message);

  const row = (
    data as
      | {
          request_id: string;
          requested_minutes: number;
          balance_after_if_approved: number;
        }[]
      | null
  )?.[0];

  if (!row) throw new Error("Failed to submit the rest-off request");

  return {
    requestId: row.request_id,
    minutes: row.requested_minutes,
    balanceAfterIfApproved: row.balance_after_if_approved,
  };
}

/**
 * Withdraw a request the kasambahay made herself, while it is still PENDING.
 *
 * The `cancelled` status has existed in the table's CHECK constraint since it
 * was created and nothing ever set it (../LINARA/KNOWN_GAPS.md C39), so a
 * mistyped date could only be undone by asking a manager to DECLINE it -- which
 * records a refusal in the history where there was only a typo. Closed by
 * ../LINARA/supabase/add-rest-off-validation.sql.
 *
 * An APPROVED request cannot be cancelled here: the balance is already debited
 * and a day off may have been arranged around it, so unwinding it is a
 * conversation with the manager rather than a button. The RPC refuses, and the
 * button below is only rendered on pending rows.
 */
export async function cancelRestOffRequest(
  requestId: string,
): Promise<{ status: RestOffStatus; balanceMinutes: number }> {
  const { data, error } = await supabase.rpc("cancel_rest_off_request", {
    p_request_id: requestId,
  });

  if (error) throw new Error(error.message);

  const row = (
    data as { request_id: string; resulting_status: RestOffStatus; balance_after: number }[] | null
  )?.[0];

  if (!row) throw new Error("Failed to cancel the rest-off request");

  return { status: row.resulting_status, balanceMinutes: Number(row.balance_after ?? 0) };
}

import { supabase } from "@/services/supabase";

/**
 * Leave: whole days off (../LINARA/supabase/add-leave.sql,
 * ../LINARA/LEAVE_PLAN.md). Four kinds: service incentive leave (5 paid days a
 * service year after her first year, RA 10361), a day off in kind (paid out of
 * her rest owed), unpaid leave, and an extra paid day the household gives.
 *
 * Reads are plain selects under RLS. Every write is a SECURITY DEFINER
 * function that checks who's asking and applies the balances, overlaps and
 * dates itself; the table can't be written directly. Their error messages are
 * meant to be shown as they are.
 */
export type LeaveKind = "sil" | "in_kind" | "unpaid" | "extra_paid";
export type LeaveReason = "vacation" | "sick" | "family" | "other";
export type LeaveStatus = "pending" | "approved" | "declined" | "cancelled";

export interface Leave {
  id: string;
  kind: LeaveKind;
  reason: LeaveReason;
  /** YYYY-MM-DD, household dates, inclusive. */
  startDate: string;
  endDate: string;
  days: number;
  minutes: number;
  note: string | null;
  status: LeaveStatus;
  declineReason: string | null;
  /** Set when a manager recorded it for her: pending until she answers. */
  helperAck: "pending" | "confirmed" | "disputed" | null;
}

interface LeaveRow {
  id: string;
  kind: LeaveKind;
  reason: LeaveReason;
  start_date: string;
  end_date: string;
  days: number;
  minutes: number;
  note: string | null;
  status: LeaveStatus;
  decline_reason: string | null;
  helper_ack: Leave["helperAck"];
}

export async function getMyLeave(helperId: string): Promise<Leave[]> {
  const { data, error } = await supabase
    .from("leave_requests")
    .select(
      "id, kind, reason, start_date, end_date, days, minutes, note, status, decline_reason, helper_ack",
    )
    .eq("helper_id", helperId)
    .order("start_date", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as LeaveRow[]).map((row) => ({
    id: row.id,
    kind: row.kind,
    reason: row.reason,
    startDate: row.start_date,
    endDate: row.end_date,
    days: row.days,
    minutes: row.minutes,
    note: row.note,
    status: row.status,
    declineReason: row.decline_reason,
    helperAck: row.helper_ack,
  }));
}

export interface SilBalance {
  /** Days left in the current service year. */
  days: number;
  /** Her first anniversary, when SIL starts. */
  eligibleFrom: string | null;
  /** The last day of the current service year, once she's eligible. */
  yearEnd: string | null;
}

/** Her service incentive leave, from the same functions the approval checks use. */
export async function getSilBalance(helperId: string, householdToday: string): Promise<SilBalance> {
  const [days, year] = await Promise.all([
    supabase.rpc("sil_balance_days", { p_helper_id: helperId }),
    supabase.rpc("sil_service_year", { p_helper_id: helperId, p_on: householdToday }),
  ]);
  const error = days.error ?? year.error;
  if (error) throw new Error(error.message);

  const y = (
    year.data as { year_end: string; eligible: boolean; eligible_from: string }[] | null
  )?.[0];
  return {
    days: Number(days.data ?? 0),
    eligibleFrom: y?.eligible_from ?? null,
    yearEnd: y?.eligible ? y.year_end : null,
  };
}

export async function requestLeave(
  helperId: string,
  kind: LeaveKind,
  reason: LeaveReason,
  startDate: string,
  endDate: string,
  note?: string,
): Promise<{ requestId: string; days: number; minutes: number }> {
  const { data, error } = await supabase.rpc("request_leave", {
    p_helper_id: helperId,
    p_kind: kind,
    p_reason: reason,
    p_start: startDate,
    p_end: endDate,
    p_note: note ?? null,
  });

  if (error) throw new Error(error.message);

  const row = (
    data as { request_id: string; requested_days: number; requested_minutes: number }[] | null
  )?.[0];
  if (!row) throw new Error("Hindi naipadala ang request.");
  return { requestId: row.request_id, days: row.requested_days, minutes: row.requested_minutes };
}

/** A pending request, or approved leave that hasn't started yet. */
export async function cancelLeave(requestId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_leave_request", { p_request_id: requestId });
  if (error) throw new Error(error.message);
}

/** Her answer to leave a manager recorded for her. A dispute flags it; it doesn't undo it. */
export async function ackLeave(
  requestId: string,
  ack: "confirmed" | "disputed",
  note?: string,
): Promise<void> {
  const { error } = await supabase.rpc("ack_leave", {
    p_request_id: requestId,
    p_ack: ack,
    p_note: note ?? null,
  });
  if (error) throw new Error(error.message);
}

export interface UnpaidLeaveDue {
  days: number;
  deduction: number;
}

/**
 * What the payslip for the cutoff ending `cutoffEnd` will take for her unpaid
 * leave: the same function the payout uses, so her estimate matches it.
 * Before ../LINARA/supabase/add-unpaid-leave-pay.sql is applied there is no
 * such function and nothing is taken.
 */
export async function getUnpaidLeaveDue(
  helperId: string,
  cutoffEnd: string,
): Promise<UnpaidLeaveDue> {
  const { data, error } = await supabase.rpc("unpaid_leave_due", {
    p_helper_id: helperId,
    p_cutoff_end: cutoffEnd,
  });
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") return { days: 0, deduction: 0 };
    throw new Error(error.message);
  }
  const row = (data as { leave_days: number; deduction: number }[] | null)?.[0];
  return { days: Number(row?.leave_days ?? 0), deduction: Number(row?.deduction ?? 0) };
}

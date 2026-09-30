import { supabase } from "@/services/supabase";

/** How Linara itself pays out (Xendit). */
export type PayoutChannelCode = "PH_GCASH" | "PH_PAYMAYA";
/** How a household paid outside Linara, recorded afterwards (add-pay-periods.sql). */
export type OffAppMethod = "CASH" | "BANK_TRANSFER" | "OTHER";
export type PaymentMethod = PayoutChannelCode | OffAppMethod;
// 'needs_review' mirrors ../LINARA/src/features/pay/pay.types.ts -- an
// ambiguous payout the manager must reconcile against Xendit on the web Money
// tab. Read-only here (this app never initiates a payout), but the digital
// payslip must render the status without crashing, so it's part of the union.
export type PayoutStatus = "pending_send" | "processing" | "succeeded" | "failed" | "needs_review";
/** Her answer to a payment recorded outside Linara; null for a Xendit payout. */
export type HelperAck = "pending" | "confirmed" | "disputed";

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  PH_GCASH: "GCash",
  PH_PAYMAYA: "Maya",
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  OTHER: "Iba pa",
};

export interface Payslip {
  id: string;
  helperId: string;
  cutoffStart: string;
  cutoffEnd: string;
  basePay: number;
  statutoryEmployeeShare: number;
  valeDeductions: number;
  netPay: number;
  /** A regular cutoff, or 13th-month pay. */
  kind: "regular" | "thirteenth_month";
  /** "xendit", or "manual" for a payment made outside Linara. */
  payoutProvider: string;
  payoutChannelCode: PaymentMethod;
  payoutStatus: PayoutStatus;
  failureReason: string | null;
  requestedAt: string;
  confirmedAt: string | null;
  /** The day it was handed over, for a payment made outside Linara. */
  paidOn: string | null;
  manualNote: string | null;
  helperAck: HelperAck | null;
  helperAckNote: string | null;
}

interface PayslipRow {
  id: string;
  helper_id: string;
  cutoff_start: string;
  cutoff_end: string;
  base_pay: number;
  statutory_employee_share: number;
  vale_deductions: number;
  net_pay: number;
  kind?: "regular" | "thirteenth_month";
  payout_provider?: string;
  payout_channel_code: PaymentMethod;
  payout_status: PayoutStatus;
  failure_reason: string | null;
  requested_at: string;
  confirmed_at: string | null;
  paid_on?: string | null;
  manual_note?: string | null;
  helper_ack?: HelperAck | null;
  helper_ack_note?: string | null;
}

const toPayslip = (row: PayslipRow): Payslip => ({
  id: row.id,
  helperId: row.helper_id,
  cutoffStart: row.cutoff_start,
  cutoffEnd: row.cutoff_end,
  basePay: Number(row.base_pay),
  statutoryEmployeeShare: Number(row.statutory_employee_share),
  valeDeductions: Number(row.vale_deductions),
  netPay: Number(row.net_pay),
  kind: row.kind ?? "regular",
  payoutProvider: row.payout_provider ?? "xendit",
  payoutChannelCode: row.payout_channel_code,
  payoutStatus: row.payout_status,
  failureReason: row.failure_reason,
  requestedAt: row.requested_at,
  confirmedAt: row.confirmed_at,
  paidOn: row.paid_on ?? null,
  manualNote: row.manual_note ?? null,
  helperAck: row.helper_ack ?? null,
  helperAckNote: row.helper_ack_note ?? null,
});

/**
 * Lists the signed-in helper's own payout history for one employment
 * (roadmap Story 11's digital payslip, backed for real as of KNOWN_GAPS.md
 * gap #9's close -- see ../LINARA/supabase/add-payslips-table.sql).
 * `payslips_isolation` scopes this to her current household, and
 * `payslips_own_read` (add-employment-end.sql) to households she has left.
 * `select("*")` so the columns add-pay-periods.sql adds are read when present
 * without breaking before it is applied. Read-only: payslips are written by
 * the manager's web app (a Xendit payout, or a payment recorded as made
 * outside Linara); her one write is her answer to the latter
 * (acknowledgePayment).
 */
export async function getMyPayslips(helperId: string): Promise<Payslip[]> {
  const { data, error } = await supabase
    .from("payslips")
    .select("*")
    .eq("helper_id", helperId)
    .order("requested_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PayslipRow[]).map(toPayslip);
}

/**
 * Payments her employers recorded as made outside Linara that she hasn't
 * answered yet, in any household she has worked for. The policies above
 * already limit the read to her own payslips.
 */
export async function getPaymentsAwaitingMe(): Promise<Payslip[]> {
  const { data, error } = await supabase
    .from("payslips")
    .select("*")
    .eq("payout_provider", "manual")
    .eq("helper_ack", "pending")
    .order("requested_at", { ascending: false });

  if (error) {
    // Before add-pay-periods.sql the columns don't exist, so nothing awaits her.
    if (/column .* does not exist/i.test(error.message)) return [];
    throw new Error(error.message);
  }
  return ((data ?? []) as PayslipRow[]).map(toPayslip);
}

/** Her answer: she received it, or she didn't (with what she'd like them to know). */
export async function acknowledgePayment(
  payslipId: string,
  received: boolean,
  note?: string,
): Promise<void> {
  const { error } = await supabase.rpc("acknowledge_offapp_payslip", {
    p_payslip_id: payslipId,
    p_received: received,
    p_note: note?.trim() || null,
  });
  if (error) {
    throw new Error(error.message);
  }
}

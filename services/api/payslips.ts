import { supabase } from "@/services/supabase";

export type PayoutChannelCode = "PH_GCASH" | "PH_PAYMAYA";
export type PayoutStatus = "pending_send" | "processing" | "succeeded" | "failed";

export interface Payslip {
  id: string;
  cutoffStart: string;
  cutoffEnd: string;
  basePay: number;
  statutoryEmployeeShare: number;
  valeDeductions: number;
  netPay: number;
  payoutChannelCode: PayoutChannelCode;
  payoutStatus: PayoutStatus;
  failureReason: string | null;
  requestedAt: string;
  confirmedAt: string | null;
}

interface PayslipRow {
  id: string;
  cutoff_start: string;
  cutoff_end: string;
  base_pay: number;
  statutory_employee_share: number;
  vale_deductions: number;
  net_pay: number;
  payout_channel_code: PayoutChannelCode;
  payout_status: PayoutStatus;
  failure_reason: string | null;
  requested_at: string;
  confirmed_at: string | null;
}

/**
 * Lists the signed-in helper's own payout history (roadmap Story 11's
 * digital payslip, backed for real as of KNOWN_GAPS.md gap #9's close --
 * see ../LINARA/supabase/add-payslips-table.sql). `payslips_isolation` RLS
 * scopes this to the caller's own household via a join through
 * helper_profiles, same pattern as getMyLedgerEntries/getMyVales. Read-only
 * by design: a payslip row is only ever created by the `initiate_payslip`
 * RPC (manager-gated, called from the web dashboard's "Pay Now") or updated
 * by the xendit-payout-webhook Edge Function -- this app has no manager-auth
 * session to initiate a payout with, so it never writes here.
 */
export async function getMyPayslips(helperId: string): Promise<Payslip[]> {
  const { data, error } = await supabase
    .from("payslips")
    .select(
      "id, cutoff_start, cutoff_end, base_pay, statutory_employee_share, vale_deductions, net_pay, payout_channel_code, payout_status, failure_reason, requested_at, confirmed_at",
    )
    .eq("helper_id", helperId)
    .order("requested_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: PayslipRow) => ({
    id: row.id,
    cutoffStart: row.cutoff_start,
    cutoffEnd: row.cutoff_end,
    basePay: Number(row.base_pay),
    statutoryEmployeeShare: Number(row.statutory_employee_share),
    valeDeductions: Number(row.vale_deductions),
    netPay: Number(row.net_pay),
    payoutChannelCode: row.payout_channel_code,
    payoutStatus: row.payout_status,
    failureReason: row.failure_reason,
    requestedAt: row.requested_at,
    confirmedAt: row.confirmed_at,
  }));
}

import { supabase } from "@/services/supabase";

/**
 * One cutoff of one employment, from ../LINARA/supabase/add-pay-periods.sql's
 * helper_pay_periods -- the same list the manager's Money page reads, so she
 * sees the same answer to "was I paid for this?".
 */
export interface PayPeriod {
  fullStart: string;
  fullEnd: string;
  /** The days she worked in it: a first period starts on her first day, a
   * final one stops on her last. */
  workedStart: string;
  workedEnd: string;
  isCurrent: boolean;
  isFinal: boolean;
  /** The payment that settled it, of either kind; null while unpaid. */
  payslipId: string | null;
}

export async function getMyPayPeriods(helperId: string): Promise<PayPeriod[]> {
  const { data, error } = await supabase.rpc("helper_pay_periods", { p_helper_id: helperId });
  if (error) {
    // Before add-pay-periods.sql there are no periods to show.
    if (/could not find the function|does not exist/i.test(error.message)) return [];
    throw new Error(error.message);
  }
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    fullStart: r.full_start as string,
    fullEnd: r.full_end as string,
    workedStart: r.worked_start as string,
    workedEnd: r.worked_end as string,
    isCurrent: Boolean(r.is_current),
    isFinal: Boolean(r.is_final),
    payslipId: (r.payslip_id as string | null) ?? null,
  }));
}

/**
 * Tells the household she's leaving, and on which day. Only the manager ends
 * the employment (her final pay and tasks are settled then); this puts it in
 * front of them.
 */
export async function giveNotice(helperId: string, lastDay: string, note?: string) {
  const { error } = await supabase.rpc("give_notice", {
    p_helper_id: helperId,
    p_last_day: lastDay,
    p_note: note?.trim() || null,
  });
  if (error) {
    throw new Error(
      /today or later/i.test(error.message)
        ? "Ngayon o sa susunod na araw dapat ang huling araw mo."
        : error.message,
    );
  }
}

export async function withdrawNotice(helperId: string) {
  const { error } = await supabase.rpc("withdraw_notice", { p_helper_id: helperId });
  if (error) {
    throw new Error(error.message);
  }
}

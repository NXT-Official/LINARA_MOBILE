import { supabase } from "@/services/supabase";

export interface TermsOnFile {
  station: string;
  employment: "live-in" | "live-out" | null;
  shiftStart: string;
  shiftEnd: string;
  breakStart: string | null;
  breakEnd: string | null;
  weeklyRestDay: number;
  monthlyRate: number;
  paydayInterval: "semi_monthly" | "monthly";
  /** When the household's record of her arrangement was created. */
  recordSince: string;
  /** Her last working day, once that household ended her employment. */
  endedOn: string | null;
}

/**
 * The terms the household has on file for her, read-only. The concept doc's
 * "standing transparency view": the same record she reviewed when claiming,
 * visible any time, not only once. helper_profiles_isolation scopes it to her
 * household, and helper_profiles_own_read lets her read the rows of
 * households she has left; the id filter keeps it to one employment.
 */
export async function getMyTermsOnFile(helperId: string): Promise<TermsOnFile> {
  const { data, error } = await supabase
    .from("helper_profiles")
    .select(
      "station, employment, shift_start, shift_end, break_start, break_end, weekly_rest_day, monthly_rate, payday_interval, created_at, ended_on",
    )
    .eq("id", helperId)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Terms not found");
  }

  return {
    station: data.station,
    employment: data.employment,
    shiftStart: data.shift_start,
    shiftEnd: data.shift_end,
    breakStart: data.break_start,
    breakEnd: data.break_end,
    weeklyRestDay: data.weekly_rest_day,
    monthlyRate: Number(data.monthly_rate),
    paydayInterval: data.payday_interval,
    recordSince: data.created_at,
    endedOn: data.ended_on ?? null,
  };
}

export type TermsFlagField = "wage" | "shift" | "restDay" | "station" | "employment" | "other";

/**
 * "May mali?": tells the manager a term on file looks wrong. The same
 * invite_flags row the claim-time flag writes (flag_invite only accepts an
 * unclaimed invite, so a claimed helper writes the row directly; the
 * household-scoped invite_flags_isolation policy admits her). It shows in the
 * manager's Needs You until they mark it resolved.
 */
export async function flagMyTerms(
  helperId: string,
  field: TermsFlagField,
  note: string,
): Promise<void> {
  const { error } = await supabase
    .from("invite_flags")
    .insert({ invite_id: helperId, field, note: note || null });

  if (error) {
    throw new Error(error.message);
  }
}

/** How many tasks she has finished in this household, counted on the server. */
export async function getMyTasksDone(helperId: string): Promise<number> {
  const { count, error } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("helper_id", helperId)
    .eq("status", "done");

  if (error) {
    throw new Error(error.message);
  }
  return count ?? 0;
}

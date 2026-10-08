import { supabase } from "@/services/supabase";

export interface HelperProfileSummary {
  id: string;
  userId: string;
  householdId: string;
  name: string;
  /** One of the household's own stations (../LINARA/supabase/add-household-stations.sql). */
  station: string;
  shiftStart: string;
  shiftEnd: string;
  /** Protected mid-shift break; both null when the household hasn't set one.
   * Needed so this app's on-shift check matches the manager dashboard's --
   * see lib/availability.ts's ShiftWindow. */
  breakStart: string | null;
  breakEnd: string | null;
  weeklyRestDay: number;
  monthlyRate: number;
  paydayInterval: "semi_monthly" | "monthly";
  /** Real, synced "Available for N hours" opt-in -- see ../../LINARA/MULTI_HELPER_HANDLING.md.
   * `manualAvailableUntil` is an epoch ms timestamp, or null if there's no active override. */
  manualStatus: "available" | "off" | null;
  manualAvailableUntil: number | null;
}

/**
 * Fetches the authenticated helper's own profile summary for the Dignity
 * Header. Unlike the handshake flow (services/api/handshake.ts), this runs
 * post-claim: the caller has a `user_profiles` row and satisfies
 * `helper_profiles_isolation`'s household_id check directly, so no RPC is
 * needed here.
 *
 * Her CURRENT employment only. She can also read the rows of households she
 * has left (helper_profiles_own_read), so without the status filter a second
 * employment would make `.single()` fail. Throws when she has none; the tab
 * layout keeps her on My Record in that case (services/api/employment.ts).
 */
export async function getMyHelperProfile(): Promise<HelperProfileSummary> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("helper_profiles")
    .select(
      "id, household_id, name, station, shift_start, shift_end, break_start, break_end, weekly_rest_day, monthly_rate, payday_interval, manual_status, manual_available_until",
    )
    .eq("user_id", user.id)
    .eq("status", "ACTIVE")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Helper profile not found");
  }

  return {
    id: data.id,
    userId: user.id,
    householdId: data.household_id,
    name: data.name,
    station: data.station,
    shiftStart: data.shift_start,
    shiftEnd: data.shift_end,
    breakStart: data.break_start,
    breakEnd: data.break_end,
    weeklyRestDay: data.weekly_rest_day,
    monthlyRate: Number(data.monthly_rate),
    paydayInterval: data.payday_interval,
    manualStatus: data.manual_status,
    manualAvailableUntil: data.manual_available_until
      ? new Date(data.manual_available_until).getTime()
      : null,
  };
}

/** Who keeps the pantry (../LINARA/supabase/add-pantry-roles.sql). */
export type PantryRole = "lead" | "runner";

/**
 * Her pantry role: "lead" keeps the stock and the palengke list, "runner"
 * buys from it. Every helper can say something ran out.
 *
 * Its own read, not part of getMyHelperProfile, so this build still works
 * before add-pantry-roles.sql is applied: asking for a column the database
 * doesn't have yet fails the whole select, which would lock her out of every
 * tab. Until then she keeps the full pantry she had ("lead").
 */
export async function getMyPantryRole(): Promise<PantryRole> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("helper_profiles")
    .select("pantry_role")
    .eq("user_id", user.id)
    .eq("status", "ACTIVE")
    .single();

  // 42703: undefined column, i.e. the migration isn't applied yet.
  if (error?.code === "42703") return "lead";
  if (error || !data) {
    throw new Error(error?.message || "Helper profile not found");
  }
  return data.pantry_role === "lead" ? "lead" : "runner";
}

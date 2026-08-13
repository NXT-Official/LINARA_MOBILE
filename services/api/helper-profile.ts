import { supabase } from "@/services/supabase";

export interface HelperProfileSummary {
  id: string;
  userId: string;
  householdId: string;
  name: string;
  station: "Yaya" | "Cook" | "Laundry" | "Driver" | "House";
  shiftStart: string;
  shiftEnd: string;
  weeklyRestDay: number;
  monthlyRate: number;
  paydayInterval: "semi_monthly" | "monthly";
}

/**
 * Fetches the authenticated helper's own profile summary for the Dignity
 * Header. Unlike the handshake flow (services/api/handshake.ts), this runs
 * post-claim: the caller has a `user_profiles` row and satisfies
 * `helper_profiles_isolation`'s household_id check directly, so no RPC is
 * needed here.
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
      "id, household_id, name, station, shift_start, shift_end, weekly_rest_day, monthly_rate, payday_interval",
    )
    .eq("user_id", user.id)
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
    weeklyRestDay: data.weekly_rest_day,
    monthlyRate: Number(data.monthly_rate),
    paydayInterval: data.payday_interval,
  };
}

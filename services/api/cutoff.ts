import { supabase } from "@/services/supabase";

/**
 * The current cutoff, derived server-side. Mirrors
 * ../LINARA/src/features/pay/pay.actions.ts's `getHouseholdCutoffFn` and reads
 * the same `public.household_cutoff()` RPC
 * (../LINARA/supabase/add-household-timezone-and-cutoffs.sql).
 *
 * Deliberately an RPC call rather than a local calculation. The web app used
 * to derive cutoff boundaries in JS and got them wrong in Asia/Manila -- a
 * Date built from local components then formatted with toISOString() shifts
 * back a day at positive UTC offsets, and truncates month-end so a 31-day
 * month's last day belonged to no cutoff. This app never had that bug (it
 * showed no dates at all, only "This cutoff (half-month)"), and adding a local
 * copy now would be the third independent implementation of the same rule.
 * There is exactly one, and it lives in Postgres.
 *
 * `.rpc()` resolves to `unknown` here (the client isn't generated against a
 * Database type), so the row shape is described locally -- same approach as
 * services/api/handshake.ts.
 */
export interface HouseholdCutoff {
  today: string;
  cutoffStart: string;
  cutoffEnd: string;
  timezone: string;
}

interface HouseholdCutoffRow {
  today: string;
  cutoff_start: string;
  cutoff_end: string;
  timezone: string;
}

export async function getHouseholdCutoff(
  paydayInterval: "semi_monthly" | "monthly",
): Promise<HouseholdCutoff> {
  const { data, error } = await supabase.rpc("household_cutoff", {
    p_payday_interval: paydayInterval,
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = (data as HouseholdCutoffRow[] | null)?.[0];
  if (!row) {
    throw new Error("Failed to read the current cutoff");
  }

  return {
    today: row.today,
    cutoffStart: row.cutoff_start,
    cutoffEnd: row.cutoff_end,
    timezone: row.timezone,
  };
}

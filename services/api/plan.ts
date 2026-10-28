import type { PlanLookup } from "@/lib/plan";
import { supabase } from "@/services/supabase";

/**
 * Her household's plan, from the primary manager's subscription
 * (../LINARA/supabase/add-billing.sql, my_household_plan). Only what's on
 * and off: no prices, no payments. "missing" until that SQL is applied to
 * the project, so the app keeps working as before.
 */
export async function getHouseholdPlan(): Promise<PlanLookup> {
  const { data, error } = await supabase.rpc("my_household_plan");
  if (error) {
    if (error.code === "PGRST202" || /could not find the function/i.test(error.message)) {
      return { kind: "missing" };
    }
    throw error;
  }
  return { kind: "loaded", plan: data };
}

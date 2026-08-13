import { supabase } from "@/services/supabase";

/**
 * Reads the household's petty-cash allocation. `households_isolation` RLS
 * (../LINARA/architecture.md Section 8) allows SELECT to any authenticated
 * caller in the household -- helper or manager -- but there is deliberately
 * no client-side write here: `households_update_budget`'s UPDATE policy is
 * household-scoped only, with the manager-only restriction enforced in
 * application code (`updateHouseholdBudgetFn`,
 * ../LINARA/src/features/groceries/grocery.actions.ts), and this app has no
 * manager-auth session to enforce that with. The migration that added this
 * column (../LINARA/supabase/add-household-petty-cash-budget.sql) already
 * documents the split: "LINARA (manager-writable) and LINARA_MOBILE
 * (read-only)."
 */
export async function getHouseholdPettyCashBudget(householdId: string): Promise<number> {
  const { data, error } = await supabase
    .from("households")
    .select("petty_cash_budget")
    .eq("id", householdId)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Household not found");
  }

  return Number(data.petty_cash_budget);
}

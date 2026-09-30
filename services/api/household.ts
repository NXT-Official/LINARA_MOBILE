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

/**
 * Whether the manager has closed the board for the night
 * (`households.board_closed`, set from the web Pass). Read-only here for the
 * same reason as the budget above. While closed, new tasks are queued for
 * tomorrow and the Station shows the close instead of a task.
 */
export async function getBoardClosed(householdId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("households")
    .select("board_closed")
    .eq("id", householdId)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Household not found");
  }

  return Boolean(data.board_closed);
}

/**
 * The household's name, for the header of her downloadable work record.
 * Null when it can't be read; the record then says "her employer's household".
 */
export async function getHouseholdName(householdId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("households")
    .select("name")
    .eq("id", householdId)
    .single();

  if (error || !data) return null;
  return data.name as string;
}

import { useQuery } from "@tanstack/react-query";

import { getHouseholdPettyCashBudget } from "@/services/api/household";

/**
 * The allocated petty-cash budget for the active Palengke run (plan.md
 * 3.2), read from the real, shared `households.petty_cash_budget` column
 * (../LINARA/supabase/add-household-petty-cash-budget.sql) -- manager-set
 * from the web dashboard, read-only here (see services/api/household.ts).
 * Previously this lived in this device's own AsyncStorage, so a helper's
 * figure could silently disagree with the manager's; that's what this
 * rewire closes. Null until it's read: a made-up figure offline looked like
 * the household's own (QA F-LM-002).
 */
export function usePalengkeBudget(householdId: string | null): { budget: number | null } {
  const query = useQuery({
    queryKey: ["household-petty-cash-budget", householdId],
    queryFn: () => getHouseholdPettyCashBudget(householdId as string),
    enabled: Boolean(householdId),
  });

  return { budget: query.data ?? null };
}

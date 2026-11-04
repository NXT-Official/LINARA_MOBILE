import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/lib/session-context";
import { getHouseholdPlan } from "@/services/api/plan";

export const householdPlanKey = (userId: string | undefined) => ["household-plan", userId] as const;

/** Her household's plan; refreshed every few minutes, so a change reaches her without a release. */
export function useHouseholdPlan() {
  const { session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: householdPlanKey(userId),
    queryFn: getHouseholdPlan,
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });
}

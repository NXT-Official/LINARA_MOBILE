import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/lib/session-context";
import { getAccountKind } from "@/services/api/auth";

export const accountKindKey = (userId: string | undefined) => ["account-kind", userId] as const;

/**
 * Whether the signed-in account is a helper or a manager, for routing between
 * the helper tabs and the manager dashboard. An account's kind doesn't change,
 * so it's fetched once per sign-in; sign-in.tsx seeds it to skip even that.
 */
export function useAccountKind() {
  const { session } = useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: accountKindKey(userId),
    queryFn: getAccountKind,
    enabled: Boolean(userId),
    staleTime: Infinity,
  });
}

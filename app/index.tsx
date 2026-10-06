import { Redirect } from "expo-router";

import { useSession } from "@/lib/session-context";
import { useAccountKind } from "@/hooks/use-account-kind";
import { StartupWait } from "@/components/ui/startup-wait";

/**
 * Entry redirect: bounces to the authenticated tab shell or the onboarding
 * stack depending on the persisted session, satisfying Story 5's acceptance
 * criterion that a signed-in launch lands directly on Today. A manager lands
 * on the dashboard instead; if their kind can't be checked (offline, say),
 * the helper tabs are the default, as before managers could sign in here.
 */
export default function Index() {
  const { session, isLoading } = useSession();
  const kindQuery = useAccountKind();

  if (isLoading || (session && kindQuery.isLoading)) {
    return <StartupWait />;
  }

  if (!session) {
    // One sign-in for everyone; a new person picks a kind from there.
    return <Redirect href="/(auth)/sign-in" />;
  }
  return <Redirect href={kindQuery.data === "manager" ? "/manager" : "/(app)/today"} />;
}

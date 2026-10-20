import NetInfo from "@react-native-community/netinfo";
import { onlineManager, QueryClient } from "@tanstack/react-query";

import { isReachable } from "./connection";

/**
 * Single shared TanStack Query client for the native runtime. Remote tables
 * (helper_profiles, tickets, pantry_items, vales, ...) are the single source
 * of truth per architecture.md Section 3.2; screens read them through this
 * cache instead of ad hoc component-local fetches.
 *
 * Network mode "always" keeps what the app did before: reads fail offline
 * (screens say "Walang internet"), and writes reach their own offline checks
 * and the SQLite queue instead of waiting silently.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      networkMode: "always",
    },
    mutations: {
      networkMode: "always",
    },
  },
});

// React Native has no browser online event, so TanStack never knew the signal
// came back. Told here, every screen reloads what failed on reconnect instead
// of waiting for a pull-down (QA F-LM-008), once the internet is confirmed.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(isReachable(state));
  }),
);

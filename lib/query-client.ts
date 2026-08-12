import { QueryClient } from "@tanstack/react-query";

/**
 * Single shared TanStack Query client for the native runtime. Remote tables
 * (helper_profiles, tickets, pantry_items, vales, ...) are the single source
 * of truth per architecture.md Section 3.2; screens read them through this
 * cache instead of ad hoc component-local fetches.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

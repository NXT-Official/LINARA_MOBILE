import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { queryClient } from "@/lib/query-client";
import { SessionProvider } from "@/lib/session-context";
import { useOfflineSync } from "@/hooks/use-offline-sync";

/** Needs a QueryClientProvider ancestor for useOfflineSync's cache invalidation, so it can't live in RootLayout itself. */
function AppShell() {
  useOfflineSync();

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="dark" />
    </>
  );
}

/**
 * Root provider shell (roadmap Story 5, step 1). Mounts the persisted
 * Supabase session and the shared TanStack Query cache above every route,
 * then defers to file-based routing for the (auth)/(app) split.
 */
export default function RootLayout() {
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <AppShell />
      </QueryClientProvider>
    </SessionProvider>
  );
}

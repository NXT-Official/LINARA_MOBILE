import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { queryClient } from "@/lib/query-client";
import { SessionProvider } from "@/lib/session-context";

/**
 * Root provider shell (roadmap Story 5, step 1). Mounts the persisted
 * Supabase session and the shared TanStack Query cache above every route,
 * then defers to file-based routing for the (auth)/(app) split.
 */
export default function RootLayout() {
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="dark" />
      </QueryClientProvider>
    </SessionProvider>
  );
}

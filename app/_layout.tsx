import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { Fraunces_600SemiBold, Fraunces_700Bold } from "@expo-google-fonts/fraunces";
import { NunitoSans_400Regular, NunitoSans_700Bold } from "@expo-google-fonts/nunito-sans";

import { queryClient } from "@/lib/query-client";
import { SessionProvider } from "@/lib/session-context";
import { useOfflineSync } from "@/hooks/use-offline-sync";

SplashScreen.preventAutoHideAsync();

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
 *
 * Also loads the brand's custom typography (roadmap Story 11 step 4;
 * family names here must match lib/theme.ts's `fonts` tokens) before
 * revealing the app, so no screen ever flashes the system font first.
 */
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    NunitoSans_400Regular,
    NunitoSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <AppShell />
      </QueryClientProvider>
    </SessionProvider>
  );
}

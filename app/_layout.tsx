// First, so Sentry starts before the rest of the root layout's imports run.
import { wrapRootLayout } from "@/lib/observability/sentry";

import { useEffect } from "react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { Fraunces_600SemiBold, Fraunces_700Bold } from "@expo-google-fonts/fraunces";
import { NunitoSans_400Regular, NunitoSans_700Bold } from "@expo-google-fonts/nunito-sans";

import { queryClient } from "@/lib/query-client";
import { recordPersister, SAVED_RECORD_MAX_AGE, shouldSaveQuery } from "@/lib/query-persist";
import { SessionProvider } from "@/lib/session-context";
import { useScreenOpenedLog } from "@/lib/observability/use-screen-opened-log";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { usePushNotifications } from "@/hooks/use-push-notifications";

SplashScreen.preventAutoHideAsync();

/** Needs a QueryClientProvider ancestor for useOfflineSync's cache invalidation, so it can't live in RootLayout itself. */
function AppShell() {
  useOfflineSync();
  usePushNotifications();
  useScreenOpenedLog();

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
function RootLayout() {
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
      {/* Record ko is kept on the phone for when there's no internet (lib/query-persist.ts). */}
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: recordPersister,
          maxAge: SAVED_RECORD_MAX_AGE,
          dehydrateOptions: { shouldDehydrateQuery: shouldSaveQuery },
        }}
      >
        <AppShell />
      </PersistQueryClientProvider>
    </SessionProvider>
  );
}

// src: https://docs.sentry.io/platforms/react-native/manual-setup/expo/ · 8.30.0 · 2026-10-12
export default wrapRootLayout(RootLayout);

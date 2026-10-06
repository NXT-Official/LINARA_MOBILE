import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "@/lib/theme";
import { queryClient } from "@/lib/query-client";
import { useSession } from "@/lib/session-context";
import { TIMED_OUT, withinTime } from "@/lib/time-limit";
import { supabase } from "@/services/supabase";
import { signOutHelper } from "@/services/api/auth";
import { PrimaryButton } from "@/components/ui/primary-button";

// How long the spinner shows before she's offered a way out.
const STALL_MS = 12_000;
// How long signing out properly gets before this phone just forgets the session.
const SIGN_OUT_MS = 8_000;

/**
 * The spinner shown while the app works out where to open: the saved session,
 * whether the account is a helper or a manager, her household. None of those
 * has a time limit of its own, and on an older phone a stalled storage read
 * or token refresh never fails, so after a while this offers Try again and a
 * way back to sign-in instead of spinning forever.
 *
 * Signing out still refuses while she has actions waiting to sync
 * (signOutHelper), so this never drops her work. Only a sign-out that itself
 * stalls falls back to forgetting the session on this phone.
 */
export function StartupWait() {
  const { session, reload, dropSession } = useSession();
  const [stalled, setStalled] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Counts again from zero each time she taps Try again.
  useEffect(() => {
    if (stalled) return;
    const timer = setTimeout(() => setStalled(true), STALL_MS);
    return () => clearTimeout(timer);
  }, [stalled]);

  const tryAgain = () => {
    setError(null);
    reload();
    // Starts over any request still hanging, not just the failed ones.
    void queryClient.refetchQueries({ type: "active" });
    setStalled(false);
  };

  const leave = async () => {
    setError(null);
    if (!session) {
      dropSession();
      return;
    }
    setSigningOut(true);
    try {
      const result = await withinTime(signOutHelper(), SIGN_OUT_MS);
      if (result === TIMED_OUT) {
        void supabase.auth.signOut({ scope: "local" }).catch(() => {});
        queryClient.clear();
      }
      dropSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hindi nakapag-sign out.");
    } finally {
      setSigningOut(false);
    }
  };

  if (!stalled) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.pineTeal} />
      </View>
    );
  }

  return (
    <View style={[styles.center, styles.stalled]}>
      <Text style={styles.title}>Medyo natatagalan</Text>
      <Text style={styles.body}>
        Baka mahina ang internet. Subukan ulit, o mag-sign out at mag-sign in muli.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton label="Subukan ulit" onPress={tryAgain} disabled={signingOut} />
      <PrimaryButton
        label={session ? "Sign out" : "Go to sign in"}
        variant="secondary"
        onPress={() => void leave()}
        loading={signingOut}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sand,
  },
  stalled: {
    alignItems: "stretch",
    padding: 24,
    gap: 16,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.pineTeal,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.terracottaInk,
  },
});

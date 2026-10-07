import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { colors } from "@/lib/theme";
import { signOutHelper } from "@/services/api/auth";
import { PrimaryButton } from "@/components/ui/primary-button";

/**
 * Two-tap sign-out. The first tap only asks, so a stray touch at the bottom
 * of My Pay can't log her out; signOutHelper refuses while offline actions
 * are still queued and the reason is shown inline.
 */
export function SignOutButton() {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await signOutHelper();
      router.replace("/(auth)/sign-in");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hindi nakapag-sign out.");
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      {confirming ? (
        <>
          <Text style={styles.prompt}>
            Sigurado ka? Kailangan mo ang email at password mo para makabalik.
          </Text>
          <View style={styles.row}>
            <PrimaryButton
              label="Huwag na"
              variant="secondary"
              style={styles.half}
              onPress={() => setConfirming(false)}
            />
            <PrimaryButton
              label="Mag-sign out"
              style={styles.half}
              loading={loading}
              onPress={signOut}
            />
          </View>
        </>
      ) : (
        <PrimaryButton
          label="Mag-sign out"
          variant="secondary"
          onPress={() => setConfirming(true)}
        />
      )}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    gap: 10,
  },
  prompt: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  half: {
    flex: 1,
  },
  errorText: {
    fontSize: 13,
    color: colors.terracottaGold,
  },
});

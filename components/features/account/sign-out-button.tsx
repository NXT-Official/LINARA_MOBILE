import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";

import { useT } from "@/lib/i18n/locale-context";
import { colors } from "@/lib/theme";
import { signOutHelper } from "@/services/api/auth";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Text } from "@/components/ui/text";

/**
 * Two-tap sign-out. The first tap only asks, so a stray touch at the bottom
 * of My Pay can't log her out; signOutHelper refuses while offline actions
 * are still queued and the reason is shown inline. The question opens at the
 * bottom of the screen, so `onConfirmShown` lets the screen scroll its
 * buttons into view (QA LM-18).
 */
export function SignOutButton({ onConfirmShown }: { onConfirmShown?: () => void } = {}) {
  const [confirming, setConfirming] = useState(false);
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await signOutHelper();
      router.replace("/(auth)/sign-in");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("signOut.failed"));
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      {confirming ? (
        <>
          <Text style={styles.prompt}>{t("signOut.confirm")}</Text>
          <View style={styles.row} onLayout={onConfirmShown}>
            <PrimaryButton
              label={t("signOut.cancel")}
              variant="secondary"
              style={styles.half}
              onPress={() => setConfirming(false)}
            />
            <PrimaryButton
              label={t("signOut.button")}
              style={styles.half}
              loading={loading}
              onPress={signOut}
            />
          </View>
        </>
      ) : (
        <PrimaryButton
          label={t("signOut.button")}
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
    color: colors.terracottaInk,
  },
});

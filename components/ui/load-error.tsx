import { StyleSheet, View } from "react-native";

import { PrimaryButton } from "@/components/ui/primary-button";
import { Text } from "@/components/ui/text";
import { colors } from "@/lib/theme";
import { useT } from "@/lib/i18n/locale-context";

/**
 * What a tab shows when its data didn't load: what failed, and a way to try
 * again right here. Pulling down does the same.
 */
export function LoadError({
  message,
  onRetry,
  retrying,
}: {
  message: string;
  onRetry: () => void;
  retrying?: boolean;
}) {
  const t = useT();
  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      <Text style={styles.message}>{message}</Text>
      <PrimaryButton
        label={t("common.tryAgain")}
        onPress={onRetry}
        loading={retrying}
        variant="secondary"
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 24,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
    textAlign: "center",
  },
  button: {
    alignSelf: "stretch",
  },
});

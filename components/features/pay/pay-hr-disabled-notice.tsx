import { StyleSheet, Text, View } from "react-native";

import { useT } from "@/lib/i18n/locale-context";
import { colors } from "@/lib/theme";

/** Stands in for the pay and vale cards while PAY_HR_ENABLED is off. */
export function PayHrDisabledNotice() {
  const t = useT();
  return (
    <View style={styles.card} accessibilityRole="text">
      <Text style={styles.text}>{t("pay.disabled")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: colors.cardCream,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: { fontSize: 14, lineHeight: 20, color: colors.mutedInk },
});

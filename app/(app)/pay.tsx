import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/lib/theme";

/** Placeholder -- Story 11 builds the payslips/vales/rest-owed views here. */
export default function PayScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.text}>Payslips, vales, and rest hours coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sand,
    padding: 24,
  },
  text: {
    fontSize: 14,
    color: colors.ink,
    textAlign: "center",
  },
});

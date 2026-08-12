import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/lib/theme";

/** Placeholder -- Story 8 builds the pantry/palengke checklist here. */
export default function PantryScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.text}>Pantry & Palengke checklist coming soon.</Text>
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

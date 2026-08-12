import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/lib/theme";

/**
 * Placeholder landing route for the unauthenticated stack -- Story 6 replaces
 * this with the real invite-code entry screen. It exists now only so
 * app/index.tsx and app/(app)/_layout.tsx have a real route to redirect an
 * unauthenticated helper to.
 */
export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Linara</Text>
      <Text style={styles.subtitle}>Invite code entry is coming in the next update, po.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sand,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.pineTeal,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: colors.ink,
    textAlign: "center",
  },
});

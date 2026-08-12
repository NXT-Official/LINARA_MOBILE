import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";

import { colors } from "@/lib/theme";
import { useSession } from "@/lib/session-context";

/**
 * Entry redirect: bounces to the authenticated tab shell or the onboarding
 * stack depending on the persisted session, satisfying Story 5's acceptance
 * criterion that a signed-in launch lands directly on Today.
 */
export default function Index() {
  const { session, isLoading } = useSession();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.pineTeal} />
      </View>
    );
  }

  return <Redirect href={session ? "/(app)/today" : "/(auth)/welcome"} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sand,
  },
});

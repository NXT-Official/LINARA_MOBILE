import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";

import { colors } from "@/lib/theme";
import { useSession } from "@/lib/session-context";
import { useAccountKind } from "@/hooks/use-account-kind";

/**
 * Entry redirect: bounces to the authenticated tab shell or the onboarding
 * stack depending on the persisted session, satisfying Story 5's acceptance
 * criterion that a signed-in launch lands directly on Today. A manager lands
 * on the dashboard instead; if their kind can't be checked (offline, say),
 * the helper tabs are the default, as before managers could sign in here.
 */
export default function Index() {
  const { session, isLoading } = useSession();
  const kindQuery = useAccountKind();

  if (isLoading || (session && kindQuery.isLoading)) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.pineTeal} />
      </View>
    );
  }

  if (!session) {
    // One sign-in for everyone; a new person picks a kind from there.
    return <Redirect href="/(auth)/sign-in" />;
  }
  return <Redirect href={kindQuery.data === "manager" ? "/manager" : "/(app)/today"} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sand,
  },
});

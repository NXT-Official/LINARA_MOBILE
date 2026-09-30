import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";

import { colors } from "@/lib/theme";
import { useSession } from "@/lib/session-context";

/**
 * Main bottom tab navigator (roadmap Story 5, step 2-3): Today, Pantry, My
 * Pay, themed to the Pine-Teal / Sand brand tokens. Also re-checks the
 * session directly (not just at app/index.tsx) so deep-linking straight into
 * an (app) route can't bypass the auth gate.
 */
export default function AppTabsLayout() {
  const { session, isLoading } = useSession();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.pineTeal} />
      </View>
    );
  }

  // Losing the session in here means she already has an account (signed out,
  // or the token lapsed), so send her to sign-in rather than the invite-code
  // screen. First launch goes through app/index.tsx -> welcome instead.
  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.pineTeal,
        tabBarInactiveTintColor: colors.mutedInk,
        tabBarStyle: {
          backgroundColor: colors.cardCream,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: "Today",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="week"
        options={{
          title: "My Week",
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pantry"
        options={{
          title: "Pantry",
          tabBarIcon: ({ color, size }) => <Ionicons name="basket" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pay"
        options={{
          title: "My Pay",
          tabBarIcon: ({ color, size }) => <Ionicons name="card" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: "My Record",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sand,
  },
});

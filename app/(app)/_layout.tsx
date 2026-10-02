import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs, usePathname } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/lib/theme";
import { useSession } from "@/lib/session-context";
import { getMyEmployments } from "@/services/api/employment";
import { useAccountKind } from "@/hooks/use-account-kind";

/**
 * A tab she can see but not open: no household means no board, pantry, week
 * or pay to show. Greyed rather than hidden, so the app still reads as the
 * one she knows, waiting for her next household.
 */
function LockedTab({
  children,
  style,
  label,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  label: string;
}) {
  return (
    <View
      style={[style, styles.locked]}
      accessible
      accessibilityLabel={`${label}, bukas lang kapag may household ka`}
      accessibilityState={{ disabled: true }}
    >
      {children}
    </View>
  );
}

/**
 * Main bottom tab navigator (roadmap Story 5, step 2-3): Today, Pantry, My
 * Pay, themed to the Pine-Teal / Sand brand tokens. Also re-checks the
 * session directly (not just at app/index.tsx) so deep-linking straight into
 * an (app) route can't bypass the auth gate.
 *
 * Between households (her employment ended and she hasn't joined a new one,
 * ../LINARA/KNOWN_GAPS.md O4) only My Record opens: she can read and download
 * her history and join a new household with an invite code from there. The
 * other tabs stay visible, greyed out.
 *
 * A manager who lands here (a deep link, a stale route) goes to their
 * dashboard instead.
 */
export default function AppTabsLayout() {
  // Android draws apps edge to edge, under the status bar; with the header
  // hidden, nothing else keeps the screens' tops clear of it.
  const insets = useSafeAreaInsets();
  const { session, isLoading } = useSession();
  const pathname = usePathname();
  const kindQuery = useAccountKind();
  const employmentsQuery = useQuery({
    queryKey: ["my-employments", session?.user.id],
    queryFn: getMyEmployments,
    enabled: Boolean(session),
    // A household can end her employment while the app is open.
    refetchInterval: 5 * 60_000,
  });

  if (isLoading || (session && (employmentsQuery.isLoading || kindQuery.isLoading))) {
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

  if (kindQuery.data === "manager") {
    return <Redirect href="/manager" />;
  }

  // Couldn't check (offline, say): don't lock her out of what she had.
  const employed =
    employmentsQuery.isError || (employmentsQuery.data ?? []).some((e) => e.status === "ACTIVE");

  if (!employed && pathname !== "/record") {
    return <Redirect href="/(app)/record" />;
  }

  const lockedButton = (label: string) =>
    employed
      ? {}
      : {
          tabBarButton: (props: { children?: ReactNode; style?: StyleProp<ViewStyle> }) => (
            <LockedTab style={props.style} label={label}>
              {props.children}
            </LockedTab>
          ),
        };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { paddingTop: insets.top, backgroundColor: colors.sand },
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
          ...lockedButton("Today"),
        }}
      />
      <Tabs.Screen
        name="week"
        options={{
          title: "My Week",
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
          ...lockedButton("My Week"),
        }}
      />
      <Tabs.Screen
        name="pantry"
        options={{
          title: "Pantry",
          tabBarIcon: ({ color, size }) => <Ionicons name="basket" size={size} color={color} />,
          ...lockedButton("Pantry"),
        }}
      />
      <Tabs.Screen
        name="pay"
        options={{
          title: "My Pay",
          tabBarIcon: ({ color, size }) => <Ionicons name="card" size={size} color={color} />,
          ...lockedButton("My Pay"),
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
  locked: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.35,
  },
});

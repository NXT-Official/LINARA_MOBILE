import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/lib/theme";

/** Unauthenticated onboarding stack (sign-in, create account, invite lookup → review → flag/claim). */
export default function AuthLayout() {
  // Edge to edge on Android: keep every screen's top clear of the status bar.
  const insets = useSafeAreaInsets();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { paddingTop: insets.top, backgroundColor: colors.sand },
      }}
    />
  );
}

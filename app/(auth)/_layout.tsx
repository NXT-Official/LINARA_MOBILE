import { Stack } from "expo-router";

/** Unauthenticated onboarding stack (invite lookup → review → flag/claim). */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}

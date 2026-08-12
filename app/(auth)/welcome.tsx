import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { colors } from "@/lib/theme";
import { TextField } from "@/components/ui/text-field";
import { PrimaryButton } from "@/components/ui/primary-button";

const INVITE_CODE_LENGTH = 6;

/**
 * Onboarding entry point (roadmap Story 6, step 1). Collects the
 * 6-character invite code a manager generated on the web dashboard's
 * people.tsx and hands off to review-terms.tsx, which does the actual
 * `verifyInviteCode` lookup -- this screen only checks the code shape so a
 * mistyped code fails fast before a network round-trip.
 */
export default function WelcomeScreen() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submitCode = () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== INVITE_CODE_LENGTH) {
      setError(`Kailangan ${INVITE_CODE_LENGTH} characters ang invite code, po.`);
      return;
    }
    setError(null);
    router.push({ pathname: "/(auth)/review-terms", params: { code: trimmed } });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.title}>Linara</Text>
          <Text style={styles.subtitle}>
            Maligayang pagdating! I-enter mo ang invite code galing sa employer mo para simulan.
          </Text>
        </View>

        <TextField
          label="Invite code"
          value={code}
          onChangeText={(text) => {
            setCode(text.toUpperCase());
            setError(null);
          }}
          error={error}
          placeholder="LN98A2"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={INVITE_CODE_LENGTH}
          style={styles.codeInput}
          returnKeyType="go"
          onSubmitEditing={submitCode}
        />

        <PrimaryButton label="Continue" onPress={submitCode} disabled={!code.trim()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.sand,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    gap: 20,
  },
  hero: {
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.pineTeal,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
  codeInput: {
    textAlign: "center",
    fontSize: 22,
    letterSpacing: 6,
    fontWeight: "700",
  },
});

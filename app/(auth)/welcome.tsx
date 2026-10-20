import { useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { useT } from "@/lib/i18n/locale-context";
import { colors } from "@/lib/theme";
import { LanguageMenu } from "@/components/features/account/language-menu";
import { TextField } from "@/components/ui/text-field";
import { KEYBOARD_BEHAVIOR } from "@/components/ui/keyboard-screen";
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
  const t = useT();
  const [error, setError] = useState<string | null>(null);

  const submitCode = () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== INVITE_CODE_LENGTH) {
      setError(t("welcome.codeLength", { count: INVITE_CODE_LENGTH }));
      return;
    }
    setError(null);
    router.push({ pathname: "/(auth)/review-terms", params: { code: trimmed } });
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={KEYBOARD_BEHAVIOR}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.title}>Linara</Text>
          <Text style={styles.subtitle}>{t("welcome.subtitle")}</Text>
        </View>

        <TextField
          label={t("welcome.codeLabel")}
          value={code}
          onChangeText={(text) => {
            setCode(text.toUpperCase());
            setError(null);
          }}
          error={error}
          hint={t("welcome.codeHint")}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={INVITE_CODE_LENGTH}
          style={styles.codeInput}
          returnKeyType="go"
          onSubmitEditing={submitCode}
        />

        <PrimaryButton label={t("welcome.continue")} onPress={submitCode} disabled={!code.trim()} />

        <Pressable
          onPress={() => router.replace("/(auth)/sign-in")}
          hitSlop={8}
          accessibilityRole="button"
        >
          <Text style={styles.link}>{t("common.haveAccount")}</Text>
        </Pressable>
        <LanguageMenu />
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
  link: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: colors.pineTeal,
    textDecorationLine: "underline",
  },
  codeInput: {
    textAlign: "center",
    fontSize: 22,
    letterSpacing: 6,
    fontWeight: "700",
  },
});

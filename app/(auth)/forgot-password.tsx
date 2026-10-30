import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useT } from "@/lib/i18n/locale-context";
import { colors, fonts } from "@/lib/theme";
import { textParts } from "@/lib/i18n/translate";
import { requestPasswordReset } from "@/services/api/auth";
import { TextField } from "@/components/ui/text-field";
import { KEYBOARD_BEHAVIOR, useKeyboardOffset } from "@/components/ui/keyboard-screen";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Text } from "@/components/ui/text";

/** Supabase lets one address ask again only after this long. */
const RESEND_AFTER_SECONDS = 60;

/**
 * Forgot password, as its own screen (tester feedback: the old inline note
 * on sign-in was easy to miss). Sends the reset email, then says plainly that
 * it went and what to do next. The link opens the web app's /reset-password,
 * which sends her back here to sign in with the new password.
 */
export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const t = useT();
  const keyboardOffset = useKeyboardOffset();
  const [email, setEmail] = useState(params.email ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const send = async () => {
    const address = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) {
      setError(t("forgot.invalidEmail"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await requestPasswordReset(address);
      setSentTo(address);
      setWait(RESEND_AFTER_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("forgot.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={KEYBOARD_BEHAVIOR}
      keyboardVerticalOffset={keyboardOffset}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {sentTo ? (
          <View style={styles.sentCard} accessibilityRole="alert">
            <Ionicons name="mail-open-outline" size={36} color={colors.pineTeal} />
            <Text style={styles.sentTitle}>{t("forgot.sentTitle")}</Text>
            <Text style={styles.sentBody}>
              {textParts(t("forgot.sentBody")).map((part, i) =>
                typeof part === "string" ? (
                  part
                ) : (
                  <Text key={i} style={styles.strong}>
                    {sentTo}
                  </Text>
                ),
              )}
            </Text>
            <Text style={styles.sentHint}>{t("forgot.sentHint")}</Text>
          </View>
        ) : (
          <View style={styles.hero}>
            <Text style={styles.title}>{t("forgot.title")}</Text>
            <Text style={styles.subtitle}>{t("forgot.subtitle")}</Text>
          </View>
        )}

        {sentTo ? null : (
          <TextField
            label={t("common.email")}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError(null);
            }}
            placeholder={t("common.emailPlaceholder")}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="send"
            onSubmitEditing={send}
          />
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {sentTo ? (
          <>
            <PrimaryButton
              label={t("common.backToSignIn")}
              onPress={() => router.replace("/(auth)/sign-in")}
            />
            <PrimaryButton
              label={wait > 0 ? t("forgot.resendIn", { seconds: wait }) : t("forgot.resend")}
              variant="secondary"
              loading={loading}
              disabled={wait > 0}
              onPress={send}
            />
            <Pressable
              onPress={() => {
                setSentTo(null);
                setError(null);
              }}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={styles.link}>{t("forgot.otherEmail")}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <PrimaryButton
              label={t("forgot.send")}
              loading={loading}
              disabled={!email.trim()}
              onPress={send}
            />
            <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
              <Text style={styles.link}>{t("common.backToSignIn")}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.sand },
  content: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 16 },
  hero: { marginBottom: 8, gap: 8 },
  title: { fontSize: 28, fontFamily: fonts.displayBold, color: colors.pineTeal },
  subtitle: { fontSize: 15, lineHeight: 22, color: colors.mutedInk },
  sentCard: {
    alignItems: "center",
    gap: 10,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardCream,
    marginBottom: 8,
  },
  sentTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.ink,
    textAlign: "center",
  },
  sentBody: { fontSize: 15, lineHeight: 22, color: colors.ink, textAlign: "center" },
  sentHint: { fontSize: 13, lineHeight: 19, color: colors.mutedInk, textAlign: "center" },
  strong: { fontWeight: "700" },
  errorText: { fontSize: 14, lineHeight: 20, color: colors.terracottaInk },
  link: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: colors.pineTeal,
    textDecorationLine: "underline",
  },
});

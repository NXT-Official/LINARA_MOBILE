import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, fonts } from "@/lib/theme";
import { requestPasswordReset } from "@/services/api/auth";
import { TextField } from "@/components/ui/text-field";
import { PrimaryButton } from "@/components/ui/primary-button";

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
      setError("Ilagay ang buong email address mo, hal. rosa@gmail.com.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await requestPasswordReset(address);
      setSentTo(address);
      setWait(RESEND_AFTER_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hindi naipadala ang reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {sentTo ? (
          <View style={styles.sentCard} accessibilityRole="alert">
            <Ionicons name="mail-open-outline" size={36} color={colors.pineTeal} />
            <Text style={styles.sentTitle}>Password reset email sent!</Text>
            <Text style={styles.sentBody}>
              Please check your email. Kung may account ang{" "}
              <Text style={styles.strong}>{sentTo}</Text>, may link doon para gumawa ng bagong
              password.
            </Text>
            <Text style={styles.sentHint}>
              Hindi makita? Tingnan ang Spam o Promotions folder. Pagkatapos mag-set ng bagong
              password, bumalik dito at mag-sign in.
            </Text>
          </View>
        ) : (
          <View style={styles.hero}>
            <Text style={styles.title}>Nakalimutan ang password?</Text>
            <Text style={styles.subtitle}>
              Ilagay ang email ng account mo. Padadalhan ka namin ng link para gumawa ng bago.
            </Text>
          </View>
        )}

        {sentTo ? null : (
          <TextField
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError(null);
            }}
            placeholder="hal. rosa@gmail.com"
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
              label="Bumalik sa sign in"
              onPress={() => router.replace("/(auth)/sign-in")}
            />
            <PrimaryButton
              label={wait > 0 ? `Ipadala ulit (${wait}s)` : "Ipadala ulit"}
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
              <Text style={styles.link}>Ibang email ang gagamitin</Text>
            </Pressable>
          </>
        ) : (
          <>
            <PrimaryButton
              label="Ipadala ang reset link"
              loading={loading}
              disabled={!email.trim()}
              onPress={send}
            />
            <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
              <Text style={styles.link}>Bumalik sa sign in</Text>
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
  title: { fontSize: 28, fontWeight: "700", color: colors.pineTeal },
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

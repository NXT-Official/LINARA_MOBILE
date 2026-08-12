import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { colors } from "@/lib/theme";
import { claimProfile } from "@/services/api/handshake";
import { TextField } from "@/components/ui/text-field";
import { PrimaryButton } from "@/components/ui/primary-button";

const MIN_PASSWORD_LENGTH = 6;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Secure claim (roadmap Story 6, step 4 / plan.md 3.1 step 4). Registers
 * the helper's own GoTrue credentials via claimProfile, which flips
 * helper_profiles.status from PENDING_CLAIM to ACTIVE and locks out
 * employer access to the account. claimProfile calls supabase.auth
 * directly on the shared client, so a successful claim already updates
 * the session app/_layout.tsx's SessionProvider is watching -- no manual
 * token handoff needed before redirecting to the tab shell.
 */
export default function ClaimAccountScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailError =
    email.length > 0 && !isValidEmail(email) ? "Hindi valid ang email address, po." : null;
  const passwordError =
    password.length > 0 && password.length < MIN_PASSWORD_LENGTH
      ? `Dapat may kahit ${MIN_PASSWORD_LENGTH} characters ang password.`
      : null;
  const confirmError =
    confirmPassword.length > 0 && confirmPassword !== password
      ? "Hindi magkatugma ang password."
      : null;

  const canSubmit =
    Boolean(email.trim()) &&
    isValidEmail(email) &&
    password.length >= MIN_PASSWORD_LENGTH &&
    password === confirmPassword;

  const submitClaim = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await claimProfile(code, email.trim(), password);
      router.replace("/(app)/today");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hindi nagtagumpay ang pag-claim ng account.");
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
        <Text style={styles.eyebrow}>Step 3 of 3</Text>
        <Text style={styles.title}>This account is yours.</Text>
        <View style={styles.introCard}>
          <Text style={styles.introText}>
            Ito ay <Text style={styles.introBold}>iyong-iyo</Text>. Mananatili ang record mo kahit
            magpalit ka ng household.
          </Text>
        </View>

        <TextField
          label="Your email address"
          value={email}
          onChangeText={setEmail}
          error={emailError}
          placeholder="hal. rosa@gmail.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          error={passwordError}
          placeholder="••••••"
          secureTextEntry
        />
        <TextField
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          error={confirmError}
          placeholder="••••••"
          secureTextEntry
        />

        <Text style={styles.privacyNote}>
          Ito ay ise-save nang ligtas sa system. Iyong-iyo lang ang password na ito at hindi ito
          nakikita ng manager mo.
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.actions}>
          <PrimaryButton
            label="Back"
            variant="secondary"
            style={styles.actionButton}
            onPress={() => router.back()}
          />
          <PrimaryButton
            label="Lock & claim account"
            style={styles.actionButton}
            loading={loading}
            disabled={!canSubmit}
            onPress={submitClaim}
          />
        </View>
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
    padding: 24,
    gap: 14,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.terracottaGold,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.ink,
  },
  introCard: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: "rgba(31,90,84,0.08)",
  },
  introText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  introBold: {
    fontWeight: "700",
    color: colors.pineTeal,
  },
  privacyNote: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.mutedInk,
  },
  errorText: {
    fontSize: 13,
    color: colors.terracottaGold,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
  },
});

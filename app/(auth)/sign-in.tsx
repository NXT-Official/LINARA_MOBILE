import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";

import { colors } from "@/lib/theme";
import { queryClient } from "@/lib/query-client";
import { accountKindKey } from "@/hooks/use-account-kind";
import { supabase } from "@/services/supabase";
import { requestPasswordReset, signIn } from "@/services/api/auth";
import { TextField } from "@/components/ui/text-field";
import { PrimaryButton } from "@/components/ui/primary-button";

/**
 * Sign-in for a helper who has already claimed her account (KNOWN_GAPS.md
 * O3). Without this, losing the session -- reinstall, new phone, sign-out --
 * left only the invite-code screen, whose code is single-use and already
 * spent. Also the entry point for a forgotten password: the reset link opens
 * the web dashboard's /reset-password page, then she comes back here.
 *
 * Everyone signs in here, employer or kasambahay; the account's type decides
 * where it lands (helper tabs, or the dashboard in app/manager.tsx). New
 * people pick which kind they are on create-account.tsx.
 */
export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSentTo, setResetSentTo] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      const kind = await signIn(email, password);
      const { data } = await supabase.auth.getSession();
      queryClient.setQueryData(accountKindKey(data.session?.user.id), kind);
      router.replace(kind === "manager" ? "/manager" : "/(app)/today");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hindi nakapag-sign in.");
    } finally {
      setLoading(false);
    }
  };

  const sendReset = async () => {
    if (!email.trim()) {
      setError("Ilagay muna ang email mo sa itaas, tapos pindutin ulit.");
      return;
    }
    setError(null);
    try {
      await requestPasswordReset(email);
      setResetSentTo(email.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hindi naipadala ang reset link.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Para sa employer at kasambahay. Mag-sign in gamit ang email at password mo.
          </Text>
        </View>

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
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setError(null);
          }}
          placeholder="••••••"
          secureTextEntry
          returnKeyType="go"
          onSubmitEditing={submit}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {resetSentTo ? (
          <Text style={styles.noteText}>
            Kung may account ang {resetSentTo}, may reset link na papunta roon. Pagkatapos mong
            mag-set ng bagong password, bumalik dito para mag-sign in.
          </Text>
        ) : null}

        <PrimaryButton
          label="Sign in"
          loading={loading}
          disabled={!email.trim() || !password}
          onPress={submit}
        />

        <Pressable onPress={sendReset} hitSlop={8} accessibilityRole="button">
          <Text style={styles.link}>Nakalimutan ang password?</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/(auth)/create-account")}
          hitSlop={8}
          accessibilityRole="button"
        >
          <Text style={styles.link}>Wala pang account? Gumawa ng account</Text>
        </Pressable>
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
    gap: 16,
  },
  hero: {
    marginBottom: 8,
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.pineTeal,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.mutedInk,
  },
  errorText: {
    fontSize: 13,
    color: colors.terracottaGold,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink,
  },
  link: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: colors.pineTeal,
    textDecorationLine: "underline",
  },
});

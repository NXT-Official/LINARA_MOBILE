import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { colors } from "@/lib/theme";
import { flagDiscrepancy } from "@/services/api/handshake";
import { PrimaryButton } from "@/components/ui/primary-button";

const FLAG_CATEGORIES: { value: "wage" | "shift" | "restDay" | "station"; label: string }[] = [
  { value: "wage", label: "Sahod / wage" },
  { value: "shift", label: "Shift hours" },
  { value: "restDay", label: "Rest day" },
  { value: "station", label: "Role / station" },
];

/**
 * Discrepancy flagging (roadmap Story 6, step 3 / plan.md 3.1 step 3).
 * Freezes onboarding by writing to public.invite_flags via flagDiscrepancy
 * -- the helper is not blocked from returning to review-terms afterward,
 * but the manager sees the dispute on the web dashboard's <NeedsYou />
 * panel before the seat can be claimed in good faith.
 */
export default function FlagTermsScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [field, setField] = useState<(typeof FLAG_CATEGORIES)[number]["value"]>("wage");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitFlag = async () => {
    setLoading(true);
    setError(null);
    try {
      await flagDiscrepancy(code, field, note.trim());
      router.replace({ pathname: "/(auth)/review-terms", params: { code, flagged: "1" } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "May error sa pagpapadala ng flag.");
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
        <Text style={styles.eyebrow}>Flag a detail</Text>
        <Text style={styles.title}>Something&apos;s not right?</Text>
        <Text style={styles.subtitle}>
          Alin ang mali? Sabihin mo lang — ipapaalam namin sa manager. Hindi mo pa kailangang
          pumirma.
        </Text>

        <Text style={styles.label}>Which detail?</Text>
        <View style={styles.categoryRow}>
          {FLAG_CATEGORIES.map((category) => {
            const selected = category.value === field;
            return (
              <Pressable
                key={category.value}
                onPress={() => setField(category.value)}
                style={[styles.categoryChip, selected && styles.categoryChipSelected]}
              >
                <Text
                  style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}
                >
                  {category.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.noteField}>
          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Hal. Ang usapan namin ay ₱8,500 monthly rate, hindi ₱8,000."
            placeholderTextColor={colors.mutedInk}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={styles.noteInput}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.actions}>
          <PrimaryButton
            label="Cancel"
            variant="secondary"
            style={styles.actionButton}
            onPress={() => router.back()}
          />
          <PrimaryButton
            label="Send flag to manager"
            style={styles.actionButton}
            loading={loading}
            onPress={submitFlag}
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
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.mutedInk,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.mutedInk,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardCream,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryChipSelected: {
    backgroundColor: colors.pineTeal,
    borderColor: colors.pineTeal,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.ink,
  },
  categoryChipTextSelected: {
    color: colors.cardCream,
  },
  noteField: {
    gap: 6,
  },
  noteInput: {
    minHeight: 100,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardCream,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.ink,
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

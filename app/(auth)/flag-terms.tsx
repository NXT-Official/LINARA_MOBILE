import { useState } from "react";
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { useT } from "@/lib/i18n/locale-context";
import { colors } from "@/lib/theme";
import { flagDiscrepancy } from "@/services/api/handshake";
import { KEYBOARD_BEHAVIOR } from "@/components/ui/keyboard-screen";
import { PrimaryButton } from "@/components/ui/primary-button";

const FLAG_CATEGORIES = [
  { value: "wage", label: "flag.wage" },
  { value: "shift", label: "flag.shift" },
  { value: "restDay", label: "flag.restDay" },
  { value: "station", label: "flag.station" },
] as const;

/**
 * Discrepancy flagging (roadmap Story 6, step 3 / plan.md 3.1 step 3).
 * Freezes onboarding by writing to public.invite_flags via flagDiscrepancy
 * -- the helper is not blocked from returning to review-terms afterward,
 * but the manager sees the dispute on the web dashboard's <NeedsYou />
 * panel before the seat can be claimed in good faith.
 */
export default function FlagTermsScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const t = useT();
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
      setError(err instanceof Error ? err.message : t("flag.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={KEYBOARD_BEHAVIOR}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>{t("flag.eyebrow")}</Text>
        <Text style={styles.title}>{t("flag.title")}</Text>
        <Text style={styles.subtitle}>{t("flag.subtitle")}</Text>

        <Text style={styles.label}>{t("flag.which")}</Text>
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
                  {t(category.label)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.noteField}>
          <Text style={styles.label}>{t("flag.note")}</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={t("flag.notePlaceholder")}
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
            label={t("flag.cancel")}
            variant="secondary"
            style={styles.actionButton}
            onPress={() => router.back()}
          />
          <PrimaryButton
            label={t("common.sendToManager")}
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
    fontSize: 13,
    fontWeight: "700",
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
    fontSize: 13,
    fontWeight: "700",
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

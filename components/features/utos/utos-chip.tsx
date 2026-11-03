import { Pressable, StyleSheet, View } from "react-native";

import { colors } from "@/lib/theme";
import { utosAnswers } from "@/lib/utos";
import type { QuickUtoItem } from "@/services/api/quick-utos";
import { Text } from "@/components/ui/text";
import { useT } from "@/lib/i18n/locale-context";

function formatTimeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * A single Quick Utos banner (roadmap Story 7, step 5). Sige (seen) tells
 * the manager she saw it and keeps it here with Tapos na (done), which takes
 * it off (QA F-LM-004).
 */
export function UtosChip({
  utos,
  onAck,
  acking,
}: {
  utos: QuickUtoItem;
  onAck: (id: string, ack: "seen" | "done") => void;
  acking: boolean;
}) {
  const t = useT();
  return (
    <View style={[styles.chip, utos.emergency && styles.chipEmergency]}>
      <View style={styles.header}>
        <Text style={styles.content}>{utos.content}</Text>
        {utos.emergency && (
          <View style={styles.emergencyBadge}>
            <Text style={styles.emergencyBadgeText}>{t("today.emergency")}</Text>
          </View>
        )}
      </View>
      <Text style={styles.meta}>
        {t("today.utosMeta", { time: formatTimeOfDay(utos.createdAt), name: utos.senderName })}
        {utos.afterHours ? t("today.lampasSaOras") : ""}
      </Text>

      {utos.waiting ? (
        <Text style={styles.waitingText}>{t("today.naghihintayMakikitaMoToPagbalik")}</Text>
      ) : (
        <View style={styles.actions}>
          {utosAnswers(utos.ackState).includes("seen") ? (
            <Pressable
              disabled={acking}
              onPress={() => onAck(utos.id, "seen")}
              accessibilityRole="button"
              accessibilityState={{ disabled: acking }}
              style={({ pressed }) => [
                styles.actionButton,
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>{t("today.sige")}</Text>
            </Pressable>
          ) : (
            <Text style={styles.seenText}>{t("today.nakitaMoNaPindutinKapag")}</Text>
          )}
          <Pressable
            disabled={acking}
            onPress={() => onAck(utos.id, "done")}
            accessibilityRole="button"
            accessibilityState={{ disabled: acking }}
            style={({ pressed }) => [
              styles.actionButton,
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>{t("today.taposNa")}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // One quiet card like the rest of Today; an emergency gets a full Late
  // border and its badge, not a coloured stripe down one side.
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardCream,
    padding: 14,
    gap: 6,
  },
  chipEmergency: {
    borderWidth: 1.5,
    borderColor: colors.statusLate,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  content: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  emergencyBadge: {
    borderRadius: 999,
    backgroundColor: colors.statusLateSoft,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  emergencyBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.statusLateInk,
  },
  meta: {
    fontSize: 13,
    color: colors.mutedInk,
  },
  seenText: {
    flex: 1,
    alignSelf: "center",
    fontSize: 13,
    color: colors.mutedInk,
  },
  waitingText: {
    fontSize: 13,
    fontStyle: "italic",
    color: colors.mutedInk,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.sand,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  primaryButton: {
    backgroundColor: colors.pineTeal,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.cardCream,
  },
  pressed: {
    opacity: 0.85,
  },
});

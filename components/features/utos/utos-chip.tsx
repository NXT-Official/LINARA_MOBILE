import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/lib/theme";
import type { QuickUtoItem } from "@/services/api/quick-utos";

function formatTimeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * A single floating Quick Utos banner (roadmap Story 7, step 5). Mirrors
 * the web reference's UtosChip ack buttons ("Got it" -> seen, "Done" ->
 * done), but has no acked/checkmark state of its own -- the parent feed
 * drops the row entirely once acked, matching this screen's "vanish when
 * acknowledged" acceptance criterion.
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
  return (
    <View style={[styles.chip, utos.emergency && styles.chipEmergency]}>
      <View style={styles.header}>
        <Text style={styles.content}>{utos.content}</Text>
        {utos.emergency && (
          <View style={styles.emergencyBadge}>
            <Text style={styles.emergencyBadgeText}>Emergency</Text>
          </View>
        )}
      </View>
      <Text style={styles.meta}>
        {formatTimeOfDay(utos.createdAt)} · mula kay {utos.senderName}
        {utos.afterHours ? " · After-hours" : ""}
      </Text>

      {utos.waiting ? (
        <Text style={styles.waitingText}>Waiting — makikita mo &apos;to pagbalik mo.</Text>
      ) : (
        <View style={styles.actions}>
          <Pressable
            disabled={acking}
            onPress={() => onAck(utos.id, "seen")}
            style={({ pressed }) => [
              styles.actionButton,
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Got it</Text>
          </Pressable>
          <Pressable
            disabled={acking}
            onPress={() => onAck(utos.id, "done")}
            style={({ pressed }) => [
              styles.actionButton,
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Done</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 18,
    borderLeftWidth: 4,
    borderLeftColor: colors.terracottaGold,
    backgroundColor: colors.cardCream,
    padding: 12,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  chipEmergency: {
    borderLeftColor: "#C24E30",
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
    backgroundColor: "rgba(194,78,48,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  emergencyBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#C24E30",
  },
  meta: {
    fontSize: 11,
    color: colors.mutedInk,
  },
  waitingText: {
    fontSize: 11,
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
    minHeight: 40,
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
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
  },
  primaryButton: {
    backgroundColor: colors.pineTeal,
  },
  primaryButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.cardCream,
  },
  pressed: {
    opacity: 0.85,
  },
});

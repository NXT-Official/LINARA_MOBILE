import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/lib/theme";
import type { RosaAvailabilityStatus } from "@/lib/availability";

function formatTimeOfDay(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const STATUS_LABEL: Record<RosaAvailabilityStatus["status"], string> = {
  on_shift: "On Shift",
  available: "Available",
  off: "Off",
};

/**
 * Big, thumb-friendly reachability control for the Dignity Header, matching
 * roadmap/Story_5_MobileShellAndBottomNavigationTabs.md step 5. On Shift is
 * automatic (derived from the helper's own schedule) and isn't tappable;
 * Available/Off are manual opt-ins with a minimum 48px touch target.
 */
export function RosaAvailControl({
  status,
  onAvailable,
  onOff,
}: {
  status: RosaAvailabilityStatus;
  onAvailable: (hours: number) => void;
  onOff: () => void;
}) {
  const onShift = status.status === "on_shift";

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Availability</Text>
        <View style={styles.pill}>
          <View
            style={[
              styles.pillDot,
              {
                backgroundColor: onShift
                  ? "#8FE3C4"
                  : status.status === "available"
                    ? colors.terracottaGold
                    : "rgba(253,251,246,0.5)",
              },
            ]}
          />
          <Text style={styles.pillText}>{STATUS_LABEL[status.status]}</Text>
        </View>
      </View>

      {status.status === "available" && status.until ? (
        <Text style={styles.detail}>Until {formatTimeOfDay(status.until)}</Text>
      ) : null}

      {!onShift && (
        <View style={styles.actions}>
          {status.status === "available" ? (
            <Pressable
              onPress={onOff}
              style={({ pressed }) => [
                styles.touchTarget,
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Switch to Off</Text>
            </Pressable>
          ) : status.quiet ? (
            <Text style={styles.detail}>Available is disabled during quiet hours.</Text>
          ) : (
            <>
              <Pressable
                onPress={() => onAvailable(1)}
                style={({ pressed }) => [
                  styles.touchTarget,
                  styles.primaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.primaryButtonText}>Available 1 hr</Text>
              </Pressable>
              <Pressable
                onPress={() => onAvailable(2)}
                style={({ pressed }) => [
                  styles.touchTarget,
                  styles.primaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.primaryButtonText}>Available 2 hrs</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    borderRadius: 16,
    padding: 12,
    backgroundColor: "rgba(253,251,246,0.12)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "rgba(253,251,246,0.7)",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(253,251,246,0.15)",
  },
  pillDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.cardCream,
  },
  detail: {
    marginTop: 8,
    fontSize: 12,
    color: "rgba(253,251,246,0.75)",
  },
  actions: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  touchTarget: {
    minHeight: 48,
    minWidth: 120,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryButton: {
    backgroundColor: colors.cardCream,
  },
  primaryButtonText: {
    color: colors.pineTeal,
    fontWeight: "700",
    fontSize: 13,
  },
  secondaryButton: {
    backgroundColor: "rgba(253,251,246,0.15)",
  },
  secondaryButtonText: {
    color: colors.cardCream,
    fontWeight: "700",
    fontSize: 13,
  },
  pressed: {
    opacity: 0.85,
  },
});

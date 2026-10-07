import { StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "@/lib/theme";
import { greetingFor } from "@/lib/today";
import { formatShiftTime, weekdayName } from "@/lib/format";
import { firstNameOf } from "@/lib/names";
import type { RosaAvailabilityStatus } from "@/lib/availability";
import { RosaAvailControl } from "@/components/features/availability/rosa-avail-control";
import type { HelperProfileSummary } from "@/services/api/helper-profile";

/**
 * The helper's greeting, shift snapshot, and reachability control -- sits
 * above the Today tab's content, matching the web dashboard's HelperShell
 * header band (see ../LINARA/src/features/dashboard/components/helper-shell.tsx).
 */
export function DignityHeader({
  profile,
  availability,
  onAvailable,
  onOff,
}: {
  profile: HelperProfileSummary;
  availability: RosaAvailabilityStatus;
  onAvailable: (hours: number) => void;
  onOff: () => void;
}) {
  // Her own name, not a title saved with it ("Kuya Marito" is Marito).
  const firstName = firstNameOf(profile.name);

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Station ni {firstName}</Text>
      <Text style={styles.greeting}>
        {greetingFor(new Date())}, {firstName}.
      </Text>

      <View style={styles.statsRow}>
        <View style={styles.statTile}>
          <Text style={styles.statLabel}>Shift mo ngayon</Text>
          <Text style={styles.statValue}>
            {formatShiftTime(profile.shiftStart)} – {formatShiftTime(profile.shiftEnd)}
          </Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statLabel}>Rest day</Text>
          <Text style={styles.statValue}>{weekdayName(profile.weeklyRestDay)}</Text>
        </View>
      </View>

      <RosaAvailControl status={availability} onAvailable={onAvailable} onOff={onOff} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: colors.pineTeal,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "rgba(253,251,246,0.7)",
  },
  greeting: {
    marginTop: 6,
    fontFamily: fonts.displayBold,
    fontSize: 24,
    color: colors.cardCream,
  },
  statsRow: {
    marginTop: 16,
    flexDirection: "row",
    gap: 12,
  },
  statTile: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    backgroundColor: "rgba(253,251,246,0.1)",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "rgba(253,251,246,0.7)",
  },
  statValue: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: "700",
    color: colors.cardCream,
  },
});

import { StyleSheet, View } from "react-native";

import { colors, fonts } from "@/lib/theme";
import { greetingFor } from "@/lib/today";
import { formatShiftTime, weekdayName } from "@/lib/format";
import { firstNameOf } from "@/lib/names";
import type { RosaAvailabilityStatus } from "@/lib/availability";
import { RosaAvailControl } from "@/components/features/availability/rosa-avail-control";
import type { HelperProfileSummary } from "@/services/api/helper-profile";
import { Text } from "@/components/ui/text";
import { useT } from "@/lib/i18n/locale-context";

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
  const t = useT();
  // Her own name, not a title saved with it ("Kuya Marito" is Marito).
  const firstName = firstNameOf(profile.name);

  return (
    <View style={styles.card}>
      <Text style={styles.greeting} accessibilityRole="header">
        {greetingFor(new Date())}, {firstName}.
      </Text>
      {/* Her day in one line; the tiles that held it were cards in a card. */}
      <Text style={styles.shiftLine}>
        {t("today.shiftLine", {
          start: formatShiftTime(profile.shiftStart),
          end: formatShiftTime(profile.shiftEnd),
          restDay: weekdayName(profile.weeklyRestDay),
        })}
      </Text>

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
  greeting: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    color: colors.cardCream,
  },
  shiftLine: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(253,251,246,0.85)",
  },
});

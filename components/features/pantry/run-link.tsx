import { Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import { colors } from "@/lib/theme";
import { getRunForTicket } from "@/services/api/grocery";

/**
 * On her task card when the task carries a grocery run (the drive to the
 * market): the run's name, and a tap to its list on the Pantry tab.
 * Nothing when it carries none, or before the runs migration.
 */
export function RunLink({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const query = useQuery({
    queryKey: ["run-for-ticket", ticketId],
    queryFn: () => getRunForTicket(ticketId),
    staleTime: 60_000,
  });
  if (!query.data) return null;
  return (
    <Pressable
      onPress={() => router.push("/(app)/pantry")}
      accessibilityRole="link"
      accessibilityLabel={`May listahan: ${query.data.title}. Buksan sa Pantry.`}
      style={styles.link}
    >
      <Ionicons name="basket-outline" size={16} color={colors.terracottaInk} />
      <Text style={styles.text} numberOfLines={1}>
        May listahan: {query.data.title}
      </Text>
      <Text style={styles.open}>Buksan</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.terracottaWash,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.terracottaInk,
  },
  open: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.terracottaInk,
  },
});

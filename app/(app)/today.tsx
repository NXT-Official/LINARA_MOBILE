import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { colors } from "@/lib/theme";
import { useRosaAvailability } from "@/hooks/use-rosa-availability";
import { DignityHeader } from "@/components/features/today/dignity-header";
import { getMyHelperProfile } from "@/services/api/helper-profile";

/**
 * Today tab (roadmap Story 5, step 4). Currently hosts the Dignity Header
 * only -- the Active Focus Card and SOP carousel are Story 7's scope.
 */
export default function TodayScreen() {
  const profileQuery = useQuery({
    queryKey: ["my-helper-profile"],
    queryFn: getMyHelperProfile,
  });

  const availability = useRosaAvailability(
    profileQuery.data
      ? {
          shiftStart: profileQuery.data.shiftStart,
          shiftEnd: profileQuery.data.shiftEnd,
          weeklyRestDay: profileQuery.data.weeklyRestDay,
        }
      : null,
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {profileQuery.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.pineTeal} />
        </View>
      ) : profileQuery.isError || !profileQuery.data ? (
        <Text style={styles.errorText}>
          Couldn&apos;t load your shift details. Pull to refresh in a moment, po.
        </Text>
      ) : (
        <DignityHeader
          profile={profileQuery.data}
          availability={availability.status}
          onAvailable={availability.setAvailable}
          onOff={availability.setOff}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.sand,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  loading: {
    paddingVertical: 40,
    alignItems: "center",
  },
  errorText: {
    fontSize: 14,
    color: colors.ink,
    textAlign: "center",
    paddingVertical: 24,
  },
});

import { useState } from "react";
import { RefreshControl } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { colors } from "@/lib/theme";

/**
 * Pull down to reload everything the screen is showing: every query that is
 * mounted right now refetches, so a screen never has to list its own keys.
 * The spinner stays until they've all settled, failures included.
 */
export function usePullRefresh() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.refetchQueries({ type: "active" });
    } finally {
      setRefreshing(false);
    }
  };

  return {
    refresh,
    control: (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={refresh}
        colors={[colors.pineTeal]}
        tintColor={colors.pineTeal}
        progressBackgroundColor={colors.cardCream}
      />
    ),
  };
}

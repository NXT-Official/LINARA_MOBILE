import { StyleSheet, View } from "react-native";

import type { QuickUtoItem } from "@/services/api/quick-utos";
import { UtosChip } from "@/components/features/utos/utos-chip";

/**
 * Floating stack of ephemeral Quick Utos banners (roadmap Story 7, step 5 /
 * plan.md 3.2). Absolutely positioned over the Today tab's content so a new
 * ping surfaces immediately without shifting the focus card layout.
 */
export function FloatingQuickUtosFeed({
  utosList,
  onAck,
  ackingId,
}: {
  utosList: QuickUtoItem[];
  onAck: (id: string, ack: "seen" | "done") => void;
  ackingId: string | null;
}) {
  if (utosList.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      {utosList.map((utos) => (
        <UtosChip key={utos.id} utos={utos} onAck={onAck} acking={ackingId === utos.id} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    gap: 10,
  },
});

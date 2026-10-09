import { StyleSheet, View } from "react-native";

import type { QuickUtoItem } from "@/services/api/quick-utos";
import { UtosChip } from "@/components/features/utos/utos-chip";

/**
 * The Quick Utos waiting for an answer (roadmap Story 7, step 5 / plan.md
 * 3.2), stacked at the top of Ngayon above the focus card. They used to float
 * over the bottom of the screen, which covered the task's own "Tapos na"
 * until every utos was answered (KNOWN_GAPS.md O52).
 */
export function QuickUtosFeed({
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
    <View style={styles.container}>
      {utosList.map((utos) => (
        <UtosChip key={utos.id} utos={utos} onAck={onAck} acking={ackingId === utos.id} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
});

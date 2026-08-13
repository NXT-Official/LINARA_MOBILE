import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/lib/theme";
import type { FocusTask } from "@/services/api/tickets";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SopCarousel } from "@/components/features/today/sop-carousel";

const STATUS_LABEL: Record<FocusTask["status"], string> = {
  todo: "Hindi pa sinisimulan",
  in_progress: "Ginagawa ngayon",
  blocked: "Naka-hold",
  done: "Tapos na",
};

/**
 * The Today tab's single high-priority task (roadmap Story 7, step 2 /
 * plan.md 3.2 "Active Focus Card"). `blocked` tickets show status only --
 * the block-reason flow itself (see web's block-reason-modal.tsx) is
 * manager-side scope, not part of this story.
 */
export function ActiveFocusCard({
  task,
  onStart,
  onComplete,
  isStarting,
  isCompleting,
}: {
  task: FocusTask;
  onStart: () => void;
  onComplete: () => void;
  isStarting: boolean;
  isCompleting: boolean;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Focus ngayon</Text>
      <Text style={styles.title}>{task.title}</Text>
      <Text style={styles.status}>{STATUS_LABEL[task.status]}</Text>

      {task.notes ? <Text style={styles.notes}>{task.notes}</Text> : null}

      {task.sop ? <SopCarousel sop={task.sop} /> : null}

      {task.status === "todo" && (
        <PrimaryButton label="Start Task" loading={isStarting} onPress={onStart} />
      )}
      {task.status === "in_progress" && (
        <PrimaryButton label="Done" loading={isCompleting} onPress={onComplete} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: colors.cardCream,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.terracottaGold,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.ink,
  },
  status: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.mutedInk,
  },
  notes: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
});

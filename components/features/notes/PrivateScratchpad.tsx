import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { colors } from "@/lib/theme";
import { TextField } from "@/components/ui/text-field";
import { PrimaryButton } from "@/components/ui/primary-button";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import {
  createTextNote,
  createVoiceNote,
  getMyNotes,
  markNotePromoted,
  type HelperNote,
} from "@/services/api/notes";
import { createTicket } from "@/services/api/tickets";
import { promoteVoiceTask, transcribeAudio } from "@/services/voice-pipeline";
import { enqueueSyncAction } from "@/services/sqlite-queue";
import { isOffline } from "@/lib/network";

type Station = "Yaya" | "Cook" | "Laundry" | "Driver" | "House";

/** Maps a VoiceTaskPromotion's relative date + time back to a concrete ISO instant. */
function computeScheduledStart(targetDateOffset: number, targetTime: string): string {
  const [hours, minutes] = targetTime.split(":").map(Number);
  const scheduled = new Date();
  scheduled.setDate(scheduled.getDate() + targetDateOffset);
  scheduled.setHours(hours, minutes, 0, 0);
  return scheduled.toISOString();
}

/**
 * Private Notes Scratchpad (roadmap Story 9 / plan.md Section 3.2). Fully
 * isolated behind `helper_notes_privacy` RLS -- no manager code path can
 * read these rows. Typed and voice notes both land here; "Promote to Board"
 * is what turns one into a real, shared `tickets` row.
 */
export function PrivateScratchpad({
  helperId,
  householdId,
  userId,
  station,
}: {
  helperId: string;
  householdId: string;
  userId: string;
  station: Station;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const { isRecording, startRecording, stopRecording } = useAudioRecorder();

  const notesQuery = useQuery({
    queryKey: ["helper-notes", helperId],
    queryFn: () => getMyNotes(helperId),
    enabled: Boolean(helperId),
  });

  const invalidateNotes = () =>
    queryClient.invalidateQueries({ queryKey: ["helper-notes", helperId] });

  const addTextMutation = useMutation({
    mutationFn: async (text: string) => {
      if (await isOffline()) {
        await enqueueSyncAction("add_text_note", { helperId, text });
        return { queued: true };
      }
      await createTextNote(helperId, text);
      return { queued: false };
    },
    onSuccess: (result, text) => {
      setDraft("");
      if (result.queued) {
        queryClient.setQueryData<HelperNote[]>(["helper-notes", helperId], (old) => [
          { id: `pending-${Date.now()}`, text, done: false, createdAt: new Date().toISOString() },
          ...(old ?? []),
        ]);
      } else {
        invalidateNotes();
      }
    },
  });

  const addVoiceMutation = useMutation({
    mutationFn: async (localUri: string) => {
      const transcript = await transcribeAudio(localUri);
      await createVoiceNote(helperId, transcript);
    },
    onSuccess: invalidateNotes,
  });

  const promoteMutation = useMutation({
    mutationFn: async (note: HelperNote) => {
      const promotion = await promoteVoiceTask(note.text, station);
      const scheduledStart = computeScheduledStart(
        promotion.targetDateOffset,
        promotion.targetTime,
      );
      const titles = promotion.subtasks.length > 0 ? promotion.subtasks : [promotion.cleanTitle];

      for (const title of titles) {
        await createTicket({
          householdId,
          helperId,
          createdBy: userId,
          title,
          notes: promotion.note,
          scheduledStart,
        });
      }

      await markNotePromoted(note.id);
    },
    onMutate: (note: HelperNote) => setPromotingId(note.id),
    onSettled: () => {
      setPromotingId(null);
      invalidateNotes();
      queryClient.invalidateQueries({ queryKey: ["focus-task", helperId] });
    },
  });

  const handleReleaseRecord = async () => {
    const uri = await stopRecording();
    if (uri) {
      addVoiceMutation.mutate(uri);
    }
  };

  const activeNotes = (notesQuery.data ?? []).filter((note) => !note.done);

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Private Notes</Text>
      <Text style={styles.subtitle}>Sa&apos;yo lang &apos;to. Hindi ito makikita ng manager.</Text>

      {notesQuery.isLoading ? (
        <ActivityIndicator color={colors.pineTeal} />
      ) : activeNotes.length > 0 ? (
        <View style={styles.notesList}>
          {activeNotes.map((note) => (
            <View key={note.id} style={styles.noteRow}>
              <Text style={styles.noteText}>{note.text}</Text>
              <Pressable
                onPress={() => promoteMutation.mutate(note)}
                disabled={promotingId === note.id}
                style={styles.promoteButton}
              >
                {promotingId === note.id ? (
                  <ActivityIndicator size="small" color={colors.pineTeal} />
                ) : (
                  <>
                    <Ionicons name="arrow-up-circle-outline" size={16} color={colors.pineTeal} />
                    <Text style={styles.promoteText}>Promote to Board</Text>
                  </>
                )}
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <TextField
        label="Bagong tala"
        placeholder="Isulat ang gustong tandaan..."
        value={draft}
        onChangeText={setDraft}
        multiline
      />

      <View style={styles.actionsRow}>
        <PrimaryButton
          label="Add Note"
          variant="secondary"
          style={styles.actionButton}
          loading={addTextMutation.isPending}
          disabled={draft.trim().length === 0}
          onPress={() => addTextMutation.mutate(draft.trim())}
        />

        <Pressable
          onPressIn={() => startRecording().catch(() => {})}
          onPressOut={handleReleaseRecord}
          style={[styles.recordButton, isRecording && styles.recordButtonActive]}
        >
          {addVoiceMutation.isPending ? (
            <ActivityIndicator color={colors.cardCream} />
          ) : (
            <Ionicons
              name={isRecording ? "mic" : "mic-outline"}
              size={22}
              color={colors.cardCream}
            />
          )}
        </Pressable>
      </View>
      <Text style={styles.recordHint}>Hawakan ang mic para mag-record ng voice note.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
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
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedInk,
  },
  notesList: {
    gap: 8,
  },
  noteRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 8,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  promoteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  promoteText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.pineTeal,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionButton: {
    flex: 1,
  },
  recordButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.pineTeal,
  },
  recordButtonActive: {
    backgroundColor: colors.terracottaGold,
  },
  recordHint: {
    fontSize: 11,
    color: colors.mutedInk,
    textAlign: "center",
  },
});

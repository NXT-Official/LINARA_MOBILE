import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/lib/theme";
import { combineLocalDateTime, toHm, toIsoDate } from "@/lib/datetime-fields";
import { DateTimeField } from "@/components/ui/date-time-field";
import { PrimaryButton } from "@/components/ui/primary-button";
import { TextField } from "@/components/ui/text-field";

export type TaskEdit = { scheduledStart: string; notes: string | null };

/**
 * "Ayusin ang oras o note" on her focus card (../LINARA/KNOWN_GAPS.md O31):
 * she can move her own task or fix its note herself instead of commenting and
 * waiting for a manager. Only those two -- the title and who it's for stay
 * the manager's, and the database holds her to that
 * (../LINARA/supabase/add-helper-task-edit.sql). A moved time is posted to
 * the task's updates so the manager sees it was her (today.tsx).
 */
export function EditTaskForm({
  scheduledStart,
  notes,
  saving,
  error,
  onSave,
  onCancel,
}: {
  scheduledStart: string;
  notes: string | null;
  saving: boolean;
  error: string | null;
  onSave: (edit: TaskEdit) => void;
  onCancel: () => void;
}) {
  const start = new Date(scheduledStart);
  const [day, setDay] = useState(toIsoDate(start));
  const [time, setTime] = useState(toHm(start));
  const [note, setNote] = useState(notes ?? "");

  const at = combineLocalDateTime(day, time);
  const nextNotes = note.trim() || null;
  const changed =
    at !== null && (at.getTime() !== start.getTime() || nextNotes !== (notes?.trim() || null));
  const laterDay = at !== null && toIsoDate(at) > toIsoDate(new Date());

  return (
    <View style={styles.form}>
      <Text style={styles.title}>Ayusin ang oras o note</Text>
      <View style={styles.row}>
        <DateTimeField
          label="Araw"
          mode="date"
          value={day}
          onChange={setDay}
          minimumIsoDate={toIsoDate(new Date())}
          containerStyle={styles.half}
        />
        <DateTimeField
          label="Oras"
          mode="time"
          value={time}
          onChange={setTime}
          containerStyle={styles.half}
        />
      </View>
      <TextField
        label="Note"
        value={note}
        onChangeText={setNote}
        placeholder="Hal. Gagawin pagkatapos mananghalian"
        maxLength={500}
        multiline
      />
      {laterDay ? (
        <Text style={styles.hint}>Mawawala ito sa Ngayon at lalabas sa Linggo ko.</Text>
      ) : null}
      <Text style={styles.hint}>Makikita ito ng manager.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton
        label="I-save"
        loading={saving}
        disabled={!changed}
        onPress={() => at && onSave({ scheduledStart: at.toISOString(), notes: nextNotes })}
      />
      <PrimaryButton label="Huwag na" variant="secondary" onPress={onCancel} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  half: {
    flex: 1,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedInk,
  },
  error: {
    fontSize: 13,
    color: colors.terracottaInk,
  },
});

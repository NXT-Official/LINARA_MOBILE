import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "@/lib/theme";
import { formatHoursMinutes } from "@/lib/format";
import { canCancelLeave, countLeaveDays, leaveDatesLabel } from "@/lib/leave";
import { DateTimeField } from "@/components/ui/date-time-field";
import { TextField } from "@/components/ui/text-field";
import { PrimaryButton } from "@/components/ui/primary-button";
import type { Leave, LeaveKind, LeaveReason, LeaveStatus, SilBalance } from "@/services/api/leave";

/** What she can ask for. An extra paid day is the household's to give, so it's recorded, not asked. */
const ASKABLE: { kind: LeaveKind; label: string; hint: string }[] = [
  { kind: "sil", label: "SIL", hint: "May bayad. 5 araw bawat taon ng serbisyo." },
  { kind: "in_kind", label: "Day off in kind", hint: "Bayad sa oras: galing sa rest owed mo." },
  { kind: "unpaid", label: "Walang bayad", hint: "Ibabawas sa sahod ng cutoff na iyon." },
];

const KIND_LABEL: Record<LeaveKind, string> = {
  sil: "SIL",
  in_kind: "Day off in kind",
  unpaid: "Walang bayad",
  extra_paid: "Dagdag na bayad na day off",
};

const REASONS: { reason: LeaveReason; label: string }[] = [
  { reason: "vacation", label: "Bakasyon" },
  { reason: "sick", label: "May sakit" },
  { reason: "family", label: "Pamilya" },
  { reason: "other", label: "Iba pa" },
];

const STATUS_LABEL: Record<LeaveStatus, string> = {
  pending: "Hinihintay",
  approved: "Aprubado",
  declined: "Hindi pumayag",
  cancelled: "Kanselado",
};

/**
 * Leave request card on My Pay: whole days off of three kinds, with what she
 * has left of each, and her recent leave. Leave a manager recorded for her
 * (she called in sick) asks her to confirm it here; a dispute flags it to the
 * manager without undoing it.
 *
 * Every check here is advisory. `request_leave` applies the balances,
 * overlaps and dates on the server and its refusal is shown as `error`.
 */
export function LeaveRequestForm({
  sil,
  restOwedMinutes,
  weeklyRestDay,
  leave,
  householdToday,
  submitting,
  error,
  onSubmit,
  onCancel,
  onAck,
  busyId,
}: {
  sil: SilBalance | undefined;
  restOwedMinutes: number;
  weeklyRestDay: number;
  leave: Leave[];
  /** The household's date from Postgres, never the phone's. */
  householdToday: string | undefined;
  submitting: boolean;
  /** The server's refusal of her last request, as it worded it. */
  error: string | null;
  onSubmit: (
    kind: LeaveKind,
    reason: LeaveReason,
    startDate: string,
    endDate: string,
    note?: string,
  ) => void;
  onCancel: (id: string) => void;
  onAck: (id: string, ack: "confirmed" | "disputed") => void;
  /** The row a cancel or answer is in flight for. */
  busyId: string | null;
}) {
  const [kind, setKind] = useState<LeaveKind>("sil");
  const [reason, setReason] = useState<LeaveReason>("vacation");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");

  const days = countLeaveDays(startDate, endDate || startDate, weeklyRestDay);
  const silLeft = sil?.days ?? 0;
  const tooMuch = kind === "sil" && days > silLeft;
  const canSubmit = days > 0 && !tooMuch && !submitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(kind, reason, startDate, endDate || startDate, note.trim() || undefined);
    setStartDate("");
    setEndDate("");
    setNote("");
  };

  const toConfirm = leave.filter((l) => l.helperAck === "pending");
  const recent = leave.filter((l) => l.helperAck !== "pending").slice(0, 4);

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Humiling ng leave</Text>
      <Text style={styles.hint}>
        {sil?.yearEnd
          ? `SIL: ${silLeft} araw pa hanggang ${leaveDatesLabel(sil.yearEnd, sil.yearEnd)}.`
          : sil?.eligibleFrom
            ? `Ang SIL mo ay magsisimula sa ${leaveDatesLabel(sil.eligibleFrom, sil.eligibleFrom)}.`
            : "Ang SIL ay pagkatapos ng isang taon ng serbisyo."}{" "}
        Rest owed: {formatHoursMinutes(restOwedMinutes)}.
      </Text>

      {toConfirm.map((l) => (
        <View key={l.id} style={styles.confirm}>
          <Text style={styles.confirmTitle}>
            Itinala ng manager: {KIND_LABEL[l.kind]}, {leaveDatesLabel(l.startDate, l.endDate)} (
            {l.days} araw). Tama ba?
          </Text>
          <View style={styles.chips}>
            <PrimaryButton
              label="Tama"
              onPress={() => onAck(l.id, "confirmed")}
              loading={busyId === l.id}
            />
            <PrimaryButton
              label="Hindi tama"
              variant="secondary"
              onPress={() => onAck(l.id, "disputed")}
              disabled={busyId === l.id}
            />
          </View>
        </View>
      ))}

      <View style={styles.chips} accessibilityRole="radiogroup">
        {ASKABLE.map((a) => (
          <Chip
            key={a.kind}
            label={a.label}
            selected={kind === a.kind}
            onPress={() => setKind(a.kind)}
          />
        ))}
      </View>
      <Text style={styles.hint}>{ASKABLE.find((a) => a.kind === kind)?.hint}</Text>

      <View style={styles.chips} accessibilityRole="radiogroup">
        {REASONS.map((r) => (
          <Chip
            key={r.reason}
            label={r.label}
            selected={reason === r.reason}
            onPress={() => setReason(r.reason)}
          />
        ))}
      </View>

      <DateTimeField
        label="Unang araw"
        mode="date"
        value={startDate}
        onChange={(v) => {
          setStartDate(v);
          if (endDate && endDate < v) setEndDate(v);
        }}
        placeholder="Pumili ng petsa"
        minimumIsoDate={householdToday}
      />
      <DateTimeField
        label="Huling araw"
        mode="date"
        value={endDate}
        onChange={setEndDate}
        placeholder="Kung isang araw lang, iwanang blangko"
        minimumIsoDate={startDate || householdToday}
      />
      <TextField
        label="Note (optional)"
        value={note}
        onChangeText={setNote}
        placeholder="Piyesta"
      />

      {startDate ? (
        <Text style={styles.preview}>
          {days === 0
            ? "Rest day mo lahat ng araw na iyon."
            : `${days} araw${tooMuch ? ` — ${silLeft} na lang ang SIL mo.` : ""}`}
        </Text>
      ) : null}
      {error ? <Text style={styles.warning}>{error}</Text> : null}

      <PrimaryButton
        label={submitting ? "Sinesend..." : "Ipadala sa manager"}
        onPress={handleSubmit}
        disabled={!canSubmit}
      />

      {recent.length > 0 && (
        <View style={styles.list}>
          {recent.map((l) => (
            <View key={l.id} style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowTitle}>
                  {KIND_LABEL[l.kind]} · {leaveDatesLabel(l.startDate, l.endDate)} · {l.days} araw
                </Text>
                {l.declineReason ? <Text style={styles.rowMeta}>{l.declineReason}</Text> : null}
                {l.helperAck === "disputed" ? (
                  <Text style={styles.rowMeta}>Sinabi mong hindi ito tama.</Text>
                ) : null}
              </View>
              {canCancelLeave(l, householdToday) ? (
                <Pressable
                  onPress={() => onCancel(l.id)}
                  disabled={busyId === l.id}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Kanselahin ang leave sa ${leaveDatesLabel(l.startDate, l.endDate)}`}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelText}>{busyId === l.id ? "…" : "Kanselahin"}</Text>
                </Pressable>
              ) : (
                <Text style={styles.status}>{STATUS_LABEL[l.status]}</Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: colors.cardCream,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.terracottaGold,
  },
  hint: {
    fontSize: 12,
    color: colors.mutedInk,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.sand,
    justifyContent: "center",
  },
  chipSelected: {
    backgroundColor: colors.pineTeal,
    borderColor: colors.pineTeal,
  },
  chipText: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
  chipTextSelected: {
    color: colors.cardCream,
  },
  confirm: {
    gap: 8,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.terracottaWash,
  },
  confirmTitle: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
  preview: {
    fontSize: 12,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
  warning: {
    fontSize: 12,
    fontFamily: fonts.bodyBold,
    color: colors.terracottaInk,
  },
  list: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rowLeft: {
    flexShrink: 1,
  },
  rowTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.ink,
  },
  rowMeta: {
    fontSize: 11,
    color: colors.mutedInk,
  },
  status: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    color: colors.mutedInk,
  },
  cancelButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.mutedInk,
  },
  cancelText: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    color: colors.mutedInk,
  },
});

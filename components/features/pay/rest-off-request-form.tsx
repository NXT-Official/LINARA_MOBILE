import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "@/lib/theme";
import { formatHoursMinutes } from "@/lib/format";
import { TextField } from "@/components/ui/text-field";
import { PrimaryButton } from "@/components/ui/primary-button";
import type { RestOffRequest, RestOffStatus } from "@/services/api/rest-off";

const STATUS_LABEL: Record<RestOffStatus, string> = {
  pending: "Hinihintay",
  approved: "Aprubado",
  declined: "Hindi pumayag",
  cancelled: "Kanselado",
};

const STATUS_COLOR: Record<RestOffStatus, string> = {
  pending: colors.terracottaGold,
  approved: colors.pineTeal,
  declined: colors.mutedInk,
  cancelled: colors.mutedInk,
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Rest-off request form -- how accrued rest owed actually gets taken.
 * After-hours work is balanced by time off in lieu, not paid as overtime
 * (decision 2026-08-16), so this is the redemption half of the Rest Owed
 * counter above it: pick a date and a range, the manager approves, and the
 * minutes come off the balance.
 *
 * Validation here is advisory only -- `request_rest_off` re-checks the balance
 * server-side and is the real authority, since minutes can be spent by an
 * approval between this screen loading and the request landing.
 */
export function RestOffRequestForm({
  balanceMinutes,
  requests,
  onSubmit,
  submitting,
  onCancel,
  cancellingId,
  /** The household's civil date from Postgres, "YYYY-MM-DD". Optional so the
   *  form still works while it loads -- absent, the past-date hint is simply
   *  not shown and the server remains the authority either way. */
  householdToday,
}: {
  balanceMinutes: number;
  requests: RestOffRequest[];
  onSubmit: (restDate: string, startTime: string, endTime: string, note?: string) => void;
  submitting: boolean;
  onCancel?: (requestId: string) => void;
  cancellingId?: string | null;
  householdToday?: string;
}) {
  const [restDate, setRestDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [note, setNote] = useState("");

  const validShape =
    DATE_RE.test(restDate.trim()) && TIME_RE.test(startTime.trim()) && TIME_RE.test(endTime.trim());

  const minutesAsked = validShape
    ? (() => {
        const [sh, sm] = startTime.trim().split(":").map(Number);
        const [eh, em] = endTime.trim().split(":").map(Number);
        return eh * 60 + em - (sh * 60 + sm);
      })()
    : 0;

  const pendingMinutes = requests
    .filter((r) => r.status === "pending")
    .reduce((sum, r) => sum + r.minutes, 0);
  const uncommitted = balanceMinutes - pendingMinutes;

  // Advisory only, like the balance check above it: the authority is
  // `request_rest_off`, which compares against household_today() on the
  // Postgres clock (../LINARA/supabase/add-rest-off-validation.sql). Comparing
  // ISO date strings is safe -- both are YYYY-MM-DD in the household's zone, so
  // this never parses a Date and never touches the device's timezone, which is
  // the mistake C38 was about.
  const isPastDate = Boolean(
    householdToday && DATE_RE.test(restDate.trim()) && restDate.trim() < householdToday,
  );

  // Overlap is deliberately NOT checked here. It would need every existing
  // window for that date, and a stale client list refusing a legitimate request
  // is worse than the server refusing an illegitimate one with a clear message.
  const canSubmit =
    validShape && minutesAsked > 0 && minutesAsked <= uncommitted && !isPastDate && !submitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(restDate.trim(), startTime.trim(), endTime.trim(), note.trim() || undefined);
    setRestDate("");
    setStartTime("");
    setEndTime("");
    setNote("");
  };

  const recent = requests.slice(0, 4);

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Humiling ng day off</Text>
      <Text style={styles.hint}>
        {formatHoursMinutes(uncommitted)} ang pwede mong hilingin
        {pendingMinutes > 0 ? ` (${formatHoursMinutes(pendingMinutes)} naghihintay)` : ""}.
      </Text>
      {isPastDate ? (
        <Text style={styles.warning}>
          Lumipas na ang petsang iyon{householdToday ? ` (ngayon: ${householdToday})` : ""}.
        </Text>
      ) : null}

      <TextField
        label="Petsa (YYYY-MM-DD)"
        value={restDate}
        onChangeText={setRestDate}
        placeholder="2026-08-20"
      />
      <TextField
        label="Simula (HH:MM)"
        value={startTime}
        onChangeText={setStartTime}
        placeholder="09:00"
      />
      <TextField
        label="Katapusan (HH:MM)"
        value={endTime}
        onChangeText={setEndTime}
        placeholder="13:00"
      />
      <TextField
        label="Dahilan (optional)"
        value={note}
        onChangeText={setNote}
        placeholder="Doktor"
      />

      {validShape && minutesAsked > 0 && (
        <Text style={styles.preview}>
          {formatHoursMinutes(minutesAsked)}
          {minutesAsked > uncommitted ? " — sobra sa natitira mong oras." : ""}
        </Text>
      )}

      <PrimaryButton
        label={submitting ? "Sinesend..." : "Ipadala sa manager"}
        onPress={handleSubmit}
        disabled={!canSubmit}
      />

      {recent.length > 0 && (
        <View style={styles.list}>
          {recent.map((r) => (
            <View key={r.id} style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowTitle}>
                  {r.restDate} · {formatHoursMinutes(r.minutes)}
                </Text>
                {r.declineReason ? (
                  <Text style={styles.rowMeta}>{r.declineReason}</Text>
                ) : r.note ? (
                  <Text style={styles.rowMeta}>{r.note}</Text>
                ) : null}
              </View>
              {/* Cancel is offered on PENDING rows only. An approved request has
                  already debited the balance and a day may have been arranged
                  around it -- that is a conversation with the manager, not a
                  button, and the RPC refuses it anyway. */}
              {r.status === "pending" && onCancel ? (
                <Pressable
                  onPress={() => onCancel(r.id)}
                  disabled={cancellingId === r.id}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Kanselahin ang request para sa ${r.restDate}`}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelText}>
                    {cancellingId === r.id ? "…" : "Kanselahin"}
                  </Text>
                </Pressable>
              ) : (
                <Text style={[styles.status, { color: STATUS_COLOR[r.status] }]}>
                  {STATUS_LABEL[r.status]}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
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
  preview: {
    fontSize: 12,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
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
  },
  warning: {
    fontSize: 12,
    fontFamily: fonts.bodyBold,
    color: colors.terracottaGold,
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

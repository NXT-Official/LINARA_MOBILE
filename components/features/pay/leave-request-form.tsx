import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { colors, fonts } from "@/lib/theme";
import { formatHoursMinutes } from "@/lib/format";
import {
  canCancelLeave,
  countLeaveDays,
  leaveBlockReason,
  leaveDatesLabel,
  requestsToList,
} from "@/lib/leave";
import { DateTimeField } from "@/components/ui/date-time-field";
import { TextField } from "@/components/ui/text-field";
import { PrimaryButton } from "@/components/ui/primary-button";
import type { Leave, LeaveKind, LeaveReason, LeaveStatus, SilBalance } from "@/services/api/leave";

import { RequestDisclosure } from "./request-disclosure";
import { Text } from "@/components/ui/text";
import { useT } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/instance";

/** What she can ask for. An extra paid day is the household's to give, so it's recorded, not asked. */
const ASKABLE: { kind: LeaveKind; label: MessageKey; hint: MessageKey }[] = [
  { kind: "sil", label: "leaveKind.sil", hint: "leaveKind.silHint" },
  {
    kind: "in_kind",
    label: "leaveKind.inKind",
    hint: "leaveKind.inKindHint",
  },
  { kind: "unpaid", label: "leaveKind.unpaid", hint: "leaveKind.unpaidHint" },
];

const KIND_LABEL: Record<LeaveKind, MessageKey> = {
  sil: "leaveKind.sil",
  in_kind: "leaveKind.inKind",
  unpaid: "leaveKind.unpaid",
  extra_paid: "leaveKind.extraPaid",
};

const REASONS: { reason: LeaveReason; label: MessageKey }[] = [
  { reason: "vacation", label: "leaveReason.vacation" },
  { reason: "sick", label: "leaveReason.sick" },
  { reason: "family", label: "leaveReason.family" },
  { reason: "other", label: "leaveReason.other" },
];

const STATUS_LABEL: Record<LeaveStatus, MessageKey> = {
  pending: "request.pending",
  approved: "request.approved",
  declined: "request.declined",
  cancelled: "request.cancelled",
};

/**
 * Leave request card on My Pay: whole days off of three kinds, with what she
 * has left of each, and her recent leave. Leave a manager recorded for her
 * (she called in sick) asks her to confirm it here; a dispute flags it to the
 * manager without undoing it.
 *
 * Every check here is advisory. `request_leave` applies the balances,
 * overlaps and dates on the server. A refused request keeps what she filled
 * in and shows why in the form; a refused cancel or answer is `error`.
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
  /** Why her last cancel or answer didn't go through, in Taglish. */
  error: string | null;
  onSubmit: (
    kind: LeaveKind,
    reason: LeaveReason,
    startDate: string,
    endDate: string,
    note?: string,
  ) => Promise<unknown>;
  onCancel: (id: string) => void;
  onAck: (id: string, ack: "confirmed" | "disputed") => void;
  /** The row a cancel or answer is in flight for. */
  busyId: string | null;
}) {
  const t = useT();
  const [pickedKind, setKind] = useState<LeaveKind | null>(null);
  const [reason, setReason] = useState<LeaveReason>("vacation");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const days = countLeaveDays(startDate, endDate || startDate, weeklyRestDay);
  const silLeft = sil?.days ?? 0;
  // SIL is the default only when she has some; otherwise she picks, so an
  // unpaid day is never one she didn't choose (../LINARA/KNOWN_GAPS.md O55).
  const kind = pickedKind ?? (silLeft > 0 ? "sil" : null);
  const blocked = leaveBlockReason(kind, days, silLeft, restOwedMinutes);
  const canSubmit = kind !== null && days > 0 && blocked === null && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || kind === null) return;
    setSendError(null);
    try {
      await onSubmit(kind, reason, startDate, endDate || startDate, note.trim() || undefined);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : String(e));
      return;
    }
    setStartDate("");
    setEndDate("");
    setNote("");
    setOpen(false);
  };

  const toConfirm = leave.filter((l) => l.helperAck === "pending");
  const recent = requestsToList(leave.filter((l) => l.helperAck !== "pending"));

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle} accessibilityRole="header">
        {t("pay.mgaLeave")}
      </Text>
      <Text style={styles.hint}>
        {sil?.yearEnd
          ? t("pay.silLeft", {
              days: silLeft,
              count: silLeft,
              date: leaveDatesLabel(sil.yearEnd, sil.yearEnd),
            })
          : sil?.eligibleFrom
            ? t("pay.silStarts", { date: leaveDatesLabel(sil.eligibleFrom, sil.eligibleFrom) })
            : t("pay.angSilAyPagkataposNg")}{" "}
        {t("pay.restOwedLine", { time: formatHoursMinutes(restOwedMinutes) })}
      </Text>

      {toConfirm.map((l) => (
        <View key={l.id} style={styles.confirm}>
          <Text style={styles.confirmTitle}>
            {t("pay.managerRecorded", {
              kind: t(KIND_LABEL[l.kind]),
              dates: leaveDatesLabel(l.startDate, l.endDate),
              days: l.days,
              count: l.days,
            })}
          </Text>
          <View style={styles.chips}>
            <PrimaryButton
              label={t("pay.tama")}
              onPress={() => onAck(l.id, "confirmed")}
              loading={busyId === l.id}
            />
            <PrimaryButton
              label={t("pay.hindiTama")}
              variant="secondary"
              onPress={() => onAck(l.id, "disputed")}
              disabled={busyId === l.id}
            />
          </View>
        </View>
      ))}

      {recent.length > 0 && (
        <View style={styles.list}>
          {recent.map((l) => (
            <View key={l.id} style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowTitle}>
                  {t("pay.leaveRow", {
                    kind: t(KIND_LABEL[l.kind]),
                    dates: leaveDatesLabel(l.startDate, l.endDate),
                    days: l.days,
                    count: l.days,
                  })}
                </Text>
                {l.declineReason ? <Text style={styles.rowMeta}>{l.declineReason}</Text> : null}
                {l.helperAck === "disputed" ? (
                  <Text style={styles.rowMeta}>{t("pay.sinabiMongHindiItoTama")}</Text>
                ) : null}
              </View>
              {canCancelLeave(l, householdToday) ? (
                <Pressable
                  onPress={() => onCancel(l.id)}
                  disabled={busyId === l.id}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t("pay.kanselahinAngLeaveSa", {
                    v1: leaveDatesLabel(l.startDate, l.endDate),
                  })}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelText}>
                    {busyId === l.id ? "…" : t("pay.kanselahin")}
                  </Text>
                </Pressable>
              ) : (
                <Text style={styles.status}>{t(STATUS_LABEL[l.status])}</Text>
              )}
            </View>
          ))}
        </View>
      )}
      {error ? <Text style={styles.warning}>{error}</Text> : null}
      <RequestDisclosure open={open} onOpenChange={setOpen} openLabel={t("pay.humilingNgLeave")}>
        {/* Labelled like the fields below, so a missing pick has a name (QA F-LM-007). */}
        <Text style={styles.fieldLabel}>{t("pay.paanoBabayaran")}</Text>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {ASKABLE.map((a) => (
            <Chip
              key={a.kind}
              label={t(a.label)}
              selected={kind === a.kind}
              onPress={() => setKind(a.kind)}
            />
          ))}
        </View>
        <Text style={styles.hint}>
          {t(ASKABLE.find((a) => a.kind === kind)?.hint ?? "pay.pumiliKungPaanoBabayaranAng")}
        </Text>
        {kind === "in_kind" && blocked ? <Text style={styles.warning}>{blocked}</Text> : null}

        <Text style={styles.fieldLabel}>{t("pay.dahilan")}</Text>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {REASONS.map((r) => (
            <Chip
              key={r.reason}
              label={t(r.label)}
              selected={reason === r.reason}
              onPress={() => setReason(r.reason)}
            />
          ))}
        </View>

        <DateTimeField
          label={t("pay.unangAraw")}
          mode="date"
          value={startDate}
          onChange={(v) => {
            setStartDate(v);
            if (endDate && endDate < v) setEndDate(v);
          }}
          placeholder={t("pay.pumiliNgPetsa")}
          minimumIsoDate={householdToday}
        />
        <DateTimeField
          label={t("pay.hulingAraw")}
          mode="date"
          value={endDate}
          onChange={setEndDate}
          placeholder={t("pay.kungIsangArawLangIwanang")}
          minimumIsoDate={startDate || householdToday}
        />
        <TextField
          label={t("pay.talaKungMeron")}
          value={note}
          onChangeText={setNote}
          placeholder={t("pay.piyesta")}
        />

        {startDate ? (
          <Text style={styles.preview}>
            {days === 0
              ? t("pay.restDayMoLahatNg")
              : `${days} araw${kind === "sil" && blocked ? `. ${blocked}` : ""}`}
          </Text>
        ) : null}

        {kind === null && days > 0 ? (
          <Text style={styles.warning}>{t("pay.pumiliMunaSaPaanoBabayaran")}</Text>
        ) : null}
        {sendError ? <Text style={styles.warning}>{sendError}</Text> : null}
        <PrimaryButton
          label={submitting ? t("pay.sinesend") : t("pay.ipadalaSaManager")}
          onPress={handleSubmit}
          disabled={!canSubmit}
        />
      </RequestDisclosure>
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
      hitSlop={4}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
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
  // The card's own title, like the rest of the app's cards (was a small
  // coloured label above nothing: an eyebrow, audit 2026-10-29).
  cardTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.ink,
  },
  hint: {
    fontSize: 13,
    color: colors.mutedInk,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
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
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
  warning: {
    fontSize: 13,
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
    fontSize: 13,
    color: colors.mutedInk,
  },
  status: {
    fontSize: 13,
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
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.mutedInk,
  },
});

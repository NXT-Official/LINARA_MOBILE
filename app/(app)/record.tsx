import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { colors, fonts } from "@/lib/theme";
import { formatHoursMinutes, formatPeso, formatShiftTime } from "@/lib/format";
import {
  leaveDaysLabel,
  recordShareText,
  restTakenMinutes,
  summarizeLeave,
  summarizePay,
} from "@/lib/record";
import { useSession } from "@/lib/session-context";
import { toIsoDate } from "@/lib/datetime-fields";
import { DAY_NAMES } from "@/lib/week";
import { getMyEmployments, type Employment } from "@/services/api/employment";
import { getMyLeave } from "@/services/api/leave";
import { giveNotice, withdrawNotice } from "@/services/api/pay-periods";
import { getMyPayslips } from "@/services/api/payslips";
import { getMyRestOffRequests } from "@/services/api/rest-off";
import {
  flagMyTerms,
  getMyTasksDone,
  getMyTermsOnFile,
  type TermsFlagField,
} from "@/services/api/record";
import { getMyCoveredTeams, getMyWorkplaces } from "@/services/api/workplaces";
import { loadRecordPdfInput, shareRecordPdf } from "@/services/record-export";
import { PrivacyAccountCard } from "@/components/features/account/privacy-account-card";
import { SignOutButton } from "@/components/features/account/sign-out-button";
import { PaymentConfirmations } from "@/components/features/pay/payment-confirmations";
import { DateTimeField } from "@/components/ui/date-time-field";
import { PrimaryButton } from "@/components/ui/primary-button";
import { TextField } from "@/components/ui/text-field";

const FLAG_FIELDS: { value: TermsFlagField; label: string }[] = [
  { value: "wage", label: "Sahod" },
  { value: "shift", label: "Oras ng shift" },
  { value: "restDay", label: "Rest day" },
  { value: "station", label: "Trabaho" },
  { value: "employment", label: "Stay-in / stay-out" },
  { value: "other", label: "Iba pa" },
];

const INVITE_CODE_LENGTH = 6;

const shortDate = (d: Date) =>
  d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
/** A "YYYY-MM-DD" column as that calendar day on the phone. */
const calendarDate = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
};
/** A timestamp, or a "YYYY-MM-DD" date read as that calendar day on the phone. */
const asDay = (value: string) => (value.length === 10 ? calendarDate(value) : new Date(value));
const longDate = (value: string) =>
  asDay(value).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });

/**
 * My Record (concept doc §6, "the line that flips the app"): the terms the
 * household has on file, her work and pay in plain numbers, and a way to share
 * it. The test the concept sets: would she open this on her day off?
 *
 * It covers every household she has worked for (../LINARA/KNOWN_GAPS.md O4).
 * The current one gets the full view, with the flag and the PDF. Households
 * she has left keep a PDF each, read from the records they kept. Between
 * households this is the only tab that opens, and it's where she joins the
 * next one with an invite code.
 */
export default function RecordScreen() {
  const { session } = useSession();
  const employmentsQuery = useQuery({
    queryKey: ["my-employments", session?.user.id],
    queryFn: getMyEmployments,
    enabled: Boolean(session),
  });
  const employments = employmentsQuery.data ?? [];
  const current = employments.find((e) => e.status === "ACTIVE") ?? null;
  const past = employments.filter((e) => e.status === "INACTIVE");

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.header}>Record ko</Text>
      <Text style={styles.sub}>
        {current
          ? "Ang trabaho at sahod mo, sa iisang lugar."
          : "Nandito pa rin ang record mo, kahit wala kang household ngayon."}
      </Text>

      {employmentsQuery.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.pineTeal} />
        </View>
      ) : employmentsQuery.isError && !employmentsQuery.data ? (
        <Text style={styles.errorText}>Hindi ma-load ang record mo. Subukan ulit mamaya.</Text>
      ) : (
        <>
          {/* A failed refresh over the copy kept on the phone (lib/query-persist.ts). */}
          {employmentsQuery.isError ? (
            <Text style={styles.savedNote}>
              Walang internet. Ito ang record mo noong{" "}
              {shortDate(new Date(employmentsQuery.dataUpdatedAt))}.
            </Text>
          ) : null}
          <PaymentConfirmations />
          {current ? <CurrentRecord employment={current} /> : <JoinHouseholdCard />}
          {past.length > 0 ? <PastEmployments past={past} /> : null}
          <PrivacyAccountCard employed={current !== null} />
        </>
      )}
      {/* Here as well as My Pay: My Record is the one tab that always opens,
          even with no household, so she can always sign out. */}
      {employmentsQuery.isLoading ? null : <SignOutButton />}
    </ScrollView>
  );
}

/** No current household: how she gets her next one. */
function JoinHouseholdCard() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== INVITE_CODE_LENGTH) {
      setError(`Kailangan ${INVITE_CODE_LENGTH} characters ang invite code, po.`);
      return;
    }
    setError(null);
    router.push({ pathname: "/(auth)/review-terms", params: { code: trimmed } });
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Wala kang household ngayon</Text>
      <Text style={styles.cardSub}>
        Kapag may bago kang employer, i-enter ang invite code na ibibigay nila. Makikita mo muna ang
        terms bago ka sumali. Bubukas ulit ang Ngayon, Linggo ko, Pantry at Sahod ko pagkasali mo.
      </Text>
      <TextField
        label="Invite code"
        value={code}
        onChangeText={(text) => {
          setCode(text.toUpperCase());
          setError(null);
        }}
        error={error}
        hint="6 na letra at numero"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={INVITE_CODE_LENGTH}
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <PrimaryButton label="Tingnan ang terms" onPress={submit} disabled={!code.trim()} />
    </View>
  );
}

/** Households she has left, each with the record they kept, as a PDF. */
function PastEmployments({ past }: { past: Employment[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);

  const download = async (employment: Employment) => {
    setBusyId(employment.helperId);
    setFailedId(null);
    try {
      await shareRecordPdf(await loadRecordPdfInput(employment));
    } catch {
      setFailedId(employment.helperId);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Mga dating trabaho</Text>
      <Text style={styles.cardSub}>
        Ang record na itinago ng bawat household. Hindi na ito nagbabago.
      </Text>
      {past.map((e) => (
        <View key={e.helperId} style={styles.pastItem}>
          <Text style={styles.pastTitle}>{e.householdName ?? "Household"}</Text>
          <Text style={styles.pastMeta}>
            {e.station} · {shortDate(asDay(e.startedAt))} –{" "}
            {e.endedOn ? shortDate(calendarDate(e.endedOn)) : "—"}
          </Text>
          <PrimaryButton
            label="I-download ang record (PDF)"
            variant="secondary"
            loading={busyId === e.helperId}
            disabled={busyId !== null && busyId !== e.helperId}
            onPress={() => void download(e)}
          />
          {failedId === e.helperId ? (
            <Text style={styles.error}>Hindi nagawa ang PDF. Subukan ulit.</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const LEAVE_NAMES = {
  sil: "SIL",
  extra_paid: "dagdag na may bayad",
  in_kind: "day off in kind",
  unpaid: "walang bayad",
} as const;

/** Her current household: terms on file (with the flag), work and pay, and sharing. */
function CurrentRecord({ employment }: { employment: Employment }) {
  const helperId = employment.helperId;

  const termsQuery = useQuery({
    queryKey: ["terms-on-file", helperId],
    queryFn: () => getMyTermsOnFile(helperId),
  });
  // Every house she works in (LINARA add-shared-staff-and-places.sql), and
  // teams she also covers. Empty before that SQL: the single Team row stays.
  const workplacesQuery = useQuery({ queryKey: ["my-workplaces"], queryFn: getMyWorkplaces });
  const coversQuery = useQuery({ queryKey: ["my-covered-teams"], queryFn: getMyCoveredTeams });
  const workplaces = workplacesQuery.data ?? [];
  const payslipsQuery = useQuery({
    queryKey: ["payslips", helperId],
    queryFn: () => getMyPayslips(helperId),
  });
  const restQuery = useQuery({
    queryKey: ["rest-off-requests", helperId],
    queryFn: () => getMyRestOffRequests(helperId),
  });
  const doneQuery = useQuery({
    queryKey: ["tasks-done", helperId],
    queryFn: () => getMyTasksDone(helperId),
  });
  // Same key as My Pay's, so asking for leave there updates this.
  const leaveQuery = useQuery({
    queryKey: ["leave", helperId],
    queryFn: () => getMyLeave(helperId),
  });

  const [flagging, setFlagging] = useState(false);
  const [field, setField] = useState<TermsFlagField>("wage");
  const [note, setNote] = useState("");
  const flagMutation = useMutation({
    mutationFn: () => flagMyTerms(helperId, field, note.trim()),
    onSuccess: () => {
      setFlagging(false);
      setNote("");
    },
  });

  const terms = termsQuery.data;
  const loading = termsQuery.isLoading || payslipsQuery.isLoading || doneQuery.isLoading;
  const pay = summarizePay(payslipsQuery.data ?? []);
  const restTaken = restTakenMinutes(restQuery.data ?? []);
  const leave = leaveQuery.data ?? [];
  const leaveByYear = summarizeLeave(leave);

  const pdfMutation = useMutation({
    mutationFn: async () => {
      if (!terms) return;
      await shareRecordPdf({
        name: employment.name,
        householdName: employment.householdName,
        ...terms,
        tasksDone: doneQuery.data ?? 0,
        pay,
        restTaken,
        payslips: payslipsQuery.data ?? [],
        restOff: restQuery.data ?? [],
        leave,
        generatedAt: new Date(),
      });
    },
  });

  const share = () => {
    if (!terms) return;
    void Share.share({
      message: recordShareText({
        name: employment.name,
        station: terms.station,
        employment: terms.employment,
        recordSince: terms.recordSince,
        tasksDone: doneQuery.data ?? 0,
        pay,
        restTaken,
        leave,
      }),
    });
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.pineTeal} />
      </View>
    );
  }
  if (!terms) {
    return <Text style={styles.errorText}>Hindi ma-load ang record mo. Subukan ulit mamaya.</Text>;
  }

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mga kondisyon na naka-file</Text>
        <Text style={styles.cardSub}>
          Ito ang record ng household tungkol sa trabaho mo. Parehong numero ang nakikita nila.
        </Text>
        <Row label="Trabaho" value={terms.station} />
        {workplaces.length > 1 ? (
          <Row
            label="Mga bahay"
            value={workplaces
              .map((w) => (w.isHome ? `${w.name} (dito ka naka-employ)` : w.name))
              .join(", ")}
          />
        ) : null}
        {workplaces.some((w) => w.teamName) ? (
          <Row
            label="Team"
            value={workplaces
              .filter((w) => w.teamName)
              .map((w) => (workplaces.length > 1 ? `${w.teamName} (${w.name})` : w.teamName))
              .join(", ")}
          />
        ) : terms.team ? (
          <Row label="Team" value={terms.team} />
        ) : null}
        {(coversQuery.data ?? []).length > 0 ? (
          <Row label="Tumutulong din sa" value={(coversQuery.data ?? []).join(", ")} />
        ) : null}
        {terms.labels.length > 0 ? <Row label="Mga label" value={terms.labels.join(", ")} /> : null}
        <Row
          label="Tirahan"
          value={
            terms.employment === "live-in"
              ? "Stay-in"
              : terms.employment === "live-out"
                ? "Stay-out"
                : "Hindi nakalagay"
          }
        />
        <Row
          label="Shift"
          value={`${formatShiftTime(terms.shiftStart)} – ${formatShiftTime(terms.shiftEnd)}`}
        />
        {terms.breakStart && terms.breakEnd ? (
          <Row
            label="Break"
            value={`${formatShiftTime(terms.breakStart)} – ${formatShiftTime(terms.breakEnd)}`}
          />
        ) : null}
        <Row label="Rest day" value={DAY_NAMES[terms.weeklyRestDay] ?? "—"} />
        <Row label="Sahod kada buwan" value={formatPeso(terms.monthlyRate)} />
        <Row
          label="Sweldo"
          value={
            terms.paydayInterval === "semi_monthly"
              ? "Dalawang beses kada buwan"
              : "Isang beses kada buwan"
          }
        />

        {flagMutation.isSuccess && !flagging ? (
          <Text style={styles.sent}>Naipadala. Makikita ito ng manager sa Pass nila.</Text>
        ) : null}

        {flagging ? (
          <View style={styles.flagForm}>
            <Text style={styles.flagTitle}>Alin ang mali?</Text>
            <View style={styles.chips}>
              {FLAG_FIELDS.map((f) => {
                const selected = f.value === field;
                return (
                  <Pressable
                    key={f.value}
                    onPress={() => setField(f.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextField
              label="Ano ang tama? (optional)"
              value={note}
              onChangeText={setNote}
              placeholder="Hal. ₱9,000 ang napag-usapan"
              maxLength={300}
              multiline
            />
            {flagMutation.isError ? (
              <Text style={styles.error}>Hindi naipadala. Subukan ulit.</Text>
            ) : null}
            <PrimaryButton
              label="Ipadala sa manager"
              loading={flagMutation.isPending}
              onPress={() => flagMutation.mutate()}
            />
            <PrimaryButton
              label="Huwag na"
              variant="secondary"
              onPress={() => setFlagging(false)}
            />
          </View>
        ) : (
          <Pressable
            onPress={() => {
              flagMutation.reset();
              setFlagging(true);
            }}
            accessibilityRole="button"
            style={styles.link}
          >
            <Text style={styles.linkText}>May mali? Sabihin sa manager</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Trabaho at sahod</Text>
        <Row label="Nasa record mula" value={longDate(terms.recordSince)} />
        <Row label="Mga natapos na task" value={String(doneQuery.data ?? 0)} />
        <Row
          label="Sahod na natanggap"
          value={`${pay.paidCount} payslip · ${formatPeso(pay.paidTotal)}`}
        />
        {pay.lastPaidAt ? <Row label="Huling sahod" value={longDate(pay.lastPaidAt)} /> : null}
        <Row
          label="Kinaltas para sa SSS, PhilHealth, Pag-IBIG"
          value={formatPeso(pay.deductedStatutory)}
        />
        <Row label="Rest na nakuha" value={formatHoursMinutes(restTaken)} />
        {leaveByYear.length === 0 ? (
          <Row label="Leave na nakuha" value="Wala pa" />
        ) : (
          leaveByYear.map((y) => (
            <Row
              key={y.year}
              label={`Leave na nakuha (${y.year})`}
              value={leaveDaysLabel(y.days, LEAVE_NAMES, (n) => `${n} araw`)}
            />
          ))
        )}
      </View>

      <PrimaryButton
        label="I-download ang record ko (PDF)"
        loading={pdfMutation.isPending}
        onPress={() => pdfMutation.mutate()}
      />
      {pdfMutation.isError ? (
        <Text style={styles.error}>Hindi nagawa ang PDF. Subukan ulit.</Text>
      ) : null}
      <PrimaryButton label="Ibahagi bilang text" variant="secondary" onPress={share} />
      <Text style={styles.footnote}>
        Para sa loan, visa, o susunod na trabaho. Nasa phone mo ang PDF at kung saan mo ito i-save,
        kahit umalis ka sa household na ito. Galing ang lahat ng ito sa record ng household sa
        Linara.
      </Text>
      <NoticeCard
        helperId={helperId}
        noticeLastDay={terms.noticeLastDay}
        noticeNote={terms.noticeNote}
      />
    </>
  );
}

/**
 * Her side of leaving: she tells the household her last day from here. The
 * manager then ends the employment on that day, which settles her final pay
 * and her open tasks; until then she can take the notice back.
 */
function NoticeCard({
  helperId,
  noticeLastDay,
  noticeNote,
}: {
  helperId: string;
  noticeLastDay: string | null;
  noticeNote: string | null;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [lastDay, setLastDay] = useState("");
  const [note, setNote] = useState("");
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["terms-on-file", helperId] });

  const give = useMutation({
    mutationFn: () => giveNotice(helperId, lastDay, note),
    onSuccess: async () => {
      setOpen(false);
      setNote("");
      await refresh();
    },
  });
  const withdraw = useMutation({
    mutationFn: () => withdrawNotice(helperId),
    onSuccess: refresh,
  });

  if (noticeLastDay) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Nagbigay ka ng abiso</Text>
        <Text style={styles.cardSub}>
          Huling araw mo: {longDate(noticeLastDay)}. Nakikita na ito ng manager mo. Sila ang
          magtatapos ng employment, at doon aayusin ang huling sahod mo.
        </Text>
        {noticeNote ? <Text style={styles.cardSub}>“{noticeNote}”</Text> : null}
        <PrimaryButton
          label="Bawiin ang abiso"
          variant="secondary"
          loading={withdraw.isPending}
          onPress={() => withdraw.mutate()}
        />
        {withdraw.isError ? <Text style={styles.error}>Hindi nabawi. Subukan ulit.</Text> : null}
      </View>
    );
  }

  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" style={styles.link}>
        <Text style={styles.linkText}>Aalis ka na ba? Magbigay ng abiso</Text>
      </Pressable>
    );
  }

  const today = toIsoDate(new Date());
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Magbigay ng abiso</Text>
      <Text style={styles.cardSub}>
        Sabihin sa household kung kailan ang huling araw mo. Mas mabuti kung may ilang araw pa
        silang maghanda.
      </Text>
      <DateTimeField
        label="Huling araw ng trabaho"
        mode="date"
        value={lastDay}
        onChange={setLastDay}
        minimumIsoDate={today}
      />
      <TextField
        label="Mensahe (optional)"
        value={note}
        onChangeText={setNote}
        placeholder="Hal. Uuwi na ako sa probinsya"
        maxLength={300}
        multiline
      />
      {give.isError ? (
        <Text style={styles.error}>
          {give.error instanceof Error ? give.error.message : "Hindi naipadala. Subukan ulit."}
        </Text>
      ) : null}
      <PrimaryButton
        label="Ipadala sa manager"
        loading={give.isPending}
        disabled={!lastDay}
        onPress={() => give.mutate()}
      />
      <PrimaryButton label="Huwag na" variant="secondary" onPress={() => setOpen(false)} />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.sand },
  content: { padding: 16, gap: 12 },
  header: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.ink },
  sub: { fontSize: 14, lineHeight: 20, color: colors.mutedInk },
  savedNote: { fontSize: 13, lineHeight: 18, color: colors.terracottaInk },
  loading: { paddingVertical: 40, alignItems: "center" },
  errorText: { fontSize: 14, color: colors.ink, textAlign: "center", paddingVertical: 24 },
  card: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: colors.cardCream,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  cardTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  cardSub: { fontSize: 13, lineHeight: 18, color: colors.mutedInk, marginBottom: 4 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowLabel: { flexShrink: 1, fontSize: 14, color: colors.mutedInk },
  rowValue: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
    textAlign: "right",
  },
  sent: { fontSize: 13, color: colors.pineTeal, paddingTop: 8 },
  link: { minHeight: 44, justifyContent: "center" },
  linkText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.pineTeal,
    textDecorationLine: "underline",
  },
  flagForm: { gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  flagTitle: { fontSize: 16, fontWeight: "700", color: colors.ink },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.sand,
  },
  chipSelected: { backgroundColor: colors.pineTeal, borderColor: colors.pineTeal },
  chipText: { fontSize: 14, fontWeight: "600", color: colors.ink },
  chipTextSelected: { color: colors.cardCream },
  error: { fontSize: 13, color: colors.terracottaInk },
  pastItem: {
    gap: 6,
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pastTitle: { fontSize: 16, fontWeight: "700", color: colors.ink },
  pastMeta: { fontSize: 13, color: colors.mutedInk },
  footnote: { fontSize: 13, lineHeight: 18, color: colors.mutedInk, textAlign: "center" },
});

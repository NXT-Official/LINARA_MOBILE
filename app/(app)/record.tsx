import { useRef, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useT } from "@/lib/i18n/locale-context";
import { KeyboardScrollView } from "@/components/ui/keyboard-screen";
import { colors, fonts } from "@/lib/theme";
import { formatDateFil, formatHoursMinutes, formatPeso, formatShiftTime } from "@/lib/format";
import {
  leaveDaysLabel,
  recordShareText,
  restTakenMinutes,
  summarizeLeave,
  summarizePay,
} from "@/lib/record";
import { useSession } from "@/lib/session-context";
import { toIsoDate } from "@/lib/datetime-fields";
import { dayNames } from "@/lib/week";
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
import { LanguageMenu } from "@/components/features/account/language-menu";
import { SignOutButton } from "@/components/features/account/sign-out-button";
import { PaymentConfirmations } from "@/components/features/pay/payment-confirmations";
import { DateTimeField } from "@/components/ui/date-time-field";
import { PrimaryButton } from "@/components/ui/primary-button";
import { TextField } from "@/components/ui/text-field";
import { Text } from "@/components/ui/text";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/ui/load-error";
import { usePullRefresh } from "@/hooks/use-pull-refresh";
import type { MessageKey } from "@/lib/i18n/instance";

const FLAG_FIELDS: { value: TermsFlagField; label: MessageKey }[] = [
  { value: "wage", label: "record.flagWage" },
  { value: "shift", label: "record.flagShift" },
  { value: "restDay", label: "record.flagRestDay" },
  { value: "station", label: "record.flagStation" },
  { value: "employment", label: "record.flagEmployment" },
  { value: "other", label: "record.flagOther" },
];

const INVITE_CODE_LENGTH = 6;

const shortDate = formatDateFil;
/** A "YYYY-MM-DD" column as that calendar day on the phone. */
const calendarDate = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
};
/** A timestamp, or a "YYYY-MM-DD" date read as that calendar day on the phone. */
const asDay = (value: string) => (value.length === 10 ? calendarDate(value) : new Date(value));
const longDate = (value: string) => formatDateFil(asDay(value));

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
  const scrollRef = useRef<ScrollView>(null);
  const pull = usePullRefresh();
  const t = useT();
  const employmentsQuery = useQuery({
    queryKey: ["my-employments", session?.user.id],
    queryFn: getMyEmployments,
    enabled: Boolean(session),
  });
  const employments = employmentsQuery.data ?? [];
  const current = employments.find((e) => e.status === "ACTIVE") ?? null;
  const past = employments.filter((e) => e.status === "INACTIVE");
  // The same read as CurrentRecord's, from the cache: has she given notice?
  const currentTermsQuery = useQuery({
    queryKey: ["terms-on-file", current?.helperId],
    queryFn: () => getMyTermsOnFile(current?.helperId as string),
    enabled: Boolean(current),
  });

  return (
    <KeyboardScrollView
      ref={scrollRef}
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={pull.control}
    >
      <Text style={styles.header}>{t("tabs.record")}</Text>
      <Text style={styles.sub}>
        {current ? t("record.angTrabahoAtSahodMo") : t("record.nanditoPaRinAngRecord")}
      </Text>

      {employmentsQuery.isLoading ? (
        <Skeleton header={false} lines={4} />
      ) : employmentsQuery.isError && !employmentsQuery.data ? (
        <LoadError
          message={t("record.hindiMaLoadAngRecord")}
          onRetry={() => void employmentsQuery.refetch()}
          retrying={employmentsQuery.isFetching}
        />
      ) : (
        <>
          {/* A failed refresh over the copy kept on the phone (lib/query-persist.ts). */}
          {employmentsQuery.isError ? (
            <Text style={styles.savedNote}>
              {t("record.offlineSaved", {
                date: shortDate(new Date(employmentsQuery.dataUpdatedAt)),
              })}
            </Text>
          ) : null}
          <PaymentConfirmations />
          {current ? <CurrentRecord employment={current} /> : <JoinHouseholdCard />}
          {past.length > 0 ? <PastEmployments past={past} /> : null}
          <PrivacyAccountCard
            employed={current !== null}
            noticeGiven={Boolean(currentTermsQuery.data?.noticeLastDay)}
          />
        </>
      )}
      <LanguageMenu />
      {/* Here as well as My Pay: My Record is the one tab that always opens,
          even with no household, so she can always sign out. */}
      {employmentsQuery.isLoading ? null : (
        <SignOutButton onConfirmShown={() => scrollRef.current?.scrollToEnd({ animated: true })} />
      )}
    </KeyboardScrollView>
  );
}

/** No current household: how she gets her next one. */
function JoinHouseholdCard() {
  const t = useT();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== INVITE_CODE_LENGTH) {
      setError(t("record.kailanganCharactersAngInviteCode", { INVITE_CODE_LENGTH }));
      return;
    }
    setError(null);
    router.push({ pathname: "/(auth)/review-terms", params: { code: trimmed } });
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t("record.walaKangHouseholdNgayon")}</Text>
      <Text style={styles.cardSub}>{t("record.kapagMayBagoKangEmployer")}</Text>
      <TextField
        label={t("record.inviteCode")}
        value={code}
        onChangeText={(text) => {
          setCode(text.toUpperCase());
          setError(null);
        }}
        error={error}
        hint={t("record.6NaLetraAtNumero")}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={INVITE_CODE_LENGTH}
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <PrimaryButton label={t("record.tingnanAngTerms")} onPress={submit} disabled={!code.trim()} />
    </View>
  );
}

/** Households she has left, each with the record they kept, as a PDF. */
function PastEmployments({ past }: { past: Employment[] }) {
  const t = useT();
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
      <Text style={styles.cardTitle}>{t("record.mgaDatingTrabaho")}</Text>
      <Text style={styles.cardSub}>{t("record.angRecordNaItinagoNg")}</Text>
      {past.map((e) => (
        <View key={e.helperId} style={styles.pastItem}>
          <Text style={styles.pastTitle}>{e.householdName ?? t("record.household")}</Text>
          <Text style={styles.pastMeta}>
            {e.station} · {shortDate(asDay(e.startedAt))} –{" "}
            {e.endedOn ? shortDate(calendarDate(e.endedOn)) : "—"}
          </Text>
          <PrimaryButton
            label={t("record.iDownloadAngRecordPdf")}
            variant="secondary"
            loading={busyId === e.helperId}
            disabled={busyId !== null && busyId !== e.helperId}
            onPress={() => void download(e)}
          />
          {failedId === e.helperId ? (
            <Text style={styles.error}>{t("record.hindiNagawaAngPdfSubukan")}</Text>
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
  const t = useT();
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
    return <Skeleton header={false} lines={4} />;
  }
  if (!terms) {
    return (
      <LoadError
        message={t("record.hindiMaLoadAngRecord")}
        onRetry={() => void termsQuery.refetch()}
        retrying={termsQuery.isFetching}
      />
    );
  }

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("record.mgaKondisyonNaNakaFile")}</Text>
        <Text style={styles.cardSub}>{t("record.itoAngRecordNgHousehold")}</Text>
        <Row label={t("record.trabaho")} value={terms.station} />
        {workplaces.length > 1 ? (
          <Row
            label={t("record.mgaBahay")}
            value={workplaces
              .map((w) => (w.isHome ? t("record.ditoKaNakaEmploy", { name: w.name }) : w.name))
              .join(", ")}
          />
        ) : null}
        {workplaces.some((w) => w.teamName) ? (
          <Row
            label={t("record.team")}
            value={workplaces
              .filter((w) => w.teamName)
              .map((w) => (workplaces.length > 1 ? `${w.teamName} (${w.name})` : w.teamName))
              .join(", ")}
          />
        ) : terms.team ? (
          <Row label={t("record.team")} value={terms.team} />
        ) : null}
        {(coversQuery.data ?? []).length > 0 ? (
          <Row label={t("record.tumutulongDinSa")} value={(coversQuery.data ?? []).join(", ")} />
        ) : null}
        {terms.labels.length > 0 ? (
          <Row label={t("record.mgaLabel")} value={terms.labels.join(", ")} />
        ) : null}
        <Row
          label={t("record.tirahan")}
          value={
            terms.employment === "live-in"
              ? "Stay-in"
              : terms.employment === "live-out"
                ? "Stay-out"
                : t("record.hindiNakalagay")
          }
        />
        <Row
          label={t("record.shift")}
          value={`${formatShiftTime(terms.shiftStart)} – ${formatShiftTime(terms.shiftEnd)}`}
        />
        {terms.breakStart && terms.breakEnd ? (
          <Row
            label={t("record.break")}
            value={`${formatShiftTime(terms.breakStart)} – ${formatShiftTime(terms.breakEnd)}`}
          />
        ) : null}
        <Row label={t("record.restDay")} value={dayNames()[terms.weeklyRestDay] ?? "—"} />
        <Row label={t("record.sahodKadaBuwan")} value={formatPeso(terms.monthlyRate)} />
        <Row
          label={t("record.sweldo")}
          value={
            terms.paydayInterval === "semi_monthly"
              ? t("record.dalawangBesesKadaBuwan")
              : t("record.isangBesesKadaBuwan")
          }
        />

        {flagMutation.isSuccess && !flagging ? (
          <Text style={styles.sent}>{t("record.naipadalaMakikitaItoNgManager")}</Text>
        ) : null}

        {flagging ? (
          <View style={styles.flagForm}>
            <Text style={styles.flagTitle}>{t("record.alinAngMali")}</Text>
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
                      {t(f.label)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextField
              label={t("record.anoAngTamaKungMeron")}
              value={note}
              onChangeText={setNote}
              placeholder={t("record.hal9000AngNapag")}
              maxLength={300}
              multiline
            />
            {flagMutation.isError ? (
              <Text style={styles.error}>{t("record.hindiNaipadalaSubukanUlit")}</Text>
            ) : null}
            <PrimaryButton
              label={t("record.ipadalaSaManager")}
              loading={flagMutation.isPending}
              onPress={() => flagMutation.mutate()}
            />
            <PrimaryButton
              label={t("record.huwagNa")}
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
            <Text style={styles.linkText}>{t("record.mayMaliSabihinSaManager")}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("record.trabahoAtSahod")}</Text>
        <Row label={t("record.nasaRecordMula")} value={longDate(terms.recordSince)} />
        <Row label={t("record.mgaNataposNaTask")} value={String(doneQuery.data ?? 0)} />
        <Row
          label={t("record.sahodNaNatanggap")}
          value={t("record.payslip", {
            paidCount: pay.paidCount,
            count: pay.paidCount,
            v2: formatPeso(pay.paidTotal),
          })}
        />
        {pay.lastPaidAt ? (
          <Row label={t("record.hulingSahod")} value={longDate(pay.lastPaidAt)} />
        ) : null}
        <Row
          label={t("record.kinaltasParaSaSssPhilhealth")}
          value={formatPeso(pay.deductedStatutory)}
        />
        <Row label={t("record.restNaNakuha")} value={formatHoursMinutes(restTaken)} />
        {leaveByYear.length === 0 ? (
          <Row label={t("record.leaveNaNakuha")} value="Wala pa" />
        ) : (
          leaveByYear.map((y) => (
            <Row
              key={y.year}
              label={t("record.leaveNaNakuha2", { year: y.year })}
              value={leaveDaysLabel(y.days, LEAVE_NAMES, (n) => `${n} araw`)}
            />
          ))
        )}
      </View>

      <PrimaryButton
        label={t("record.iDownloadAngRecordKo")}
        loading={pdfMutation.isPending}
        onPress={() => pdfMutation.mutate()}
      />
      {pdfMutation.isError ? (
        <Text style={styles.error}>{t("record.hindiNagawaAngPdfSubukan")}</Text>
      ) : null}
      <PrimaryButton label={t("record.ibahagiBilangText")} variant="secondary" onPress={share} />
      <Text style={styles.footnote}>{t("record.paraSaLoanVisaO")}</Text>
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
  const t = useT();
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
        <Text style={styles.cardTitle}>{t("record.nagbigayKaNgAbiso")}</Text>
        <Text style={styles.cardSub}>
          {t("record.noticeGiven", { date: longDate(noticeLastDay) })}
        </Text>
        {noticeNote ? <Text style={styles.cardSub}>“{noticeNote}”</Text> : null}
        <PrimaryButton
          label={t("record.bawiinAngAbiso")}
          variant="secondary"
          loading={withdraw.isPending}
          onPress={() => withdraw.mutate()}
        />
        {withdraw.isError ? (
          <Text style={styles.error}>{t("record.hindiNabawiSubukanUlit")}</Text>
        ) : null}
      </View>
    );
  }

  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" style={styles.link}>
        <Text style={styles.linkText}>{t("record.aalisKaNaBaMagbigay")}</Text>
      </Pressable>
    );
  }

  const today = toIsoDate(new Date());
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t("record.magbigayNgAbiso")}</Text>
      <Text style={styles.cardSub}>{t("record.sabihinSaHouseholdKungKailan")}</Text>
      <DateTimeField
        label={t("record.hulingArawNgTrabaho")}
        mode="date"
        value={lastDay}
        onChange={setLastDay}
        minimumIsoDate={today}
      />
      <TextField
        label={t("record.mensaheKungMeron")}
        value={note}
        onChangeText={setNote}
        placeholder={t("record.halUuwiNaAkoSa")}
        maxLength={300}
        multiline
      />
      {give.isError ? (
        <Text style={styles.error}>
          {give.error instanceof Error ? give.error.message : t("record.hindiNaipadalaSubukanUlit")}
        </Text>
      ) : null}
      <PrimaryButton
        label={t("record.ipadalaSaManager")}
        loading={give.isPending}
        disabled={!lastDay}
        onPress={() => give.mutate()}
      />
      <PrimaryButton
        label={t("record.huwagNa")}
        variant="secondary"
        onPress={() => setOpen(false)}
      />
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

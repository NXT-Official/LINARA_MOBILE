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
import { useMutation, useQuery } from "@tanstack/react-query";

import { colors, fonts } from "@/lib/theme";
import { formatHoursMinutes, formatPeso, formatShiftTime } from "@/lib/format";
import { recordShareText, restTakenMinutes, summarizePay } from "@/lib/record";
import { DAY_NAMES } from "@/lib/week";
import { getMyHelperProfile } from "@/services/api/helper-profile";
import { getHouseholdName } from "@/services/api/household";
import { getMyPayslips } from "@/services/api/payslips";
import { getMyRestOffRequests } from "@/services/api/rest-off";
import {
  flagMyTerms,
  getMyTasksDone,
  getMyTermsOnFile,
  type TermsFlagField,
} from "@/services/api/record";
import { shareRecordPdf } from "@/services/record-export";
import { PrimaryButton } from "@/components/ui/primary-button";
import { TextField } from "@/components/ui/text-field";

const FLAG_FIELDS: { value: TermsFlagField; label: string }[] = [
  { value: "wage", label: "Sahod" },
  { value: "shift", label: "Oras ng shift" },
  { value: "restDay", label: "Rest day" },
  { value: "station", label: "Role" },
  { value: "employment", label: "Live-in / live-out" },
  { value: "other", label: "Iba pa" },
];

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });

/**
 * My Record (concept doc §6, "the line that flips the app"): the terms the
 * household has on file, her work and pay in plain numbers, and a way to share
 * it. The test the concept sets: would she open this on her day off? It
 * describes this household's record only -- it doesn't claim the record moves
 * with her to another household (../LINARA/KNOWN_GAPS.md O4). What she can
 * keep is the PDF: made on her phone, saved wherever she chooses.
 */
export default function RecordScreen() {
  const profileQuery = useQuery({ queryKey: ["my-helper-profile"], queryFn: getMyHelperProfile });
  const profile = profileQuery.data;
  const helperId = profile?.id ?? null;
  const enabled = Boolean(helperId);

  const termsQuery = useQuery({
    queryKey: ["terms-on-file", helperId],
    queryFn: () => getMyTermsOnFile(helperId as string),
    enabled,
  });
  const payslipsQuery = useQuery({
    queryKey: ["payslips", helperId],
    queryFn: () => getMyPayslips(helperId as string),
    enabled,
  });
  const restQuery = useQuery({
    queryKey: ["rest-off-requests", helperId],
    queryFn: () => getMyRestOffRequests(helperId as string),
    enabled,
  });
  const householdQuery = useQuery({
    queryKey: ["household-name", profile?.householdId],
    queryFn: () => getHouseholdName(profile?.householdId as string),
    enabled: Boolean(profile?.householdId),
  });
  const doneQuery = useQuery({
    queryKey: ["tasks-done", helperId],
    queryFn: () => getMyTasksDone(helperId as string),
    enabled,
  });

  const [flagging, setFlagging] = useState(false);
  const [field, setField] = useState<TermsFlagField>("wage");
  const [note, setNote] = useState("");
  const flagMutation = useMutation({
    mutationFn: () => flagMyTerms(helperId as string, field, note.trim()),
    onSuccess: () => {
      setFlagging(false);
      setNote("");
    },
  });

  const terms = termsQuery.data;
  const loading =
    profileQuery.isLoading ||
    termsQuery.isLoading ||
    payslipsQuery.isLoading ||
    doneQuery.isLoading;
  const pay = summarizePay(payslipsQuery.data ?? []);
  const restTaken = restTakenMinutes(restQuery.data ?? []);

  const pdfMutation = useMutation({
    mutationFn: async () => {
      if (!profile || !terms) return;
      await shareRecordPdf({
        name: profile.name,
        householdName: householdQuery.data ?? null,
        ...terms,
        tasksDone: doneQuery.data ?? 0,
        pay,
        restTaken,
        payslips: payslipsQuery.data ?? [],
        restOff: restQuery.data ?? [],
        generatedAt: new Date(),
      });
    },
  });

  const share = () => {
    if (!profile || !terms) return;
    void Share.share({
      message: recordShareText({
        name: profile.name,
        station: terms.station,
        employment: terms.employment,
        recordSince: terms.recordSince,
        tasksDone: doneQuery.data ?? 0,
        pay,
        restTaken,
      }),
    });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Record ko</Text>
      <Text style={styles.sub}>Ang trabaho at sahod mo sa household na ito, sa iisang lugar.</Text>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.pineTeal} />
        </View>
      ) : !profile || !terms ? (
        <Text style={styles.errorText}>Hindi ma-load ang record mo. Subukan ulit mamaya.</Text>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Mga kondisyon na naka-file</Text>
            <Text style={styles.cardSub}>
              Ito ang record ng household tungkol sa trabaho mo. Parehong numero ang nakikita nila.
            </Text>
            <Row label="Role" value={terms.station} />
            <Row
              label="Tirahan"
              value={
                terms.employment === "live-in"
                  ? "Live-in"
                  : terms.employment === "live-out"
                    ? "Live-out"
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
            Para sa loan, visa, o susunod na trabaho. Nasa phone mo ang PDF at kung saan mo ito
            i-save, kahit umalis ka sa household na ito. Galing ang lahat ng ito sa record ng
            household sa Linara.
          </Text>
        </>
      )}
    </ScrollView>
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
  footnote: { fontSize: 13, lineHeight: 18, color: colors.mutedInk, textAlign: "center" },
});

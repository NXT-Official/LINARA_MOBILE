import { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { colors, fonts } from "@/lib/theme";
import { PrimaryButton } from "@/components/ui/primary-button";
import { TextField } from "@/components/ui/text-field";
import { normalizeMobileNumber, spacedMobileNumber } from "@/lib/mobile-number";
import {
  getMyPayoutAccount,
  saveMyPayoutAccount,
  type PayoutMethod,
} from "@/services/api/payout-account";
import { Text } from "@/components/ui/text";
import { useT } from "@/lib/i18n/locale-context";

const WALLET: Record<PayoutMethod, string> = { PH_GCASH: "GCash", PH_PAYMAYA: "Maya" };

/**
 * "Where to send my pay": her GCash or Maya, and her QR if she likes. Her
 * employer pays it from their own GCash / Maya and she confirms it arrived
 * under "Natanggap mo ba?"; Linara moves no money (../LINARA KNOWN_GAPS
 * O35). Only she can change it, so nobody else can redirect her pay.
 */
export function PayoutAccountCard({ defaultName }: { defaultName: string }) {
  const t = useT();
  const queryClient = useQueryClient();
  const accountQuery = useQuery({ queryKey: ["my-payout-account"], queryFn: getMyPayoutAccount });
  const account = accountQuery.data ?? null;

  const [editing, setEditing] = useState(false);
  const [method, setMethod] = useState<PayoutMethod>("PH_GCASH");
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [qrUri, setQrUri] = useState<string | null>(null);
  const [removeQr, setRemoveQr] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEditing = () => {
    setMethod(account?.method ?? "PH_GCASH");
    setName(account?.accountName ?? defaultName);
    setNumber(account?.accountNumber ?? "");
    setQrUri(null);
    setRemoveQr(false);
    setError(null);
    setEditing(true);
  };

  const save = useMutation({
    mutationFn: () =>
      saveMyPayoutAccount({
        method,
        accountName: name,
        accountNumber: number,
        qrLocalUri: qrUri ?? undefined,
        removeQr,
        currentQrPath: account?.qrPath ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-payout-account"] });
      setEditing(false);
    },
    onError: (err: Error) => setError(err.message),
  });

  const pickQr = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      setQrUri(result.assets[0].uri);
      setRemoveQr(false);
    }
  };

  const numberOk = normalizeMobileNumber(number) !== null;
  const canSave = numberOk && name.trim().length > 0;
  const shownQr = qrUri ?? (removeQr ? null : (account?.qrUrl ?? null));

  if (!editing) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle} accessibilityRole="header">
          {t("pay.saanIpapadalaAngSahodKo")}
        </Text>
        {account ? (
          <>
            <Text style={styles.value}>
              {WALLET[account.method]} · {spacedMobileNumber(account.accountNumber)}
            </Text>
            <Text style={styles.hint}>{t("pay.accountName", { name: account.accountName })}</Text>
            {account.qrUrl && (
              <Image
                source={{ uri: account.qrUrl }}
                style={styles.qr}
                resizeMode="contain"
                accessibilityLabel={t("pay.qrNgMo", { v1: WALLET[account.method] })}
              />
            )}
            <Text style={styles.hint}>{t("pay.ditoIpapadalaNgEmployerMo")}</Text>
            <PrimaryButton label={t("pay.palitan")} onPress={startEditing} />
          </>
        ) : (
          <>
            <Text style={styles.hint}>{t("pay.ilagayAngGcashOMaya2")}</Text>
            <PrimaryButton
              label={t("pay.ilagayAngGcashOMaya")}
              onPress={startEditing}
              loading={accountQuery.isLoading}
            />
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle} accessibilityRole="header">
        {t("pay.saanIpapadalaAngSahodKo")}
      </Text>
      <View style={styles.chips} accessibilityRole="radiogroup">
        {(["PH_GCASH", "PH_PAYMAYA"] as const).map((m) => (
          <Pressable
            hitSlop={4}
            key={m}
            onPress={() => setMethod(m)}
            accessibilityRole="radio"
            accessibilityState={{ selected: method === m }}
            style={[styles.chip, method === m && styles.chipSelected]}
          >
            <Text style={[styles.chipText, method === m && styles.chipTextSelected]}>
              {WALLET[m]}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextField
        label={`${WALLET[method]} number`}
        value={number}
        onChangeText={setNumber}
        keyboardType="phone-pad"
        placeholder={t("pay.09171234567")}
        error={number.length > 0 && !numberOk ? t("pay.11DigitsNagsisimulaSa09") : null}
      />
      <TextField
        label={t("pay.pangalanSaAccount")}
        value={name}
        onChangeText={setName}
        placeholder={t("pay.gayaNgNakalagaySaGcash")}
      />
      <Text style={styles.hint}>{t("pay.sameAsWallet", { wallet: WALLET[method] })}</Text>

      {shownQr ? (
        <View style={styles.qrRow}>
          <Image
            source={{ uri: shownQr }}
            style={styles.qr}
            resizeMode="contain"
            accessibilityLabel={t("pay.qrCode")}
          />
          <View style={styles.qrActions}>
            <Pressable onPress={pickQr} accessibilityRole="button">
              <Text style={styles.link}>{t("pay.ibangQr")}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setQrUri(null);
                setRemoveQr(true);
              }}
              accessibilityRole="button"
            >
              <Text style={styles.link}>{t("pay.alisin")}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable onPress={pickQr} accessibilityRole="button" style={styles.addQr}>
          <Text style={styles.link}>{t("pay.addQr", { wallet: WALLET[method] })}</Text>
        </Pressable>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
      <PrimaryButton
        label={t("pay.iSave")}
        onPress={() => save.mutate()}
        disabled={!canSave}
        loading={save.isPending}
      />
      <Pressable onPress={() => setEditing(false)} accessibilityRole="button">
        <Text style={[styles.link, styles.cancel]}>{t("pay.huwagNa")}</Text>
      </Pressable>
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
  // The card's own title, like the rest of the app's cards (was a small
  // coloured label above nothing: an eyebrow, audit 2026-10-29).
  cardTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.ink,
  },
  value: {
    fontSize: 18,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
  hint: {
    fontSize: 13,
    color: colors.mutedInk,
    lineHeight: 18,
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
  qrRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  qr: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFFFFF",
  },
  qrActions: {
    gap: 10,
  },
  addQr: {
    paddingVertical: 6,
  },
  link: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.pineTeal,
  },
  cancel: {
    textAlign: "center",
  },
  error: {
    fontSize: 13,
    color: colors.terracottaInk,
  },
});

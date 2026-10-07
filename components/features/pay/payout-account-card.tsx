import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
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

const WALLET: Record<PayoutMethod, string> = { PH_GCASH: "GCash", PH_PAYMAYA: "Maya" };

/**
 * "Where to send my pay": her GCash or Maya, and her QR if she likes. Her
 * employer pays it from their own GCash / Maya and she confirms it arrived
 * under "Natanggap mo ba?"; Linara moves no money (../LINARA KNOWN_GAPS
 * O35). Only she can change it, so nobody else can redirect her pay.
 */
export function PayoutAccountCard({ defaultName }: { defaultName: string }) {
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
        <Text style={styles.eyebrow}>Saan ipapadala ang sahod ko</Text>
        {account ? (
          <>
            <Text style={styles.value}>
              {WALLET[account.method]} · {spacedMobileNumber(account.accountNumber)}
            </Text>
            <Text style={styles.hint}>Pangalan: {account.accountName}</Text>
            {account.qrUrl && (
              <Image
                source={{ uri: account.qrUrl }}
                style={styles.qr}
                resizeMode="contain"
                accessibilityLabel={`QR ng ${WALLET[account.method]} mo`}
              />
            )}
            <Text style={styles.hint}>
              Dito ipapadala ng employer mo ang sahod mo. Ikaw lang ang makakapagpalit nito.
            </Text>
            <PrimaryButton label="Palitan" onPress={startEditing} />
          </>
        ) : (
          <>
            <Text style={styles.hint}>
              Ilagay ang GCash o Maya mo para malaman ng employer mo kung saan ipapadala ang sahod
              mo. Ikaw lang ang makakapagpalit nito.
            </Text>
            <PrimaryButton
              label="Ilagay ang GCash o Maya ko"
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
      <Text style={styles.eyebrow}>Saan ipapadala ang sahod ko</Text>
      <View style={styles.chips} accessibilityRole="radiogroup">
        {(["PH_GCASH", "PH_PAYMAYA"] as const).map((m) => (
          <Pressable
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
        placeholder="0917 123 4567"
        error={number.length > 0 && !numberOk ? "11 digits, nagsisimula sa 09." : null}
      />
      <TextField
        label="Pangalan sa account"
        value={name}
        onChangeText={setName}
        placeholder="Gaya ng nakalagay sa GCash"
      />
      <Text style={styles.hint}>
        Ito ang makikita ng employer mo bago magpadala, kaya dapat pareho sa {WALLET[method]} mo.
      </Text>

      {shownQr ? (
        <View style={styles.qrRow}>
          <Image
            source={{ uri: shownQr }}
            style={styles.qr}
            resizeMode="contain"
            accessibilityLabel="QR code"
          />
          <View style={styles.qrActions}>
            <Pressable onPress={pickQr} accessibilityRole="button">
              <Text style={styles.link}>Ibang QR</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setQrUri(null);
                setRemoveQr(true);
              }}
              accessibilityRole="button"
            >
              <Text style={styles.link}>Alisin</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable onPress={pickQr} accessibilityRole="button" style={styles.addQr}>
          <Text style={styles.link}>+ Idagdag ang QR ng {WALLET[method]} mo (puwedeng hindi)</Text>
        </Pressable>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
      <PrimaryButton
        label="I-save"
        onPress={() => save.mutate()}
        disabled={!canSave}
        loading={save.isPending}
      />
      <Pressable onPress={() => setEditing(false)} accessibilityRole="button">
        <Text style={[styles.link, styles.cancel]}>Huwag na</Text>
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
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.terracottaGold,
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
    color: colors.terracottaGold,
  },
});

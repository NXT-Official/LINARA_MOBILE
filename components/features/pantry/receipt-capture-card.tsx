import { ActivityIndicator, Image, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, fonts } from "@/lib/theme";
import { PrimaryButton } from "@/components/ui/primary-button";
import type { PalengkeTicket } from "@/services/api/tickets";
import { Text } from "@/components/ui/text";
import { useT } from "@/lib/i18n/locale-context";

/**
 * Completes the active Palengke Run ticket with a receipt photo (roadmap
 * Story 8, steps 3-4). The web reference's plan.md 3.1 phrasing says this
 * writes to `public.grocery_items`, but that table has no photo/receipt
 * column -- one receipt also covers many grocery_items rows, not a single
 * one. `tickets.photo_evidence_url` already exists for exactly this kind
 * of completion evidence, so the receipt lands there instead (see the note
 * on getActivePalengkeTicket in services/api/tickets.ts).
 */
export function ReceiptCaptureCard({
  ticket,
  receiptUri,
  uploading,
  completing,
  onCapture,
  onComplete,
}: {
  ticket: PalengkeTicket;
  receiptUri: string | null;
  uploading: boolean;
  completing: boolean;
  onCapture: () => void;
  onComplete: () => void;
}) {
  const t = useT();
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{t("pantry.palengkeRun")}</Text>
      <Text style={styles.title}>{ticket.title}</Text>
      <Text style={styles.subtitle}>{t("pantry.kumuhaNgLarawanNgResibo2")}</Text>

      {receiptUri ? (
        <View style={styles.receiptRow}>
          <Image source={{ uri: receiptUri }} style={styles.receiptThumb} />
          <View style={styles.receiptInfo}>
            <View style={styles.receiptAttachedRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.pineTeal} />
              <Text style={styles.receiptAttachedText}>{t("pantry.nakaAttachNaAngResibo")}</Text>
            </View>
            <Text style={styles.receiptRetake} onPress={onCapture}>
              {t("pantry.kumuhaUlit")}
            </Text>
          </View>
        </View>
      ) : (
        <PrimaryButton
          label={t("pantry.kumuhaNgLarawanNgResibo")}
          variant="secondary"
          loading={uploading}
          onPress={onCapture}
        />
      )}

      {uploading && !receiptUri ? (
        <View style={styles.uploadingRow}>
          <ActivityIndicator size="small" color={colors.pineTeal} />
          <Text style={styles.uploadingText}>{t("pantry.inaUploadAngResibo")}</Text>
        </View>
      ) : null}

      <PrimaryButton
        label={t("pantry.taposNaAngRun")}
        disabled={!receiptUri}
        loading={completing}
        onPress={onComplete}
      />
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
    fontSize: 13,
    fontWeight: "700",
    color: colors.terracottaInk,
  },
  title: {
    fontSize: 17,
    fontFamily: fonts.displayBold,
    color: colors.ink,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedInk,
  },
  receiptRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  receiptThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: colors.border,
  },
  receiptInfo: {
    flex: 1,
    gap: 4,
  },
  receiptAttachedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  receiptAttachedText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.ink,
  },
  receiptRetake: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.pineTeal,
    textDecorationLine: "underline",
  },
  uploadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  uploadingText: {
    fontSize: 13,
    color: colors.mutedInk,
  },
});

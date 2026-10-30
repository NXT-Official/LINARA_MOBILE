import { Image, StyleSheet, View } from "react-native";

import { colors } from "@/lib/theme";
import { PrimaryButton } from "@/components/ui/primary-button";
import type { GroceryReceipt } from "@/services/api/grocery";
import { Text } from "@/components/ui/text";
import { useT } from "@/lib/i18n/locale-context";
import { intlLocale } from "@/lib/i18n/instance";

const when = (iso: string) =>
  new Date(iso).toLocaleString(intlLocale(), {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

/**
 * A receipt after buying, any time (client feedback, 2026-10-02: receipt
 * attachment didn't work, because the only button was inside a Palengke Run
 * task that usually didn't exist). Saved to grocery_receipts with no run; the
 * manager sees it in the web's grocery History, under "Bought outside a run".
 * A run's receipt is taken on its run card, so with a run open this says so.
 */
export function ReceiptSnapCard({
  latest,
  saving,
  error,
  runOpen,
  onSnap,
}: {
  latest: GroceryReceipt | null;
  /** A run is open: its receipt belongs on its run card, not here. */
  runOpen?: boolean;
  saving: boolean;
  error: string | null;
  onSnap: () => void;
}) {
  const t = useT();
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t("pantry.resibo")}</Text>
      <Text style={styles.sub}>
        {runOpen ? t("pantry.paraSaRunKunanSa") : t("pantry.pagkataposMamiliKunanNgLarawan")}
      </Text>
      {latest && (
        <View style={styles.latest}>
          <Image
            source={{ uri: latest.url }}
            style={styles.thumb}
            accessibilityIgnoresInvertColors
          />
          <Text style={styles.latestText}>
            {t("pantry.latestReceipt", { when: when(latest.createdAt) })}
          </Text>
        </View>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton
        label={latest ? t("pantry.kunanAngBagongResibo") : t("pantry.kunanNgResibo")}
        variant="secondary"
        loading={saving}
        onPress={onSnap}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    borderRadius: 20,
    padding: 16,
    backgroundColor: colors.cardCream,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 15, fontWeight: "700", color: colors.ink },
  sub: { fontSize: 13, lineHeight: 18, color: colors.mutedInk },
  latest: { flexDirection: "row", alignItems: "center", gap: 10 },
  thumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: colors.sand },
  latestText: { flex: 1, fontSize: 13, color: colors.ink },
  error: { fontSize: 13, color: colors.terracottaInk },
});

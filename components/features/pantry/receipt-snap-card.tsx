import { Image, StyleSheet, Text, View } from "react-native";

import { colors } from "@/lib/theme";
import { PrimaryButton } from "@/components/ui/primary-button";
import type { GroceryReceipt } from "@/services/api/grocery";

const when = (iso: string) =>
  new Date(iso).toLocaleString("fil-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

/**
 * A receipt after buying, any time (client feedback, 2026-10-02: receipt
 * attachment didn't work, because the only button was inside a Palengke Run
 * task that usually didn't exist). Saved to grocery_receipts; the manager
 * sees it on the web's palengke list.
 */
export function ReceiptSnapCard({
  latest,
  saving,
  error,
  onSnap,
}: {
  latest: GroceryReceipt | null;
  saving: boolean;
  error: string | null;
  onSnap: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Resibo</Text>
      <Text style={styles.sub}>
        Pagkatapos mamili, kunan ng larawan ang resibo. Makikita ito ng manager.
      </Text>
      {latest && (
        <View style={styles.latest}>
          <Image
            source={{ uri: latest.url }}
            style={styles.thumb}
            accessibilityIgnoresInvertColors
          />
          <Text style={styles.latestText}>Huling resibo · {when(latest.createdAt)}</Text>
        </View>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton
        label={latest ? "Kunan ang bagong resibo" : "Kunan ng resibo"}
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

import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";

import { colors } from "@/lib/theme";
import { usePalengkeBudget } from "@/hooks/use-palengke-budget";
import { getMyHelperProfile } from "@/services/api/helper-profile";
import { getPantryItems } from "@/services/api/pantry";
import {
  getGroceryItems,
  setGroceryItemBought,
  setGroceryItemCost,
  type GroceryItemRow,
} from "@/services/api/grocery";
import { completeTicket, getActivePalengkeTicket } from "@/services/api/tickets";
import { uploadEvidenceImage } from "@/services/media-upload";
import { PantryStockList } from "@/components/features/pantry/pantry-stock-list";
import { BudgetBar } from "@/components/features/pantry/budget-bar";
import { PalengkeChecklist } from "@/components/features/pantry/palengke-checklist";
import { ReceiptCaptureCard } from "@/components/features/pantry/receipt-capture-card";

/**
 * Pantry & Palengke tab (roadmap Story 8). Stock monitor, active shopping
 * checklist with a budget dial, and -- when the helper has an open
 * Palengke Run ticket -- the receipt capture step that completes it.
 */
export default function PantryScreen() {
  const queryClient = useQueryClient();
  const { budget, setBudget } = usePalengkeBudget();
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["my-helper-profile"],
    queryFn: getMyHelperProfile,
  });
  const helperId = profileQuery.data?.id ?? null;

  const pantryQuery = useQuery({
    queryKey: ["pantry-items"],
    queryFn: getPantryItems,
  });

  const groceryQuery = useQuery({
    queryKey: ["grocery-items"],
    queryFn: getGroceryItems,
  });

  const palengkeTicketQuery = useQuery({
    queryKey: ["palengke-ticket", helperId],
    queryFn: () => getActivePalengkeTicket(helperId as string),
    enabled: Boolean(helperId),
  });

  const toggleMutation = useMutation({
    mutationFn: (item: GroceryItemRow) => setGroceryItemBought(item.id, !item.bought),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["grocery-items"] }),
  });

  const costMutation = useMutation({
    mutationFn: ({ item, cost }: { item: GroceryItemRow; cost: number | null }) =>
      setGroceryItemCost(item.id, cost),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["grocery-items"] }),
  });

  const completeRunMutation = useMutation({
    mutationFn: ({ ticketId, photoUrl }: { ticketId: string; photoUrl: string }) =>
      completeTicket(ticketId, photoUrl),
    onSuccess: () => {
      setReceiptUri(null);
      queryClient.invalidateQueries({ queryKey: ["palengke-ticket", helperId] });
      queryClient.invalidateQueries({ queryKey: ["focus-task", helperId] });
    },
  });

  const groceryItems = groceryQuery.data ?? [];
  const spent = groceryItems
    .filter((item) => item.bought)
    .reduce((sum, item) => sum + (item.actualCost ?? 0), 0);

  const captureReceipt = async () => {
    setCaptureError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setCaptureError("Kailangan ng camera access para makakuha ng larawan ng resibo.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    setUploading(true);
    try {
      const storagePath = `${helperId ?? "unknown"}/palengke/${Date.now()}.jpg`;
      const uploaded = await uploadEvidenceImage(result.assets[0].uri, storagePath);
      setReceiptUri(uploaded.signedUrl);
    } catch (err) {
      setCaptureError(
        err instanceof Error ? err.message : "Hindi na-upload ang larawan ng resibo.",
      );
    } finally {
      setUploading(false);
    }
  };

  const palengkeTicket = palengkeTicketQuery.data;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Pantry &amp; Palengke</Text>

      {groceryQuery.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.pineTeal} />
        </View>
      ) : (
        <>
          <BudgetBar spent={spent} budget={budget} onChangeBudget={setBudget} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Palengke checklist</Text>
            <PalengkeChecklist
              items={groceryItems}
              onToggle={(item) => toggleMutation.mutate(item)}
              onCost={(item, cost) => costMutation.mutate({ item, cost })}
            />
          </View>
        </>
      )}

      {palengkeTicket ? (
        <View style={styles.section}>
          {captureError ? <Text style={styles.errorText}>{captureError}</Text> : null}
          <ReceiptCaptureCard
            ticket={palengkeTicket}
            receiptUri={receiptUri}
            uploading={uploading}
            completing={completeRunMutation.isPending}
            onCapture={captureReceipt}
            onComplete={() => {
              if (receiptUri) {
                completeRunMutation.mutate({ ticketId: palengkeTicket.id, photoUrl: receiptUri });
              }
            }}
          />
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pantry stock</Text>
        {pantryQuery.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.pineTeal} />
          </View>
        ) : pantryQuery.isError ? (
          <Text style={styles.errorText}>Hindi ma-load ang pantry list. Subukan ulit mamaya.</Text>
        ) : (
          <PantryStockList items={pantryQuery.data ?? []} />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.sand,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  header: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.ink,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.mutedInk,
  },
  loading: {
    paddingVertical: 24,
    alignItems: "center",
  },
  errorText: {
    fontSize: 13,
    color: colors.terracottaGold,
  },
});

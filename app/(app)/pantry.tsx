import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";

import { colors, fonts } from "@/lib/theme";
import { usePalengkeBudget } from "@/hooks/use-palengke-budget";
import { usePantryEdits } from "@/hooks/use-pantry-edits";
import { getMyHelperProfile, getMyPantryRole } from "@/services/api/helper-profile";
import { getPantryItems, PANTRY_CATEGORIES, type PantryCategory } from "@/services/api/pantry";
import {
  getGroceryItems,
  getLatestGroceryReceipt,
  recordGroceryReceipt,
  setGroceryItemBought,
  setGroceryItemCost,
  type GroceryItemRow,
} from "@/services/api/grocery";
import { completeTicket, getActivePalengkeTicket } from "@/services/api/tickets";
import { uploadEvidenceImage } from "@/services/media-upload";
import { enqueueSyncAction } from "@/services/sqlite-queue";
import { isOffline } from "@/lib/network";
import { PantryStockList } from "@/components/features/pantry/pantry-stock-list";
import { BudgetBar } from "@/components/features/pantry/budget-bar";
import { PalengkeChecklist } from "@/components/features/pantry/palengke-checklist";
import { ReceiptCaptureCard } from "@/components/features/pantry/receipt-capture-card";
import { ReceiptSnapCard } from "@/components/features/pantry/receipt-snap-card";
import { ItemForm } from "@/components/features/pantry/item-form";
import { ListFilter, matchesQuery } from "@/components/features/pantry/list-filter";
import { PantryStarter } from "@/components/features/pantry/pantry-starter";
import { CATEGORY_LABEL, groupByPantryCategory } from "@/lib/pantry";

type PalengkeFilter = "all" | "to_buy" | "bought";
type PantryFilter = "all" | "low" | PantryCategory;

const PALENGKE_CHIPS: { key: PalengkeFilter; label: string }[] = [
  { key: "all", label: "Lahat" },
  { key: "to_buy", label: "Bibilhin" },
  { key: "bought", label: "Nabili na" },
];
const PANTRY_CHIPS: { key: PantryFilter; label: string }[] = [
  { key: "all", label: "Lahat" },
  { key: "low", label: "Paubos" },
  ...PANTRY_CATEGORIES.map((c) => ({ key: c, label: CATEGORY_LABEL[c] })),
];

/**
 * Pantry & Palengke tab (roadmap Story 8). Stock monitor, active shopping
 * checklist with a budget dial, and -- when the helper has an open
 * Palengke Run ticket -- the receipt capture step that completes it.
 * She can add to and fix both lists, and search and filter them (client
 * feedback, 2026-10-02) -- if the manager has put her in charge of the
 * pantry. Otherwise she buys from the list and says what ran out
 * (../LINARA/supabase/add-pantry-roles.sql; the database holds the line).
 */
export default function PantryScreen() {
  const queryClient = useQueryClient();
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [receiptPendingUpload, setReceiptPendingUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [palengkeSearch, setPalengkeSearch] = useState("");
  const [palengkeFilter, setPalengkeFilter] = useState<PalengkeFilter>("all");
  const [pantrySearch, setPantrySearch] = useState("");
  const [pantryFilter, setPantryFilter] = useState<PantryFilter>("all");
  const [addingGrocery, setAddingGrocery] = useState(false);
  const [addingPantry, setAddingPantry] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["my-helper-profile"],
    queryFn: getMyHelperProfile,
  });
  const helperId = profileQuery.data?.id ?? null;
  const { budget } = usePalengkeBudget(profileQuery.data?.householdId ?? null);
  const edits = usePantryEdits(profileQuery.data?.householdId ?? null);

  // The manager can change this from the web at any time, and nothing pushes
  // it here, so check again whenever she opens the tab.
  const roleQuery = useQuery({
    queryKey: ["my-pantry-role"],
    queryFn: getMyPantryRole,
  });
  const { refetch: refetchRole } = roleQuery;
  useFocusEffect(
    useCallback(() => {
      void refetchRole();
    }, [refetchRole]),
  );
  // Until it's known, show the smaller set rather than flash controls away.
  const inCharge = roleQuery.data === "lead";

  const pantryQuery = useQuery({
    queryKey: ["pantry-items"],
    queryFn: getPantryItems,
  });

  const groceryQuery = useQuery({
    queryKey: ["grocery-items"],
    queryFn: getGroceryItems,
  });

  const latestReceiptQuery = useQuery({
    queryKey: ["grocery-receipt-latest"],
    queryFn: getLatestGroceryReceipt,
  });
  const [snapError, setSnapError] = useState<string | null>(null);

  /** A receipt after buying, with or without a Palengke Run task. Online only. */
  const snapMutation = useMutation({
    mutationFn: async () => {
      const householdId = profileQuery.data?.householdId;
      if (!householdId) throw new Error("Hindi pa na-load ang household. Subukan ulit.");
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        throw new Error("Kailangan ng camera access para makuhanan ang resibo.");
      }
      const shot = await ImagePicker.launchCameraAsync({ quality: 0.9 });
      if (shot.canceled || !shot.assets?.[0]) return false;
      if (await isOffline()) {
        throw new Error("Walang internet. Kunan ulit ang resibo kapag may signal na.");
      }
      const uploaded = await uploadEvidenceImage(
        shot.assets[0].uri,
        `${householdId}/receipts/${Date.now()}.jpg`,
      );
      await recordGroceryReceipt(householdId, uploaded.path);
      return true;
    },
    onMutate: () => setSnapError(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["grocery-receipt-latest"] }),
    onError: (err) =>
      setSnapError(err instanceof Error ? err.message : "Hindi na-save ang resibo."),
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
    mutationFn: async ({
      ticketId,
      photoUrl,
      localUri,
    }: {
      ticketId: string;
      photoUrl: string | null;
      localUri: string | null;
    }) => {
      if (localUri) {
        await enqueueSyncAction(
          "complete_ticket",
          { ticketId, householdId: profileQuery.data?.householdId ?? "" },
          localUri,
        );
        return { queued: true };
      }
      await completeTicket(ticketId, photoUrl ?? undefined);
      return { queued: false };
    },
    onSuccess: (result) => {
      setReceiptUri(null);
      setReceiptPendingUpload(false);
      if (result.queued) {
        queryClient.setQueryData(["palengke-ticket", helperId], null);
      } else {
        queryClient.invalidateQueries({ queryKey: ["palengke-ticket", helperId] });
        queryClient.invalidateQueries({ queryKey: ["focus-task", helperId] });
      }
    },
  });

  const groceryItems = useMemo(() => groceryQuery.data ?? [], [groceryQuery.data]);
  const pantryItems = useMemo(() => pantryQuery.data ?? [], [pantryQuery.data]);
  const shownGroceries = groceryItems.filter(
    (item) =>
      matchesQuery(item.name, palengkeSearch) &&
      (palengkeFilter === "all" || (palengkeFilter === "bought") === item.bought),
  );
  const shownPantry = pantryItems.filter(
    (item) =>
      matchesQuery(item.name, pantrySearch) &&
      (pantryFilter === "all" ||
        (pantryFilter === "low" ? item.qty <= item.par : item.category === pantryFilter)),
  );
  const listedPantryIds = useMemo(
    () =>
      new Set(
        groceryItems
          .filter((g) => !g.bought && g.pantryItemId)
          .map((g) => g.pantryItemId as string),
      ),
    [groceryItems],
  );
  const filtering = (search: string, filter: string) => Boolean(search.trim()) || filter !== "all";
  // By shelf, once there's more than one; one heading over the lot is noise.
  const groceryGroups = groupByPantryCategory(shownGroceries, pantryItems, PANTRY_CATEGORIES);
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

    const localUri = result.assets[0].uri;

    if (await isOffline()) {
      setReceiptUri(localUri);
      setReceiptPendingUpload(true);
      return;
    }

    setUploading(true);
    try {
      const householdId = profileQuery.data?.householdId ?? "unknown";
      const storagePath = `${householdId}/receipts/${Date.now()}.jpg`;
      const uploaded = await uploadEvidenceImage(localUri, storagePath);
      setReceiptUri(uploaded.signedUrl);
      setReceiptPendingUpload(false);
      // Also on the receipts list, so the manager still sees it after the run
      // is done. Best effort: the run completes with its photo either way.
      if (palengkeTicketQuery.data) {
        recordGroceryReceipt(householdId, uploaded.path, palengkeTicketQuery.data.id)
          .then(() => queryClient.invalidateQueries({ queryKey: ["grocery-receipt-latest"] }))
          .catch(() => {});
      }
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
          <BudgetBar spent={spent} budget={budget} />

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Palengke checklist</Text>
              {inCharge && !addingGrocery && (
                <Pressable
                  onPress={() => setAddingGrocery(true)}
                  style={styles.addButton}
                  accessibilityLabel="Magdagdag sa palengke list"
                >
                  <Ionicons name="add" size={16} color={colors.pineTeal} />
                  <Text style={styles.addButtonText}>Magdagdag</Text>
                </Pressable>
              )}
            </View>
            {inCharge && addingGrocery && (
              <ItemForm
                kind="grocery"
                submitLabel="Idagdag"
                saving={edits.savingId === "new-grocery"}
                onSubmit={async (values) => {
                  if (await edits.addGrocery(values)) setAddingGrocery(false);
                }}
                onCancel={() => setAddingGrocery(false)}
              />
            )}
            {groceryItems.length > 0 && (
              <ListFilter
                query={palengkeSearch}
                onQuery={setPalengkeSearch}
                chips={PALENGKE_CHIPS}
                active={palengkeFilter}
                onChip={setPalengkeFilter}
              />
            )}
            {groceryGroups.length === 0 ? (
              <PalengkeChecklist
                items={[]}
                emptyText={
                  filtering(palengkeSearch, palengkeFilter)
                    ? "Walang tugma."
                    : pantryItems.length === 0
                      ? "Kapag may laman na ang pantry, dito lalabas ang mga paubos na."
                      : "Walang laman ang palengke list ngayon."
                }
                canEdit={inCharge}
                savingId={edits.savingId}
                onToggle={(item) => toggleMutation.mutate(item)}
                onCost={(item, cost) => costMutation.mutate({ item, cost })}
                onEdit={edits.editGrocery}
                onRemove={edits.removeGrocery}
              />
            ) : (
              groceryGroups.map(({ section, items }) => (
                <View key={section.key} style={styles.group}>
                  {groceryGroups.length > 1 && (
                    <Text style={styles.groupLabel}>{section.label}</Text>
                  )}
                  <PalengkeChecklist
                    items={items}
                    canEdit={inCharge}
                    savingId={edits.savingId}
                    onToggle={(item) => toggleMutation.mutate(item)}
                    onCost={(item, cost) => costMutation.mutate({ item, cost })}
                    onEdit={edits.editGrocery}
                    onRemove={edits.removeGrocery}
                  />
                </View>
              ))
            )}
          </View>
        </>
      )}

      {!palengkeTicket && !groceryQuery.isLoading && (
        <ReceiptSnapCard
          latest={latestReceiptQuery.data ?? null}
          saving={snapMutation.isPending}
          error={snapError}
          onSnap={() => snapMutation.mutate()}
        />
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
                completeRunMutation.mutate({
                  ticketId: palengkeTicket.id,
                  photoUrl: receiptPendingUpload ? null : receiptUri,
                  localUri: receiptPendingUpload ? receiptUri : null,
                });
              }
            }}
          />
        </View>
      ) : null}

      {edits.error ? <Text style={styles.errorText}>{edits.error}</Text> : null}

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Pantry stock</Text>
          {inCharge && !addingPantry && (
            <Pressable
              onPress={() => setAddingPantry(true)}
              style={styles.addButton}
              accessibilityLabel="Magdagdag sa pantry"
            >
              <Ionicons name="add" size={16} color={colors.pineTeal} />
              <Text style={styles.addButtonText}>Magdagdag</Text>
            </Pressable>
          )}
        </View>
        {!inCharge && pantryItems.length > 0 && (
          <Text style={styles.roleNote}>
            Pindutin ang &quot;Ubos na&quot; kapag may naubos, at ililista ito sa palengke.
          </Text>
        )}
        {inCharge && addingPantry && (
          <ItemForm
            kind="pantry"
            submitLabel="Idagdag"
            saving={edits.savingId === "new-pantry"}
            onSubmit={async (values) => {
              if (await edits.addPantry(values)) setAddingPantry(false);
            }}
            onCancel={() => setAddingPantry(false)}
          />
        )}
        {pantryItems.length > 0 && (
          <ListFilter
            query={pantrySearch}
            onQuery={setPantrySearch}
            chips={PANTRY_CHIPS}
            active={pantryFilter}
            onChip={setPantryFilter}
          />
        )}
        {pantryQuery.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.pineTeal} />
          </View>
        ) : pantryQuery.isError ? (
          <Text style={styles.errorText}>Hindi ma-load ang pantry list. Subukan ulit mamaya.</Text>
        ) : pantryItems.length === 0 && !inCharge ? (
          <PantryStockList
            items={[]}
            canManage={false}
            emptyText="Wala pang laman ang pantry. Ang manager o ang namamahala ng pantry ang maglalagay."
            listedIds={listedPantryIds}
            savingId={edits.savingId}
            onStep={edits.stepPantry}
            onEdit={edits.editPantry}
            onList={edits.listPantryItem}
            onMarkOut={edits.markOut}
          />
        ) : pantryItems.length === 0 ? (
          <PantryStarter
            saving={edits.savingId === "new-pantry"}
            onAdd={(items) => void edits.addStarter(items)}
            onAddOwn={() => setAddingPantry(true)}
          />
        ) : (
          <PantryStockList
            items={shownPantry}
            canManage={inCharge}
            emptyText={
              filtering(pantrySearch, pantryFilter)
                ? "Walang tugma."
                : "Walang laman sa pantry list."
            }
            listedIds={listedPantryIds}
            savingId={edits.savingId}
            onStep={edits.stepPantry}
            onEdit={edits.editPantry}
            onList={edits.listPantryItem}
            onMarkOut={edits.markOut}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 6,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.mutedInk,
    paddingHorizontal: 4,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.sand,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  header: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.ink,
  },
  section: {
    gap: 10,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.pineTeal,
    paddingHorizontal: 12,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.pineTeal,
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
  roleNote: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedInk,
  },
  errorText: {
    fontSize: 13,
    color: colors.terracottaGold,
  },
});

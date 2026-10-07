import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ItemFormValues } from "@/components/features/pantry/item-form";
import {
  addGroceryItem,
  deleteGroceryItem,
  updateGroceryItem,
  type GroceryItemRow,
} from "@/services/api/grocery";
import {
  addPantryItem,
  addPantryItems,
  updatePantryItem,
  type PantryItemInput,
  type PantryItemRow,
} from "@/services/api/pantry";

/** Matches the web's low-stock suggestion: enough to get back to par, at least one. */
const restockQty = (item: PantryItemRow) =>
  Math.max(1, Math.round((item.par - item.qty) * 100) / 100);

/**
 * Her side of keeping the pantry and the palengke list (client feedback,
 * 2026-10-02: staff couldn't add to either). Online only, like the rest of
 * the grocery edits (services/sqlite-queue.ts).
 */
export function usePantryEdits(householdId: string | null) {
  const queryClient = useQueryClient();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshGroceries = () => queryClient.invalidateQueries({ queryKey: ["grocery-items"] });
  const refreshPantry = () => queryClient.invalidateQueries({ queryKey: ["pantry-items"] });
  // A refusal may mean the manager changed who keeps the pantry since the
  // tab was opened, so the screen re-checks.
  const fail = (fallback: string) => (err: unknown) => {
    setError(err instanceof Error ? err.message : fallback);
    void queryClient.invalidateQueries({ queryKey: ["my-pantry-role"] });
  };

  const run = async (id: string | null, work: () => Promise<unknown>, fallback: string) => {
    setError(null);
    setSavingId(id);
    try {
      await work();
      return true;
    } catch (err) {
      fail(fallback)(err);
      return false;
    } finally {
      setSavingId(null);
    }
  };

  const needHousehold = () => {
    if (householdId) return householdId;
    throw new Error("Hindi pa na-load ang household. Subukan ulit.");
  };

  const addGrocery = async (values: ItemFormValues) =>
    run(
      "new-grocery",
      async () => {
        await addGroceryItem(needHousehold(), values);
        await refreshGroceries();
      },
      "Hindi naidagdag sa listahan.",
    );

  const editGrocery = (item: GroceryItemRow, values: ItemFormValues, done: () => void) =>
    void run(
      item.id,
      async () => {
        await updateGroceryItem(item.id, { name: values.name, qty: values.qty, unit: values.unit });
        await refreshGroceries();
        done();
      },
      "Hindi na-save.",
    );

  const removeGrocery = (item: GroceryItemRow) =>
    void run(
      item.id,
      async () => {
        await deleteGroceryItem(item.id);
        await refreshGroceries();
      },
      "Hindi natanggal.",
    );

  const listPantryItem = (item: PantryItemRow) =>
    void run(
      item.id,
      async () => {
        await addGroceryItem(needHousehold(), {
          name: item.name,
          qty: restockQty(item),
          unit: item.unit,
          pantryItemId: item.id,
        });
        await refreshGroceries();
      },
      "Hindi nailista.",
    );

  const addPantry = async (values: ItemFormValues) =>
    run(
      "new-pantry",
      async () => {
        await addPantryItem(needHousehold(), {
          name: values.name,
          qty: values.qty,
          unit: values.unit,
          par: values.par ?? 0,
          category: values.category ?? "Pantry",
        });
        await refreshPantry();
      },
      "Hindi naidagdag sa pantry.",
    );

  /** The starter list, in one go. */
  const addStarter = async (items: PantryItemInput[]) =>
    run(
      "new-pantry",
      async () => {
        await addPantryItems(needHousehold(), items);
        await refreshPantry();
      },
      "Hindi naidagdag sa pantry. Subukan ulit.",
    );

  /**
   * "Ubos na": the count goes to zero and, unless it's already there, the
   * item goes on the palengke list -- the one thing she most often needs to
   * say about stock, in one tap.
   */
  const markOut = (item: PantryItemRow, alreadyListed: boolean) =>
    void run(
      item.id,
      async () => {
        await updatePantryItem(item.id, { qty: 0 });
        if (!alreadyListed) {
          await addGroceryItem(needHousehold(), {
            name: item.name,
            qty: restockQty({ ...item, qty: 0 }),
            unit: item.unit,
            pantryItemId: item.id,
          });
        }
        await Promise.all([refreshPantry(), refreshGroceries()]);
      },
      "Hindi na-save.",
    );

  const editPantry = (item: PantryItemRow, values: ItemFormValues, done: () => void) =>
    void run(
      item.id,
      async () => {
        await updatePantryItem(item.id, {
          name: values.name,
          qty: values.qty,
          unit: values.unit,
          par: values.par ?? item.par,
          category: values.category ?? item.category,
        });
        await refreshPantry();
        done();
      },
      "Hindi na-save.",
    );

  // − and + update the count on screen right away, then save.
  const step = useMutation({
    mutationFn: ({ item, qty }: { item: PantryItemRow; qty: number }) =>
      updatePantryItem(item.id, { qty }),
    onMutate: ({ item, qty }) => {
      setError(null);
      queryClient.setQueryData<PantryItemRow[]>(["pantry-items", householdId], (rows) =>
        rows?.map((r) => (r.id === item.id ? { ...r, qty } : r)),
      );
    },
    onError: (err) => {
      fail("Hindi na-save ang bilang.")(err);
      void refreshPantry();
    },
  });

  const stepPantry = (item: PantryItemRow, delta: number) => {
    const current =
      queryClient
        .getQueryData<PantryItemRow[]>(["pantry-items", householdId])
        ?.find((r) => r.id === item.id)?.qty ?? item.qty;
    step.mutate({ item, qty: Math.max(0, current + delta) });
  };

  return {
    savingId,
    error,
    addGrocery,
    editGrocery,
    removeGrocery,
    listPantryItem,
    addPantry,
    addStarter,
    markOut,
    editPantry,
    stepPantry,
  };
}

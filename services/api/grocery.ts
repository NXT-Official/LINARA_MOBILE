import { supabase } from "@/services/supabase";

export interface GroceryItemRow {
  id: string;
  name: string;
  qty: number;
  unit: string;
  pantryItemId: string | null;
  bought: boolean;
  actualCost: number | null;
}

/**
 * Fetches the active Palengke shopping checklist (roadmap Story 8, step 2).
 * Unbought items surface first so the list reads as a to-do list, matching
 * the web reference's GroceryRow ordering.
 */
export async function getGroceryItems(): Promise<GroceryItemRow[]> {
  const { data, error } = await supabase
    .from("grocery_items")
    .select("id, name, qty, unit, pantry_item_id, bought, actual_cost")
    .order("bought", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    qty: row.qty,
    unit: row.unit,
    pantryItemId: row.pantry_item_id,
    bought: row.bought,
    actualCost: row.actual_cost,
  }));
}

/**
 * Toggles a checklist item's bought state. Matches the web reference's
 * behavior of clearing the entered cost when an item is un-checked, so a
 * mis-tap doesn't leave a stale cost counted against the budget.
 */
export async function setGroceryItemBought(id: string, bought: boolean): Promise<void> {
  const { error } = await supabase
    .from("grocery_items")
    .update({ bought, actual_cost: bought ? undefined : null })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

/** Records the actual price paid for a bought checklist item. */
export async function setGroceryItemCost(id: string, cost: number | null): Promise<void> {
  const { error } = await supabase.from("grocery_items").update({ actual_cost: cost }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

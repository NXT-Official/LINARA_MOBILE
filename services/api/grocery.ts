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
export async function getGroceryItems(householdId: string): Promise<GroceryItemRow[]> {
  // One house's list: she may read several (see getPantryItems).
  const { data, error } = await supabase
    .from("grocery_items")
    .select("id, name, qty, unit, pantry_item_id, bought, actual_cost")
    .eq("household_id", householdId)
    .order("bought", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    qty: Number(row.qty),
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

export interface GroceryItemInput {
  name: string;
  qty: number;
  unit: string;
  /** Set when it comes from a low pantry item, so buying it can restock that item. */
  pantryItemId?: string | null;
}

/**
 * Puts something on the palengke list. Whoever keeps the pantry can add
 * anything; every helper can add a pantry item that ran out
 * (../LINARA/supabase/add-pantry-roles.sql).
 */
export async function addGroceryItem(householdId: string, input: GroceryItemInput): Promise<void> {
  const { error } = await supabase.from("grocery_items").insert({
    household_id: householdId,
    name: input.name,
    qty: input.qty,
    unit: input.unit,
    pantry_item_id: input.pantryItemId ?? null,
    bought: false,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/** Fixes an item's name or amount. */
export async function updateGroceryItem(
  id: string,
  patch: Pick<GroceryItemInput, "name" | "qty" | "unit">,
): Promise<void> {
  const { error } = await supabase.from("grocery_items").update(patch).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Takes an item off the list. The screen only offers it before the item is
 * bought, so a purchase and its cost stay on record.
 */
export async function deleteGroceryItem(id: string): Promise<void> {
  const { error } = await supabase.from("grocery_items").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export interface GroceryReceipt {
  id: string;
  /** Signed for 15 minutes. */
  url: string;
  createdAt: string;
}

/**
 * Records a receipt photo already uploaded to household-evidence
 * (../LINARA/supabase/add-grocery-receipts.sql), so the manager sees it on
 * the web whether or not a Palengke Run task was open. `ticketId` links it to
 * that run when there was one.
 */
export async function recordGroceryReceipt(
  householdId: string,
  storagePath: string,
  ticketId?: string,
): Promise<{ id: string; createdAt: string }> {
  const { data, error } = await supabase
    .from("grocery_receipts")
    .insert({ household_id: householdId, storage_path: storagePath, ticket_id: ticketId ?? null })
    .select("id, created_at")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Hindi na-save ang resibo.");
  }
  return { id: data.id, createdAt: data.created_at };
}

/** The household's latest receipt, signed for display; null if none (or the table isn't there yet). */
export async function getLatestGroceryReceipt(householdId: string): Promise<GroceryReceipt | null> {
  const { data, error } = await supabase
    .from("grocery_receipts")
    .select("id, storage_path, created_at")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  // 42P01 / PGRST205: the table isn't there yet.
  if (error?.code === "42P01" || error?.code === "PGRST205") return null;
  if (error) throw new Error(error.message);
  if (!data) return null;

  const { data: link } = await supabase.storage
    .from("household-evidence")
    .createSignedUrl(data.storage_path, 900);
  return link ? { id: data.id, url: link.signedUrl, createdAt: data.created_at } : null;
}

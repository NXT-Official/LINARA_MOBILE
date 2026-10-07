import { supabase } from "@/services/supabase";

export type PantryCategory = "Rice & grains" | "Fresh" | "Baby" | "Cleaning" | "Pantry";

export interface PantryItemRow {
  id: string;
  name: string;
  qty: number;
  unit: string;
  par: number;
  category: PantryCategory;
}

/**
 * Fetches one household's pantry (roadmap Story 8, step 1). Filtered by
 * household explicitly: a helper who also works in another of the family's
 * houses can read both pantries (LINARA add-shared-staff-and-places.sql), and
 * they must not mix.
 */
export async function getPantryItems(householdId: string): Promise<PantryItemRow[]> {
  const { data, error } = await supabase
    .from("pantry_items")
    .select("id, name, qty, unit, par, category")
    .eq("household_id", householdId)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  // NUMERIC columns: coerce, as the web's toPantryItem does, so − / + add numbers.
  return (data ?? []).map((row) => ({
    ...(row as PantryItemRow),
    qty: Number(row.qty),
    par: Number(row.par),
  }));
}

export const PANTRY_CATEGORIES: PantryCategory[] = [
  "Rice & grains",
  "Fresh",
  "Baby",
  "Cleaning",
  "Pantry",
];

export interface PantryItemInput {
  name: string;
  qty: number;
  unit: string;
  par: number;
  category: PantryCategory;
}

/**
 * Adds an item to the household pantry. Helpers keep stock too (plan.md
 * §2.5's Cook; client feedback 2026-10-02), and pantry_items_isolation is
 * household-wide, so this is a plain insert under her own session.
 */
export async function addPantryItem(householdId: string, input: PantryItemInput): Promise<void> {
  const { error } = await supabase
    .from("pantry_items")
    .insert({ household_id: householdId, ...input });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Adds several items in one insert -- the starter list an empty pantry offers
 * (client feedback, 2026-10-02). Lands whole or not at all.
 */
export async function addPantryItems(
  householdId: string,
  inputs: PantryItemInput[],
): Promise<void> {
  if (inputs.length === 0) return;
  const { error } = await supabase
    .from("pantry_items")
    .insert(inputs.map((input) => ({ household_id: householdId, ...input })));

  if (error) {
    throw new Error(error.message);
  }
}

/** Changes an item's stock or details. Deleting stays with the manager. */
export async function updatePantryItem(id: string, patch: Partial<PantryItemInput>): Promise<void> {
  const { error } = await supabase
    .from("pantry_items")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

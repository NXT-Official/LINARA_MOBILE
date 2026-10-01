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
 * Fetches the shared household pantry (roadmap Story 8, step 1). No
 * explicit household_id filter is needed -- pantry_items_isolation RLS
 * already scopes every row to the caller's own household.
 */
export async function getPantryItems(): Promise<PantryItemRow[]> {
  const { data, error } = await supabase
    .from("pantry_items")
    .select("id, name, qty, unit, par, category")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PantryItemRow[];
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

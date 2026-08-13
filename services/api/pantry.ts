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

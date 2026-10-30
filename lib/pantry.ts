import type { GroceryItemRow } from "@/services/api/grocery";
import type { PantryCategory, PantryItemRow } from "@/services/api/pantry";

import { tr, type MessageKey } from "./i18n/instance";

/**
 * Pantry wording and the shelf order, kept in step with the web's
 * ../LINARA/src/features/pantry/pantry.utils.ts (neither app can import the
 * other). The labels here are hers, in Filipino; the stored categories stay
 * as pantry_items' CHECK has them.
 */
/** Each shelf's name, as a catalog key (its words are in locales/). */
export const CATEGORY_KEY: Record<PantryCategory, MessageKey> = {
  "Rice & grains": "pantryCategory.rice",
  Fresh: "pantryCategory.fresh",
  Pantry: "pantryCategory.pantry",
  Cleaning: "pantryCategory.cleaning",
  Baby: "pantryCategory.baby",
};

/** A shelf's name in the language she's using now. */
export const categoryLabel = (c: PantryCategory): string => tr(CATEGORY_KEY[c]);

export type StockState = "out" | "low" | "ok";

/**
 * Out at zero, low under the keep-at-least amount (`par`), otherwise fine.
 * Under, not at: "Ilista sa palengke" lists `par - qty`, so a line bought as
 * listed lands on `par` and has to count as enough, or it would go straight
 * back on the list (decided 2026-10-07; the web's pantry.utils.ts matches).
 */
export function stockState(item: Pick<PantryItemRow, "qty" | "par">): StockState {
  if (item.qty <= 0) return "out";
  return item.qty < item.par ? "low" : "ok";
}

/** Out or low: what the "Paubos" filter shows. */
export const needsBuying = (item: Pick<PantryItemRow, "qty" | "par">) => stockState(item) !== "ok";

export const STOCK_KEY: Record<Exclude<StockState, "ok">, MessageKey> = {
  out: "stock.out",
  low: "stock.low",
};

/**
 * What a stock row offers. Whoever keeps the pantry lists a low item herself
 * ("Ilista sa palengke") and says "Ubos na" while there's any left. Someone
 * who only buys from the list has "Ubos na" alone, so it stays until the item
 * is both out and on the list -- otherwise she'd have no way to list an item
 * someone else zeroed. Either way, a low item already listed says so.
 */
export function rowActions(
  state: StockState,
  listed: boolean,
  canManage: boolean,
): { listedNote: boolean; list: boolean; markOut: boolean } {
  return {
    listedNote: state !== "ok" && listed,
    list: canManage && state !== "ok" && !listed,
    markOut: canManage ? state !== "out" : !(state === "out" && listed),
  };
}

const PLURAL_UNITS = new Set(["packs", "bottles", "cans", "bars", "rolls", "heads", "boxes"]);

/** "1 pack", "2 packs": drops a plural unit's "s" at exactly one. Other units as typed. */
export function unitFor(n: number, unit: string): string {
  if (n !== 1 || !PLURAL_UNITS.has(unit.toLowerCase())) return unit;
  return unit.toLowerCase() === "boxes" ? unit.slice(0, -2) : unit.slice(0, -1);
}

/** The shelves, in the order the item form offers them: baby things last. */
export const CATEGORY_ORDER: PantryCategory[] = [
  "Rice & grains",
  "Fresh",
  "Pantry",
  "Cleaning",
  "Baby",
];

export type GrocerySection = { key: PantryCategory | "other"; label: string };

/**
 * Splits the palengke list into sections in pantry order, by the category of
 * the pantry item each line restocks; lines added by hand go under "Iba pa".
 * Empty sections are left out; order within a section is kept.
 */
export function groupByPantryCategory<T extends { pantryItemId?: string | null }>(
  items: T[],
  pantry: Pick<PantryItemRow, "id" | "category">[],
  order: readonly PantryCategory[],
): { section: GrocerySection; items: T[] }[] {
  const categoryOf = new Map(pantry.map((p) => [p.id, p.category]));
  const sections: { section: GrocerySection; items: T[] }[] = [
    ...order.map((c) => ({ section: { key: c, label: categoryLabel(c) }, items: [] as T[] })),
    { section: { key: "other" as const, label: tr("pantryCategory.other") }, items: [] as T[] },
  ];
  for (const item of items) {
    const category = item.pantryItemId ? categoryOf.get(item.pantryItemId) : undefined;
    const target = sections.find((s) => s.section.key === (category ?? "other"));
    (target ?? sections[sections.length - 1]).items.push(item);
  }
  return sections.filter((s) => s.items.length > 0);
}

/** Matches the web's low-stock suggestion: enough to get back to par, at least one. */
export const restockQty = (item: Pick<PantryItemRow, "qty" | "par">) =>
  Math.max(1, Math.round((item.par - item.qty) * 100) / 100);

const SUGGESTED = "sug-";

/** A Kailangan line drawn from a low pantry item, not yet on the list. */
export const isSuggested = (item: Pick<GroceryItemRow, "id">) => item.id.startsWith(SUGGESTED);

/**
 * Kailangan as the manager's Needed list has it (QA LM-15): every pantry item
 * that's out or under its "Laging may" amount and isn't already on the list
 * to buy, plus the lines added by hand. Same rule as the web's
 * use-grocery-list.ts suggestions. `dismissed` holds the pantry ids she
 * removed from Kailangan on this screen.
 */
export function pantrySuggestions(
  pantryItems: PantryItemRow[],
  groceryItems: Pick<GroceryItemRow, "pantryItemId" | "bought">[],
  dismissed: ReadonlySet<string> = new Set(),
): GroceryItemRow[] {
  const listed = new Set(
    groceryItems.filter((g) => !g.bought && g.pantryItemId).map((g) => g.pantryItemId as string),
  );
  return pantryItems
    .filter((p) => needsBuying(p) && !listed.has(p.id) && !dismissed.has(p.id))
    .map((p) => ({
      id: `${SUGGESTED}${p.id}`,
      name: p.name,
      qty: restockQty(p),
      unit: p.unit,
      pantryItemId: p.id,
      bought: false,
      actualCost: null,
      runId: null,
    }));
}

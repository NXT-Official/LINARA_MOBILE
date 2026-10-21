import { describe, expect, it } from "vitest";

import {
  CATEGORY_ORDER,
  groupByPantryCategory,
  isSuggested,
  needsBuying,
  pantrySuggestions,
  restockQty,
  rowActions,
  stockState,
  unitFor,
} from "./pantry";

// pantry_items.category's CHECK (services/api/pantry.ts), inlined so this
// test doesn't load the Supabase client.
const PANTRY_CATEGORIES = ["Rice & grains", "Fresh", "Baby", "Cleaning", "Pantry"] as const;

describe("stockState", () => {
  it("is out at zero, low under the keep-at-least amount, else ok", () => {
    expect(stockState({ qty: 0, par: 2 })).toBe("out");
    expect(stockState({ qty: 1.5, par: 2 })).toBe("low");
    expect(stockState({ qty: 2, par: 2 })).toBe("ok");
    expect(stockState({ qty: 3, par: 2 })).toBe("ok");
  });

  it("is enough once what was listed is bought", () => {
    // Out of toilet roll, keep 1: "Ilista sa palengke" lists 1, and after it, it's fine.
    expect(stockState({ qty: 0 + 1, par: 1 })).toBe("ok");
  });
});

describe("needsBuying", () => {
  it("is true for out and low, false at or over the amount", () => {
    expect(needsBuying({ qty: 0, par: 0 })).toBe(true);
    expect(needsBuying({ qty: 1, par: 2 })).toBe(true);
    expect(needsBuying({ qty: 2, par: 2 })).toBe(false);
  });
});

describe("rowActions", () => {
  it("lets whoever keeps the pantry list a low item, and say Ubos na while any is left", () => {
    expect(rowActions("ok", false, true)).toEqual({
      listedNote: false,
      list: false,
      markOut: true,
    });
    expect(rowActions("low", false, true)).toEqual({
      listedNote: false,
      list: true,
      markOut: true,
    });
    expect(rowActions("low", true, true)).toEqual({ listedNote: true, list: false, markOut: true });
    expect(rowActions("out", false, true)).toEqual({
      listedNote: false,
      list: true,
      markOut: false,
    });
    expect(rowActions("out", true, true)).toEqual({
      listedNote: true,
      list: false,
      markOut: false,
    });
  });

  it("gives someone who only buys from the list Ubos na alone, until it's out and listed", () => {
    expect(rowActions("ok", false, false)).toEqual({
      listedNote: false,
      list: false,
      markOut: true,
    });
    expect(rowActions("low", true, false)).toEqual({
      listedNote: true,
      list: false,
      markOut: true,
    });
    expect(rowActions("out", false, false)).toEqual({
      listedNote: false,
      list: false,
      markOut: true,
    });
    expect(rowActions("out", true, false)).toEqual({
      listedNote: true,
      list: false,
      markOut: false,
    });
  });
});

describe("unitFor", () => {
  it("drops a plural unit's s at exactly one, and leaves others as typed", () => {
    expect(unitFor(1, "packs")).toBe("pack");
    expect(unitFor(1, "boxes")).toBe("box");
    expect(unitFor(2, "packs")).toBe("packs");
    expect(unitFor(1, "kg")).toBe("kg");
  });
});

describe("groupByPantryCategory", () => {
  const pantry = [
    { id: "rice", category: "Rice & grains" as const },
    { id: "soap", category: "Cleaning" as const },
  ];

  it("files each line under its pantry item's shelf, hand-added ones under Iba pa", () => {
    const groups = groupByPantryCategory(
      [
        { name: "Sabon", pantryItemId: "soap" },
        { name: "Ulam", pantryItemId: null },
        { name: "Bigas", pantryItemId: "rice" },
      ],
      pantry,
      PANTRY_CATEGORIES,
    );
    expect(groups.map((g) => [g.section.label, g.items.map((i) => i.name)])).toEqual([
      ["Bigas at butil", ["Bigas"]],
      ["Panlinis", ["Sabon"]],
      ["Iba pa", ["Ulam"]],
    ]);
  });
});

describe("CATEGORY_ORDER", () => {
  it("offers every shelf the database accepts, once", () => {
    expect([...CATEGORY_ORDER].sort()).toEqual([...PANTRY_CATEGORIES].sort());
  });
});

describe("pantrySuggestions (QA LM-15)", () => {
  const item = (id: string, qty: number, par: number) => ({
    id,
    name: id,
    qty,
    par,
    unit: "pcs",
    category: "Pantry" as const,
  });
  type Pantry = Parameters<typeof pantrySuggestions>[0];

  it("lists an out or low item that isn't on the list, with what brings it back to par", () => {
    const out = pantrySuggestions([item("bigas", 0, 2), item("asin", 3, 2)] as Pantry, []);
    expect(out.map((g) => [g.name, g.qty, g.pantryItemId])).toEqual([["bigas", 2, "bigas"]]);
    expect(isSuggested(out[0])).toBe(true);
    expect(out[0].bought).toBe(false);
  });

  it("skips one already listed to buy, but suggests it again once that line is bought", () => {
    const pantry = [item("bigas", 0, 2)] as Pantry;
    expect(pantrySuggestions(pantry, [{ pantryItemId: "bigas", bought: false }])).toEqual([]);
    expect(pantrySuggestions(pantry, [{ pantryItemId: "bigas", bought: true }])).toHaveLength(1);
  });

  it("at par is enough; under par by a fraction still asks for one", () => {
    expect(pantrySuggestions([item("itlog", 2, 2)] as Pantry, [])).toEqual([]);
    expect(restockQty({ qty: 1.75, par: 2 })).toBe(1);
    expect(restockQty({ qty: 0, par: 2.5 })).toBe(2.5);
  });

  it("leaves out what she removed from Kailangan", () => {
    expect(pantrySuggestions([item("bigas", 0, 2)] as Pantry, [], new Set(["bigas"]))).toEqual([]);
  });

  it("a real line is never taken for a suggestion", () => {
    expect(isSuggested({ id: "3f0c2a7e-1b2c-4d5e-8f90-123456789abc" })).toBe(false);
  });
});

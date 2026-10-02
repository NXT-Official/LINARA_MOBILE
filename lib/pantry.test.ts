import { describe, expect, it } from "vitest";

import {
  groupByPantryCategory,
  rowActions,
  STARTER_ITEMS,
  STARTER_ORDER,
  stockState,
  unitFor,
} from "./pantry";

// pantry_items.category's CHECK (services/api/pantry.ts), inlined so this
// test doesn't load the Supabase client.
const PANTRY_CATEGORIES = ["Rice & grains", "Fresh", "Baby", "Cleaning", "Pantry"] as const;

describe("stockState", () => {
  it("is out at zero, low at or under the buy-more point, else ok", () => {
    expect(stockState({ qty: 0, par: 2 })).toBe("out");
    expect(stockState({ qty: 2, par: 2 })).toBe("low");
    expect(stockState({ qty: 3, par: 2 })).toBe("ok");
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

describe("STARTER_ITEMS", () => {
  it("only uses categories the database accepts, all in STARTER_ORDER", () => {
    for (const item of STARTER_ITEMS) {
      expect(PANTRY_CATEGORIES).toContain(item.category);
      expect(STARTER_ORDER).toContain(item.category);
    }
  });

  it("starts every item stocked, with no duplicate names", () => {
    for (const item of STARTER_ITEMS) expect(stockState(item)).toBe("ok");
    const names = STARTER_ITEMS.map((i) => i.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
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

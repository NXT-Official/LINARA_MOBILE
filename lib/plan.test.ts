import { describe, expect, it } from "vitest";

import { featureOpen, HOUSEHOLD_PLAN, householdHas } from "./plan";

describe("householdHas", () => {
  it("the sample household is on Premium, so Pantry stays open", () => {
    expect(HOUSEHOLD_PLAN).toBe("premium");
    expect(householdHas("pantry")).toBe(true);
  });

  it("matches the web catalog: Free leaves Pantry out, Normal and Premium include it", () => {
    expect(householdHas("pantry", "free")).toBe(false);
    expect(householdHas("pantry", "normal")).toBe(true);
    expect(householdHas("pantry", "premium")).toBe(true);
  });

  it("an unknown, empty or inherited-name plan opens nothing", () => {
    for (const plan of ["", "gold", "PREMIUM", "constructor", "__proto__", "toString"]) {
      expect(householdHas("pantry", plan)).toBe(false);
    }
  });
});

describe("featureOpen (the household's plan from the database)", () => {
  const loaded = (plan: unknown) => ({ kind: "loaded" as const, plan: plan as never });

  it("follows the plan the database returns", () => {
    expect(featureOpen("pantry", loaded({ planId: "free", features: { pantry: false } }))).toBe(
      false,
    );
    expect(featureOpen("pantry", loaded({ planId: "normal", features: { pantry: true } }))).toBe(
      true,
    );
  });

  it("before billing is set up there, the sample plan as before", () => {
    expect(featureOpen("pantry", { kind: "missing" })).toBe(householdHas("pantry"));
  });

  it("not known yet or offline with nothing saved: open, so she isn't locked out", () => {
    expect(featureOpen("pantry", undefined)).toBe(true);
  });

  it("an answer it can't read opens nothing", () => {
    for (const plan of [
      null,
      {},
      { features: null },
      { features: [] },
      { features: "pantry" },
      { features: { pantry: "true" } },
      { features: { pantry: 1 } },
      { features: { Pantry: true } },
    ]) {
      expect(featureOpen("pantry", loaded(plan))).toBe(false);
    }
  });
});

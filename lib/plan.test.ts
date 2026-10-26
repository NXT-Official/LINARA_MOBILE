import { describe, expect, it } from "vitest";

import { HOUSEHOLD_PLAN, householdHas } from "./plan";

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

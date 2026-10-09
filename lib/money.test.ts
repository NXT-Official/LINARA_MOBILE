import { describe, expect, it } from "vitest";

import { parseAmount } from "./money";

describe("parseAmount", () => {
  it("reads thousands written with a comma (LMM-A7)", () => {
    expect(parseAmount("1,500")).toBe(1500);
    expect(parseAmount("3,450.50")).toBe(3450.5);
    expect(parseAmount("₱ 1,250")).toBe(1250);
    expect(parseAmount("1,000,000")).toBe(1000000);
  });

  it("reads plain amounts", () => {
    expect(parseAmount("500")).toBe(500);
    expect(parseAmount(" 0.5 ")).toBe(0.5);
    expect(parseAmount(".75")).toBe(0.75);
    expect(parseAmount("0")).toBe(0);
  });

  it("is null for empty or not-an-amount", () => {
    for (const s of ["", "  ", "₱", "-5", "abc", "1.2.3", "1e3", "12a"]) {
      expect(parseAmount(s)).toBeNull();
    }
  });
});

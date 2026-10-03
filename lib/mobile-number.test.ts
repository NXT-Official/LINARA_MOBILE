import { describe, expect, it } from "vitest";

import { normalizeMobileNumber, spacedMobileNumber } from "./mobile-number";

describe("normalizeMobileNumber", () => {
  it("takes the ways people write a GCash number", () => {
    expect(normalizeMobileNumber("09171234567")).toBe("09171234567");
    expect(normalizeMobileNumber("0917 123 4567")).toBe("09171234567");
    expect(normalizeMobileNumber("0917-123-4567")).toBe("09171234567");
    expect(normalizeMobileNumber("+63 917 123 4567")).toBe("09171234567");
  });

  it("refuses what isn't one", () => {
    expect(normalizeMobileNumber("9171234567")).toBeNull();
    expect(normalizeMobileNumber("0917123456")).toBeNull();
    expect(normalizeMobileNumber("091712345678")).toBeNull();
    expect(normalizeMobileNumber("08171234567")).toBeNull();
    expect(normalizeMobileNumber("0917abc4567")).toBeNull();
    expect(normalizeMobileNumber("")).toBeNull();
  });
});

describe("spacedMobileNumber", () => {
  it("groups it for reading", () => {
    expect(spacedMobileNumber("09171234567")).toBe("0917 123 4567");
  });
});

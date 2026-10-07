import { describe, expect, it } from "vitest";

import { firstNameOf } from "./names";

describe("firstNameOf", () => {
  it("drops a leading title", () => {
    expect(firstNameOf("Kuya Marito")).toBe("Marito");
    expect(firstNameOf("Ate Marites")).toBe("Marites");
    expect(firstNameOf("Manang Rosa Dela Cruz")).toBe("Rosa");
  });

  it("uses the first name of a full name", () => {
    expect(firstNameOf("Nicole Azachee")).toBe("Nicole");
    expect(firstNameOf("Jessa")).toBe("Jessa");
  });

  it("knows Ma. is Maria, and keeps a title on its own", () => {
    expect(firstNameOf("Ma. Theresa Cruz")).toBe("Theresa");
    expect(firstNameOf("Kuya")).toBe("Kuya");
    expect(firstNameOf("  ")).toBe("");
  });
});

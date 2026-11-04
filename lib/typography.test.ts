import { describe, expect, it } from "vitest";

import { bodyFontFor } from "./typography";
import { fonts } from "./theme";

describe("bodyFontFor", () => {
  it("gives unstyled text the regular body face", () => {
    expect(bodyFontFor(undefined, undefined)).toEqual({
      fontFamily: fonts.body,
      fontWeight: "normal",
    });
  });

  it.each([
    ["400", fonts.body],
    ["normal", fonts.body],
    [400, fonts.body],
    ["500", fonts.bodySemiBold],
    ["600", fonts.bodySemiBold],
    ["700", fonts.bodyBold],
    ["bold", fonts.bodyBold],
    ["800", fonts.bodyBold],
    [900, fonts.bodyBold],
  ] as const)("weight %s draws with %s", (weight, family) => {
    expect(bodyFontFor(undefined, weight)?.fontFamily).toBe(family);
  });

  it("clears the weight so the platform doesn't thicken the bold file again", () => {
    expect(bodyFontFor(undefined, "700")?.fontWeight).toBe("normal");
  });

  it("leaves a heading or wordmark that names its own family alone", () => {
    expect(bodyFontFor(fonts.displayBold, "700")).toBeNull();
    expect(bodyFontFor(fonts.wordmark, undefined)).toBeNull();
  });

  it("a weight it can't read falls back to regular, never bold", () => {
    expect(bodyFontFor(undefined, "heavy")?.fontFamily).toBe(fonts.body);
    expect(bodyFontFor(undefined, "")?.fontFamily).toBe(fonts.body);
  });
});

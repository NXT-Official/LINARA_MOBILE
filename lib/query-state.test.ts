import { describe, expect, it } from "vitest";

import { noDataToShow } from "./query-state";

describe("noDataToShow (QA F-LM-002)", () => {
  it("is false while loading or once loaded", () => {
    expect(noDataToShow({ data: undefined, isError: false, fetchStatus: "fetching" })).toBe(false);
    expect(noDataToShow({ data: [], isError: false, fetchStatus: "idle" })).toBe(false);
  });

  it("is true when the read failed or is paused offline with nothing loaded", () => {
    expect(noDataToShow({ data: undefined, isError: true, fetchStatus: "idle" })).toBe(true);
    expect(noDataToShow({ data: undefined, isError: false, fetchStatus: "paused" })).toBe(true);
  });

  it("keeps an earlier copy on screen when a refresh fails", () => {
    expect(noDataToShow({ data: [{ id: "a" }], isError: true, fetchStatus: "idle" })).toBe(false);
    expect(noDataToShow({ data: null, isError: true, fetchStatus: "idle" })).toBe(false);
  });
});

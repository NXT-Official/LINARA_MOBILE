import { describe, expect, it } from "vitest";

import { SEEN_UTOS_KEPT_MS, utosAnswers } from "./utos";

describe("utosAnswers (QA F-LM-004)", () => {
  it("an unanswered utos offers Sige and Tapos na", () => {
    expect(utosAnswers("sent")).toEqual(["seen", "done"]);
  });

  it("after Sige only Tapos na is left, so it can still be marked done", () => {
    expect(utosAnswers("seen")).toEqual(["done"]);
  });

  it("a Sige'd utos is kept for one day", () => {
    expect(SEEN_UTOS_KEPT_MS).toBe(86_400_000);
  });
});

import { describe, expect, it } from "vitest";

import { offlineSendText, requestErrorMessage } from "./request-error";

describe("requestErrorMessage", () => {
  it("offline says nothing was sent (QA LM-16)", () => {
    expect(requestErrorMessage(null, true)).toBe(offlineSendText());
    expect(requestErrorMessage("anything", true)).toBe(offlineSendText());
  });

  it("a network failure reads as offline, never the raw error", () => {
    for (const raw of [
      "TypeError: Network request failed",
      "fetch failed: java.net.UnknownHostException",
      "Failed to fetch",
      "Request timed out",
    ]) {
      expect(requestErrorMessage(raw, false)).toBe(offlineSendText());
    }
  });

  it("an empty or unknown error is a plain Taglish retry, never English from the server", () => {
    expect(requestErrorMessage("", false)).toBe("Hindi naipadala. Subukan ulit mamaya.");
    expect(requestErrorMessage(undefined, false)).toBe("Hindi naipadala. Subukan ulit mamaya.");
    expect(
      requestErrorMessage('new row violates row-level security policy for table "vales"', false),
    ).toBe("Hindi naipadala. Subukan ulit mamaya.");
  });
});

describe("leave refusals in Taglish (QA F-LM-003)", () => {
  it("rest owed, SIL and dates read in her words", () => {
    expect(
      requestErrorMessage(
        "Not enough rest owed: 0 minutes available, 0 already requested, 780 more asked for",
        false,
      ),
    ).toMatch(/^Kulang ang rest owed mo/);
    expect(
      requestErrorMessage(
        "Not enough service incentive leave: 0 days left this service year, 1 asked for",
        false,
      ),
    ).toBe("Kulang na ang SIL mo para sa mga araw na ito.");
    expect(requestErrorMessage("That date has already passed (today is 2026-10-20)", false)).toBe(
      "Lumipas na ang petsang iyon. Pumili ng ibang araw.",
    );
    expect(
      requestErrorMessage(
        "That overlaps approved leave (sil) from 2026-10-21 to 2026-10-22",
        false,
      ),
    ).toBe("May leave ka na sa mga araw na iyon.");
  });

  it("no English sentence from add-leave.sql reaches her", () => {
    for (const raw of [
      "One request can cover at most 90 days",
      "Those dates are all rest days, so there is nothing to take",
      "That leave has already started, so it can't be cancelled",
      "That request was already declined",
      "Her shift hours are not set, so a day off in kind can't be counted",
    ]) {
      expect(requestErrorMessage(raw, false)).not.toMatch(/\b(the|that|those|can't|is)\b/i);
    }
  });
});

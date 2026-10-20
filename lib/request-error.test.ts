import { describe, expect, it } from "vitest";

import { OFFLINE_SEND, requestErrorMessage } from "./request-error";

describe("requestErrorMessage", () => {
  it("offline says nothing was sent (QA LM-16)", () => {
    expect(requestErrorMessage(null, true)).toBe(OFFLINE_SEND);
    expect(requestErrorMessage("anything", true)).toBe(OFFLINE_SEND);
  });

  it("a network failure reads as offline, never the raw error", () => {
    for (const raw of [
      "TypeError: Network request failed",
      "fetch failed: java.net.UnknownHostException",
      "Failed to fetch",
      "Request timed out",
    ]) {
      expect(requestErrorMessage(raw, false)).toBe(OFFLINE_SEND);
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

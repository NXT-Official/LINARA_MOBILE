import { describe, expect, it } from "vitest";

import { isReachable } from "./connection";

describe("isReachable (QA F-LM-008)", () => {
  it("is online only once the internet is confirmed reachable", () => {
    expect(isReachable({ isConnected: true, isInternetReachable: true })).toBe(true);
  });

  it("waits while reachability is unknown, as right after airplane mode goes off", () => {
    expect(isReachable({ isConnected: true, isInternetReachable: null })).toBe(false);
    expect(isReachable({ isConnected: true })).toBe(false);
  });

  it("is offline with no connection or no internet", () => {
    expect(isReachable({ isConnected: false, isInternetReachable: false })).toBe(false);
    expect(isReachable({ isConnected: true, isInternetReachable: false })).toBe(false);
    expect(isReachable({ isConnected: null, isInternetReachable: null })).toBe(false);
  });
});

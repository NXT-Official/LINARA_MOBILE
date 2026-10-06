import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TIMED_OUT, withinTime } from "./time-limit";

describe("withinTime", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("is the result when the work finishes in time", async () => {
    await expect(withinTime(Promise.resolve("done"), 1000)).resolves.toBe("done");
  });

  it("passes the work's own failure on", async () => {
    await expect(withinTime(Promise.reject(new Error("no")), 1000)).rejects.toThrow("no");
  });

  it("gives up on work that never finishes", async () => {
    const waiting = withinTime(new Promise<string>(() => {}), 1000);
    await vi.advanceTimersByTimeAsync(1000);
    await expect(waiting).resolves.toBe(TIMED_OUT);
  });
});

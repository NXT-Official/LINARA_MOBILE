import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createReconnectReload, isReachable } from "./connection";

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

describe("createReconnectReload (QA F-LM-008)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(opts: { reachable: boolean[]; failed: number[] }) {
    const reachable = [...opts.reachable];
    const failed = [...opts.failed];
    const reload = vi.fn();
    const checkReachable = vi.fn(async () => reachable.shift() ?? true);
    const failedCount = vi.fn(() => failed.shift() ?? 0);
    const watch = createReconnectReload({
      checkReachable,
      failedCount,
      reload,
      intervalMs: 3_000,
      maxReloads: 3,
    });
    return { watch, reload, checkReachable, failedCount };
  }

  it("reloads what failed once the internet is back, with no event needed", async () => {
    const { watch, reload } = setup({ reachable: [false, false, true], failed: [2, 2, 2, 0] });
    watch.onOffline();
    await vi.advanceTimersByTimeAsync(6_000);
    expect(reload).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(3_000);
    expect(reload).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("tries again when the first reload fails right as the link comes up", async () => {
    const { watch, reload } = setup({ reachable: [true, true], failed: [1, 1, 0] });
    watch.onOffline();
    await vi.advanceTimersByTimeAsync(6_000);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it("stops after maxReloads so a server error is not retried forever", async () => {
    const { watch, reload } = setup({ reachable: [], failed: Array(20).fill(1) });
    watch.onOffline();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(reload).toHaveBeenCalledTimes(3);
  });

  it("does nothing and stops when nothing failed", async () => {
    const { watch, reload, checkReachable } = setup({ reachable: [], failed: [0] });
    watch.onOffline();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(reload).not.toHaveBeenCalled();
    expect(checkReachable).not.toHaveBeenCalled();
  });

  it("keeps one watch when offline is reported many times", async () => {
    const { watch, checkReachable } = setup({ reachable: [false], failed: [1, 0] });
    watch.onOffline();
    watch.onOffline();
    watch.onOffline();
    await vi.advanceTimersByTimeAsync(3_000);
    expect(checkReachable).toHaveBeenCalledTimes(1);
  });

  it("treats a failed reachability check as still offline", async () => {
    const reload = vi.fn();
    const watch = createReconnectReload({
      checkReachable: async () => {
        throw new Error("native module gone");
      },
      failedCount: () => 1,
      reload,
      intervalMs: 3_000,
      maxReloads: 3,
    });
    watch.onOffline();
    await vi.advanceTimersByTimeAsync(9_000);
    expect(reload).not.toHaveBeenCalled();
    watch.stop();
  });
});

/** What `withinTime` resolves to when the work didn't finish in time. */
export const TIMED_OUT = Symbol("timed out");

/**
 * Waits for `work` at most `ms`. Startup and sign-out await phone storage and
 * the network, and on an older phone either can stall without ever failing;
 * this lets the caller move on instead of waiting forever. The work itself
 * keeps running, and a late result is ignored.
 */
export function withinTime<T>(work: Promise<T>, ms: number): Promise<T | typeof TIMED_OUT> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(TIMED_OUT), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

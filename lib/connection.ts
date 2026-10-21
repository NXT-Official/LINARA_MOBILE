/**
 * Whether the phone can reach the internet, for deciding when to reload what
 * failed. Only a confirmed connection counts: right after airplane mode goes
 * off, NetInfo says connected while reachability is still unknown, and a
 * reload then fails before the link is up, with nothing to try again
 * (QA F-LM-008, device QA 2026-10-20). NetInfo sends another event once
 * reachability is known, and that one reloads.
 */
export function isReachable(state: {
  isConnected: boolean | null;
  isInternetReachable?: boolean | null;
}): boolean {
  return state.isConnected === true && state.isInternetReachable === true;
}

/**
 * Reloads what failed while she was offline, without waiting on a NetInfo
 * event. On device the reload-on-event above was not enough: Pantry still
 * said "Walang internet" 90 s after airplane mode went off, with Android
 * reporting the link validated (device QA 2026-10-21, F-LM-008). So once
 * offline is seen, this asks for the connection state itself every
 * intervalMs while anything on screen has failed, and reloads once it's
 * reachable. A reload can still fail right as the link comes up, so it keeps
 * going, but stops after maxReloads so a real server error isn't retried
 * forever.
 */
export function createReconnectReload(deps: {
  checkReachable: () => Promise<boolean>;
  failedCount: () => number;
  reload: () => void;
  intervalMs: number;
  maxReloads: number;
}) {
  let timer: ReturnType<typeof setInterval> | null = null;
  let reloads = 0;
  let checking = false;

  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };

  const tick = async () => {
    if (checking) return;
    if (deps.failedCount() === 0 || reloads >= deps.maxReloads) return stop();
    checking = true;
    try {
      if (await deps.checkReachable().catch(() => false)) {
        reloads += 1;
        deps.reload();
      }
    } finally {
      checking = false;
    }
  };

  return {
    onOffline() {
      reloads = 0;
      if (!timer) timer = setInterval(() => void tick(), deps.intervalMs);
    },
    stop,
  };
}

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

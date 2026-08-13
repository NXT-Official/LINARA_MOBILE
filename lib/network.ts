import NetInfo from "@react-native-community/netinfo";

/**
 * Point-in-time connectivity check (roadmap Story 10 step 2's "network
 * interceptor"). Checked fresh at each mutation call site rather than read
 * from cached React state, since a stale "online" render could otherwise
 * let a write slip through right as the connection drops.
 */
export async function isOffline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return !(state.isConnected && state.isInternetReachable !== false);
}

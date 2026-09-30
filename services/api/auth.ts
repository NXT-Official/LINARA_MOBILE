import { WEB_APP_URL } from "@/lib/env";
import { unregisterForPush } from "@/lib/notifications";
import { queryClient } from "@/lib/query-client";
import { getMyHelperProfile } from "@/services/api/helper-profile";
import { getQueuedActions } from "@/services/sqlite-queue";
import { supabase } from "@/services/supabase";

/**
 * Signs a helper who already claimed her account back in -- after a
 * reinstall, a new phone, or signing out. The claim flow
 * (services/api/handshake.ts) is only for the first time; its invite code is
 * single-use, so this is the only way back in afterwards.
 *
 * A manager account authenticates fine against the same Supabase project but
 * has no helper_profiles row, so it's signed straight back out rather than
 * landing on an empty Today tab.
 */
export async function signInHelper(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) {
    if (error.code === "invalid_credentials") {
      throw new Error("Mali ang email o password. Subukan ulit, po.");
    }
    if (error.code === "email_not_confirmed") {
      throw new Error("Hindi pa na-confirm ang email mo. Buksan muna ang link sa inbox mo.");
    }
    throw new Error(error.message);
  }

  try {
    await getMyHelperProfile();
  } catch {
    await supabase.auth.signOut();
    throw new Error(
      "Walang helper account na naka-link sa email na ito. Managers: gamitin ang Linara web dashboard.",
    );
  }
}

/**
 * Emails a reset link that opens the web dashboard's /reset-password page,
 * where the helper picks a new password and then signs in here with it.
 * Supabase doesn't reveal whether the address has an account.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim(),
    WEB_APP_URL ? { redirectTo: `${WEB_APP_URL}/reset-password` } : undefined,
  );
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * How many offline actions (sqlite-queue.ts) haven't reached Supabase yet.
 * The queue isn't scoped to a user, so signing out with rows still in it
 * would replay them under whoever signs in next on this phone -- including
 * private notes. Sign-out is refused while this is non-zero.
 */
export async function countUnsyncedActions(): Promise<number> {
  return (await getQueuedActions()).length;
}

/** Signs out and drops cached data so the next person on this phone starts clean. */
export async function signOutHelper(): Promise<void> {
  const unsynced = await countUnsyncedActions();
  if (unsynced > 0) {
    throw new Error(
      `May ${unsynced} pang hindi na-sync. Kumonekta muna sa internet bago mag-sign out.`,
    );
  }
  // While still signed in: the token row is hers, and only she can remove it.
  await unregisterForPush();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
  queryClient.clear();
}

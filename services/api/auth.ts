import { MANAGER_DASHBOARD_URL } from "@/lib/env";
import { unregisterForPush } from "@/lib/notifications";
import { queryClient } from "@/lib/query-client";
import { getQueuedActions } from "@/services/sqlite-queue";
import { supabase } from "@/services/supabase";

/** Which half of the app an account opens: the helper tabs, or the manager dashboard. */
export type AccountKind = "helper" | "manager";

const MANAGER_USER_TYPES = ["primary_manager", "co_manager", "remote_admin"];

/**
 * The signed-in account's kind, from `user_profiles.user_type`. Null when it
 * has no profile row yet: a claim that failed after sign-up, or a manager who
 * hasn't set up a household. Both keep the helper tabs' behavior; a manager
 * finishes setup from the dashboard's own sign-in (app/manager.tsx?signup=1).
 */
export async function getAccountKind(): Promise<AccountKind | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_type")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const userType = (data as { user_type?: string } | null)?.user_type;
  if (userType === "helper") return "helper";
  if (userType && MANAGER_USER_TYPES.includes(userType)) return "manager";
  return null;
}

/**
 * Signs back in an account that already exists -- a helper after a
 * reinstall, a new phone, or signing out (the claim flow in
 * services/api/handshake.ts is only for the first time; its invite code is
 * single-use), or a manager, who then gets the dashboard (app/manager.tsx).
 *
 * The check is the account's type, not a current employment: a helper whose
 * household ended her employment can still sign in to read and download her
 * record, and join a new household (../LINARA/KNOWN_GAPS.md O4). An account
 * with no profile at all is signed straight back out.
 */
export async function signIn(email: string, password: string): Promise<AccountKind> {
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

  const kind = await getAccountKind().catch(() => null);
  if (!kind) {
    await supabase.auth.signOut();
    throw new Error(
      'Walang account na naka-link sa email na ito. Managers: piliin ang "New manager? Set up your household" sa ibaba.',
    );
  }
  return kind;
}

/**
 * Emails a reset link that opens the web dashboard's /reset-password page,
 * where the helper picks a new password and then signs in here with it.
 * Supabase doesn't reveal whether the address has an account.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  // Always say where the link goes. With no redirectTo it used Supabase's
  // Site URL, a retired deployment (404), whenever a build lacked
  // EXPO_PUBLIC_WEB_APP_URL. Must be in Supabase's Redirect URLs allowlist.
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${MANAGER_DASHBOARD_URL}/reset-password`,
  });
  if (error) {
    if (
      error.code === "over_email_send_rate_limit" ||
      /rate limit|security purposes/i.test(error.message)
    ) {
      throw new Error(
        "Kakapadala lang namin ng link. Maghintay ng isang minuto bago humingi ulit.",
      );
    }
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

import { MANAGER_DASHBOARD_URL } from "@/lib/env";
import { joinHousehold } from "@/services/api/employment";
import { supabase } from "@/services/supabase";

/**
 * The Supabase client here isn't generated against a Database type, so
 * `.rpc()` calls resolve to `unknown` instead of the function's actual
 * return row. These describe the SECURITY DEFINER functions in
 * ../LINARA/supabase/fix-claim-flow-rls-gaps.sql closely enough to type
 * their results. Direct `.from("helper_profiles")` / `.from("invite_flags")`
 * access does not work for any step of this flow: an unclaimed helper has
 * no `auth.uid()`, so no household-scoped RLS policy on either table can
 * ever admit them, and the first-claim `user_profiles` insert has its own
 * bootstrap deadlock under RLS. All three steps below go through the RPCs
 * instead -- see that file for the full explanation of each gap.
 */
interface PendingInviteRow {
  id: string;
  household_id: string;
  name: string;
  /** One of the household's own stations (../LINARA/supabase/add-household-stations.sql). */
  station: string;
  monthly_rate: number;
  shift_start: string;
  shift_end: string;
  weekly_rest_day: number;
}

interface ClaimHelperInviteRow {
  helper_id: string;
  household_id: string;
  full_name: string;
}

export interface InviteTerms {
  inviteCode: string;
  name: string;
  station: PendingInviteRow["station"];
  monthlyRate: number;
  shiftStart: string;
  shiftEnd: string;
  weeklyRestDay: number;
}

export interface ClaimedSession {
  accessToken: string;
  refreshToken: string;
  userId: string;
  helperId: string;
}

/**
 * Fetches read-only employment terms for a pending invite code, for the
 * review-terms screen shown before a helper decides to claim or flag.
 */
export async function verifyInviteCode(code: string): Promise<InviteTerms> {
  const { data, error } = await supabase
    .rpc("lookup_pending_invite", { p_invite_code: code })
    .maybeSingle();
  const invite = data as PendingInviteRow | null;

  if (error || !invite) {
    throw new Error("Invalid code or already claimed");
  }

  return {
    inviteCode: code,
    name: invite.name,
    station: invite.station,
    monthlyRate: Number(invite.monthly_rate),
    shiftStart: invite.shift_start,
    shiftEnd: invite.shift_end,
    weeklyRestDay: invite.weekly_rest_day,
  };
}

/**
 * Logs a contractual term the helper disputes (wage, shift, rest day, etc.)
 * during onboarding, freezing the handshake for manager review. The
 * `flag_invite` RPC re-validates the invite code itself rather than
 * trusting a client-supplied invite id.
 */
export async function flagDiscrepancy(
  inviteCode: string,
  field: string,
  note: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("flag_invite", {
    p_invite_code: inviteCode,
    p_field: field,
    p_note: note,
  });

  if (error || !data) {
    throw new Error(error?.message || "Invitation code not found");
  }
  return data as string;
}

/**
 * Registers the helper's own login credentials and activates their
 * `helper_profiles` row. Confirms the invite is still pending before
 * creating an auth user (so a stale/claimed code fails fast), then
 * finalizes via `claim_helper_invite`, which creates the `user_profiles`
 * row and flips `helper_profiles.status` to `ACTIVE` atomically.
 */
export async function claimProfile(
  code: string,
  email: string,
  pass: string,
): Promise<ClaimedSession> {
  const { data: pendingInvite, error: lookupError } = await supabase
    .rpc("lookup_pending_invite", { p_invite_code: code })
    .maybeSingle();

  if (lookupError || !pendingInvite) {
    throw new Error("Invitation code not found or already claimed");
  }

  // The confirmation link opens the web app's /email-confirmed page, which
  // sends her straight back here (linaramobile://sign-in). Without it, the
  // link used Supabase's Site URL, a retired deployment.
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: pass,
    options: { emailRedirectTo: `${MANAGER_DASHBOARD_URL}/email-confirmed?for=helper` },
  });

  // She already has an account from a previous household (O4): sign in with
  // it and join this household instead of creating a second account.
  if (authError && /already registered|already exists/i.test(authError.message)) {
    return joinWithExistingAccount(code, email, pass);
  }

  if (authError || !authData.user) {
    throw new Error(authError?.message || "Auth signup failed");
  }

  let session = authData.session;
  if (!session) {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (signInError?.code === "email_not_confirmed") {
      throw new Error(
        `Nagpadala kami ng confirmation link sa ${email}. Buksan ito, tapos bumalik dito at pindutin ulit ang button para matapos.`,
      );
    }
    if (signInError || !signInData.session) {
      throw new Error(signInError?.message || "Auth signin failed after registration");
    }
    session = signInData.session;
  }

  const { data: claimedData, error: claimError } = await supabase
    .rpc("claim_helper_invite", { p_invite_code: code })
    .maybeSingle();
  const claimed = claimedData as ClaimHelperInviteRow | null;

  // With email confirmation on, signUp answers an existing address as if it
  // were new, the sign-in above works with her real password, and only this
  // claim notices (her user_profiles row already exists). Same outcome: join.
  if (claimError && /duplicate key|user_profiles_pkey/i.test(claimError.message)) {
    const joined = await joinHousehold(code);
    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      userId: session.user.id,
      helperId: joined.helperId,
    };
  }

  if (claimError || !claimed) {
    throw new Error(claimError?.message || "Failed to activate helper profile");
  }

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    userId: authData.user.id,
    helperId: claimed.helper_id,
  };
}

/** An existing helper account claiming a new household's invite. */
async function joinWithExistingAccount(
  code: string,
  email: string,
  pass: string,
): Promise<ClaimedSession> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
  if (error || !data.session) {
    throw new Error(
      "May account na ang email na ito. Gamitin ang password mo noon, o mag-sign in at i-enter ang code sa My Record.",
    );
  }
  const joined = await joinHousehold(code);
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    userId: data.session.user.id,
    helperId: joined.helperId,
  };
}

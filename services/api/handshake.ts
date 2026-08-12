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
  station: "Yaya" | "Cook" | "Laundry" | "Driver" | "House";
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

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: pass,
  });

  if (authError || !authData.user) {
    throw new Error(authError?.message || "Auth signup failed");
  }

  let session = authData.session;
  if (!session) {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (signInError || !signInData.session) {
      throw new Error(signInError?.message || "Auth signin failed after registration");
    }
    session = signInData.session;
  }

  const { data: claimedData, error: claimError } = await supabase
    .rpc("claim_helper_invite", { p_invite_code: code })
    .maybeSingle();
  const claimed = claimedData as ClaimHelperInviteRow | null;

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

# Story 4: Handshake Invitation & Claim APIs

## Objective
Implement type-safe API communication endpoints for verifying 6-character invitation codes, logging term discrepancy flags, registering helper profiles, and locking credentials to establish a secure onboarding handshake.

## Context References
- **PRD Specs:** [`../LINARA_MOBILE/plan.md`](../LINARA_MOBILE/plan.md:Section 3.1)
- **Technical Architecture:** [`../LINARA_MOBILE/architecture.md`](../LINARA_MOBILE/architecture.md:Section 7.1)
- **Central APIs:** [`src/features/people/people.actions.ts`](src/features/people/people.actions.ts) (reference for claim and handshake server routes).

## Explicit Dependencies
- `Story_3_DatabaseRealtimeAndStoragePipes.md`

## Explicit Inputs
- **Supabase Client:** Authenticated and unauthenticated client nodes.

## Step-by-Step Implementation Instructions
1. Implement the Verify invitation terms lookup in `services/api/handshake.ts`. Fetches terms read-only based on the invite code:
   ```typescript
   export async function verifyInviteCode(code: string) {
     const { data, error } = await supabase
       .from('helper_profiles')
       .select('id, name, station, monthly_rate, shift_start, shift_end, weekly_rest_day, status')
       .eq('invite_code', code)
       .eq('status', 'PENDING_CLAIM')
       .single();
     if (error) throw new Error('Invalid code or already claimed');
     return data;
   }
   ```
2. Build the Discrepancy Flagging API. Inserts a row inside `public.invite_flags` when a helper disputes contractual fields:
   ```typescript
   export async function flagDiscrepancy(inviteId: string, field: string, note: string) {
     const { data, error } = await supabase
       .from('invite_flags')
       .insert([{ invite_id: inviteId, field, note }]);
     if (error) throw error;
     return data;
   }
   ```
3. Implement the Claim Account endpoint. Triggers user authentication, maps the resulting GoTrue UUID to the profile's `user_id`, and transition status to `ACTIVE`:
   ```typescript
   export async function claimProfile(code: string, email: string, pass: string) {
     const { data: authData, error: authError } = await supabase.auth.signUp({ email, password: pass });
     if (authError) throw authError;
     
     const { error: profileError } = await supabase
       .from('helper_profiles')
       .update({ user_id: authData.user!.id, status: 'ACTIVE' })
       .eq('invite_code', code);
     if (profileError) throw profileError;
     return authData;
   }
   ```

## Expected Output
- Symmetrical API connectors handling invite lookup, term dispute flagging, and GoTrue credential registration.

## Acceptance Criteria
- Fetching an invalid invite code throws a clear user-facing error message.
- Flagging a contractual discrepancy suspends onboarding and successfully creates record entries in the `invite_flags` table.
- Submitting active credentials successfully claims the account and returns valid session tokens.

## Definition of Done
- Handshake APIs are unit tested and green.
- Active claims lock credentials behind active user sessions.
- Profile status transitions are saved in the central database.

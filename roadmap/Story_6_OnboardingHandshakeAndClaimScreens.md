# Story 6: Onboarding Handshake & Claim Screens

## Objective

Construct the user-facing onboarding screens under `app/(auth)/`, integrating invitation lookup, read-only terms reviews, flagging mismatches, and password creation forms.

## Context References

- **PRD Specs:** [`../LINARA_MOBILE/plan.md`](../LINARA_MOBILE/plan.md:Section 3.1)
- **Technical Architecture:** [`../LINARA_MOBILE/architecture.md`](../LINARA_MOBILE/architecture.md:Section 3)
- **Existing Asset References:** [`src/features/people/components/claim-account-flow.tsx`](src/features/people/components/claim-account-flow.tsx) (reference for claim screens).

## Explicit Dependencies

- `Story_5_MobileShellAndBottomNavigationTabs.md`

## Explicit Inputs

- **API Connectors:** Handshake endpoints created in Phase 2.

## Step-by-Step Implementation Instructions

1. Build `app/(auth)/welcome.tsx` displaying the welcome splash page and the 6-character code validation text-field. Integrate button linking to code lookups.
2. Build `app/(auth)/review-terms.tsx` mapping pre-claim terms in read-only visual columns:
   - Base Wage (Monthly Rate in PHP)
   - Shift schedules and Daily Break durations
   - Station allocations and weekly Rest Days
3. Create `app/(auth)/flag-terms.tsx` containing category toggles (`"wage"`, `"shift"`, `"restDay"`, `"station"`) and a multiline notes input box. Trigger flags to `public.invite_flags` when submitted, suspending onboarding claims.
4. Implement `app/(auth)/claim-account.tsx` requesting email credentials and a secure password. Successful submissions authenticate the session and route helpers to `/today`.

## Expected Output

- Fully interactive onboarding stack screens.
- Input validation parameters preventing invalid emails or short passwords.
- Real-time navigation redirects based on dispute flag status.

## Acceptance Criteria

- Inputting `LN98A2` correctly pulls profile terms and routes helpers to the review page.
- Tapping `"Something's not right?"` halts claims and logs flags successfully to `invite_flags`.
- Locking credentials claims the seat, writing the user ID, and opening the main tabs dashboard.

## Definition of Done

- Handshake UI flows are completely functional on native clients.
- Errors are displayed as warm, user-friendly Taglish text boxes.
- Authenticated state persists after claims.

# Story 5: Mobile Shell & Bottom Navigation Tabs

## Objective

Establish the root navigation layouts, configure the Bottom Tab Navigator with high-contrast custom brand themes, and implement the Dignity Header showing shift schedules.

## Context References

- **PRD Specs:** [`../LINARA_MOBILE/plan.md`](../LINARA_MOBILE/plan.md:Section 3.2)
- **Technical Architecture:** [`../LINARA_MOBILE/architecture.md`](../LINARA_MOBILE/architecture.md:Section 3)
- **Existing Asset References:** [`src/routes/_app/helper.tsx`](src/routes/_app/helper.tsx) (reference for web shell structure).

## Explicit Dependencies

- `Story_4_HandshakeInvitationAndClaimAPIs.md`

## Explicit Inputs

- **Layout Tokens:** Warm sand `#F7F3EC`, pine-teal `#1F5A54`, card cream `#FDFBF6`, and terracotta-gold `#D99A6C`.

## Step-by-Step Implementation Instructions

1. Create the root provider shell in `app/_layout.tsx`. Mount:
   - Supabase Session Provider (persists active logins).
   - TanStack Query client context provider.
   - Root `Slot` or `Stack` layouts.
2. Build the Main Bottom Tab Navigator in `app/(app)/_layout.tsx`. Map three core tabs:
   - **Today** (`today.tsx`) utilizing a checkmark/home icon.
   - **Pantry** (`pantry.tsx`) utilizing a shopping/basket icon.
   - **My Pay** (`pay.tsx`) utilizing a credit card/peso-ledger icon.
3. Apply active styling parameters: Active tint matches Pine-Teal, background matches Card Cream with warm sand bodies.
4. Implement the reusable Dignity Header inside `app/(app)/today.tsx` fetching helper data (name, station, shift timing, and weekly rest days).
5. Embed the `RosaAvailControl` component containing big, touch-targets representing reachability (On Shift, Available, Off).

## Expected Output

- File-based navigation structure separating guest stacks from bottom-tab navigators.
- Fully-themed Tab UI conforming to Pine-Teal / Sand brand parameters.
- Symmetrical, active shift countdown displays reflecting helper parameters.

## Acceptance Criteria

- Tapping Bottom Tab buttons transitions view screens smoothly without visual glitches.
- Launching the app while authenticated bypasses onboarding screens, landing directly on the Today tab.
- Reachability switches toggle status state dynamically inside the local react context.

## Definition of Done

- Native Tab navigator is active on physical iOS and Android devices.
- Design themes reflect custom color tokens.
- Shift timing states load cleanly from the active session.

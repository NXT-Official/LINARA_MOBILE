# Story 7: Today Active Focus Card & SOP Carousel

## Objective
Implement the Today focus screen, the interactive swipable SOP visual checklist, and the floating ephemeral Quick Utos alert feed.

## Context References
- **PRD Specs:** [`../LINARA_MOBILE/plan.md`](../LINARA_MOBILE/plan.md:Section 3.2)
- **Technical Architecture:** [`../LINARA_MOBILE/architecture.md`](../LINARA_MOBILE/architecture.md:Section 3)
- **Existing Asset References:** [`src/features/tasks/components/task-card.tsx`](src/features/tasks/components/task-card.tsx) (reference for task cards) and [`src/features/utos/components/quick-utos-feed.tsx`](src/features/utos/components/quick-utos-feed.tsx) (reference for quick pings).

## Explicit Dependencies
- `Story_6_OnboardingHandshakeAndClaimScreens.md`

## Explicit Inputs
- **Supabase Client:** Real-time listeners and task query contexts.

## Step-by-Step Implementation Instructions
1. In `app/(app)/today.tsx`, query active tickets matching the helper's ID and status `<> 'done'` using TanStack Query.
2. Build the **Active Focus Card** UI component showing the primary, uncompleted task card.
3. Integrate the swipable SOP visual slide deck inside the card (refer to [`src/components/ui/carousel.tsx`](src/components/ui/carousel.tsx)). Slides display step instructions and safety focus alerts (e.g., *"Make sure temperature is safe"*).
4. Add Start Task and Done action buttons, updating status fields inside `public.tickets` on press.
5. Implement the floating `QuickUtosFeed` component showing day pings. Connect listeners to update states on acknowledgment.

## Expected Output
- Unified, high-contrast focus task deck with visual step slides.
- Floating alert containers for momentary small asks.
- Dynamic ticket status transition triggers.

## Acceptance Criteria
- Today screen displays exactly one primary, uncompleted focus task.
- Swiping through SOP guidelines is fluid with zero component sluggishness.
- Real-time quick pings display immediately on screen and vanish when acknowledged.

## Definition of Done
- Swipable task card is operational on native clients.
- Status patches write correctly to backend PostgreSQL tables.
- UI elements update instantly on websocket notifications.

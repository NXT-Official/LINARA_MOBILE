# Story 8: Pantry & Palengke Budget Checklists

## Objective

Implement the Pantry stock-level monitor, the active Palengke shopping checklist, and integrate the native camera/media pipe to record photo receipts.

## Context References

- **PRD Specs:** [`../LINARA_MOBILE/plan.md`](../LINARA_MOBILE/plan.md:Section 3.2)
- **Technical Architecture:** [`../LINARA_MOBILE/architecture.md`](../LINARA_MOBILE/architecture.md:Section 3.2)
- **Existing Asset References:** [`src/routes/_app/helper/pantry.tsx`](src/routes/_app/helper/pantry.tsx) (reference for pantry views) and [`src/features/groceries/grocery-context.ts`](src/features/groceries/grocery-context.ts) (reference for grocery trackers).

## Explicit Dependencies

- `Story_7_TodayActiveFocusCardAndSOPCarousel.md`

## Explicit Inputs

- **Supabase Client:** Object storage upload methods.
- **Hardware Plugins:** `expo-camera` or `expo-image-picker`.

## Step-by-Step Implementation Instructions

1. Build `app/(app)/pantry.tsx` displaying pantry levels. Highlight items flagging "Low" (quantity below PAR levels).
2. Integrate the active **Palengke Shopping Checklist** inside the view, displaying required quantities and remaining cash budgets.
3. Integrate the `expo-camera` or `expo-image-picker` library to trigger the phone's native camera.
4. Add the Receipt Photo slot. Capturing receipt images compresses the JPEG file locally, generates pre-signed bucket credentials, uploads to the private storage bucket, and writes the URL to `public.grocery_items` before marking purchases as complete.

## Expected Output

- High-contrast, scrollable stock monitors and interactive shopping lists.
- Inline budget calculations displaying remaining cash allocations.
- Symmetrical receipt attachment links uploaded securely.

## Acceptance Criteria

- Tapping item checkboxes toggles purchases, calculating budget changes in real time.
- Completing a run triggers the device camera, compressing the image and uploading it successfully to Supabase Storage.
- Uploaded receipts are saved under signed URLs in postgres ledger rows.

## Definition of Done

- Pantry stock listings are fully operational on mobile.
- Receipt uploads operate reliably over standard mobile data.
- Cash spent reconciles correctly on the dashboard.

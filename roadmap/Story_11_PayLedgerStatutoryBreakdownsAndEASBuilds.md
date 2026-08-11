# Story 11: Pay Ledger Statutory Breakdowns & EAS Builds

## Objective

Design transparent digital payslips, SSS/PhilHealth/Pag-IBIG compliance charts, vale forms, overtime meters, and configure EAS native builds for iOS and Android deployment.

## Context References

- **PRD Specs:** [`../LINARA_MOBILE/plan.md`](../LINARA_MOBILE/plan.md:Section 3.2 & 5.3)
- **Technical Architecture:** [`../LINARA_MOBILE/architecture.md`](../LINARA_MOBILE/architecture.md:Section 3 & 5.2)
- **Existing Asset References:** [`src/features/ledger/components/pay-record.tsx`](src/features/ledger/components/pay-record.tsx) (reference for pay lists) and [`src/features/people/components/legal-contribution-split-card.tsx`](src/features/people/components/legal-contribution-split-card.tsx) (reference for contribution split cards).

## Explicit Dependencies

- `Story_10_SQLiteOfflineFirstSyncQueueAndRealtime.md`

## Explicit Inputs

- **Supabase Client:** Database connectors for ledger entries and vales.
- **Expo Configurations:** `app.json` parameter mappings.

## Step-by-Step Implementation Instructions

1. Implement `app/(app)/pay.tsx` showing transparent digital payslips mapping wage histories, HitPay transfers, and statutory split columns (SSS, PhilHealth, Pag-IBIG).
2. Build the **Vale Requests Form** inside the Pay screen, allowing helpers to send cash advances and view real-time approval logs.
3. Build the **Rest Owed Counter** component, compiling and displaying overtime hours/minutes accrued from out-of-shift tasks.
4. Set up custom typography (Fraunces & Nunito Sans) and apply branding transitions across all native screen margins.
5. Create production Expo configurations inside `app.json`. Add app icons, splash screens, and compile package metadata.
6. Execute EAS production builds targeting App Store and Google Play testing:
   ```bash
   eas build --platform all --profile production
   ```

## Expected Output

- Complete, themed financial logs and vale advance modules.
- Form configurations with input validation limits.
- Green native iOS IPA and Android APK packages generated via EAS.

## Acceptance Criteria

- Pay screen displays statutory breakdowns and accrued overtime hours.
- Sending a vale advance request creates record rows in `public.vales` and shows "pending" status instantly on screen.
- Running EAS build completes successfully without native linker errors.

## Definition of Done

- Native financial dashboards are fully polished and operational.
- Visual elements adhere to corporate branding styles.
- Android APK and iOS testing builds are compiled and ready for deployment.

/**
 * What her household's plan opens in this app. Billing isn't live yet
 * (../documentation/specs/2026-10-26-subscriptions-plan.md), so the plan is a
 * sample here, the same catalog as the manager's web app
 * (../LINARA/src/features/plan/plan.sample.ts). Once billing is built the
 * plan comes from the household's subscription instead of HOUSEHOLD_PLAN.
 *
 * Only Pantry follows the plan. Her leave and rest days, rest owed and her
 * record are open on every plan: the weekly rest day and yearly leave are
 * hers by law (RA 10361) and her record is hers, whatever the household pays.
 * She never sees prices or billing. Pure and relatively imported, so it's
 * testable without the app (CLAUDE.md, Test layout).
 */
export type PlanId = "free" | "normal" | "premium";

/** The plan features this app has screens for that a plan can leave out. */
export type HelperFeature = "pantry";

const PLAN_FEATURES: Record<PlanId, Record<HelperFeature, boolean>> = {
  free: { pantry: false },
  normal: { pantry: true },
  premium: { pantry: true },
};

/**
 * The sample household plan. Premium, so nothing she has today closes while
 * billing is a preview; change it here to see the app on another plan.
 */
export const HOUSEHOLD_PLAN: PlanId = "premium";

/** Whether her household's plan opens a feature. An unknown plan opens nothing. */
export function householdHas(feature: HelperFeature, plan: string = HOUSEHOLD_PLAN): boolean {
  if (!Object.hasOwn(PLAN_FEATURES, plan)) return false;
  return PLAN_FEATURES[plan as PlanId][feature];
}

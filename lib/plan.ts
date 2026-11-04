/**
 * What her household's plan opens in this app. Billing isn't live yet
 * (../documentation/specs/2026-10-26-subscriptions-plan.md). The plan comes
 * from the household's subscription (my_household_plan) where billing is set
 * up in the database, and from HOUSEHOLD_PLAN, a sample, where it isn't yet.
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
 * The sample household plan, used until billing is set up in the database:
 * Premium, so nothing she has today closes. Change it here to see the app on
 * another plan.
 */
export const HOUSEHOLD_PLAN: PlanId = "premium";

/** Whether her household's plan opens a feature. An unknown plan opens nothing. */
export function householdHas(feature: HelperFeature, plan: string = HOUSEHOLD_PLAN): boolean {
  if (!Object.hasOwn(PLAN_FEATURES, plan)) return false;
  return PLAN_FEATURES[plan as PlanId][feature];
}

/** What asking the database for her household's plan gave. */
export type PlanLookup =
  | { kind: "loaded"; plan: { planId?: unknown; features?: unknown } | null }
  /** Billing isn't set up in this database yet. */
  | { kind: "missing" };

/**
 * Whether a feature is open, from what the database said:
 *
 * - loaded: exactly what her household's plan says; anything unreadable is closed;
 * - missing (billing not set up yet): the sample plan, as before;
 * - not known (still loading, or offline with nothing saved): open, so a
 *   bad signal never locks her out of what she had. The database still
 *   refuses anything new the plan doesn't include.
 */
export function featureOpen(feature: HelperFeature, lookup: PlanLookup | undefined): boolean {
  if (!lookup) return true;
  if (lookup.kind === "missing") return householdHas(feature);
  const features = lookup.plan?.features;
  if (typeof features !== "object" || features === null || Array.isArray(features)) return false;
  return (features as Record<string, unknown>)[feature] === true;
}

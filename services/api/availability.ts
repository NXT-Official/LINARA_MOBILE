import { supabase } from "@/services/supabase";

/**
 * Sets/clears the calling helper's own manual "Available for N hours"
 * opt-in -- real, Supabase-backed as of ../../LINARA/supabase/
 * add-helper-manual-availability.sql. `helper_profiles_isolation` is a
 * plain household-scoped policy with no row-ownership restriction, so
 * these rely on the caller only ever passing her own `helperId` (same
 * trust posture other authed household-scoped writes in this app already
 * use -- see ../../LINARA/MULTI_HELPER_HANDLING.md).
 */
export async function setHelperAvailability(helperId: string, hours: number): Promise<void> {
  const availableUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from("helper_profiles")
    .update({ manual_status: "available", manual_available_until: availableUntil })
    .eq("id", helperId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function setHelperOff(helperId: string): Promise<void> {
  const { error } = await supabase
    .from("helper_profiles")
    .update({ manual_status: "off", manual_available_until: null })
    .eq("id", helperId);

  if (error) {
    throw new Error(error.message);
  }
}

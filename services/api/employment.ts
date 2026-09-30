import { supabase } from "@/services/supabase";

/**
 * One household she works or has worked for. A helper_profiles row is one
 * employment, not one person (../LINARA/supabase/add-employment-end.sql):
 * when a household ends her employment the row goes INACTIVE with her last
 * day, she keeps read access to it, and a new invite code starts a new one.
 */
export interface Employment {
  helperId: string;
  householdId: string;
  householdName: string | null;
  /** Her name as that household recorded it. */
  name: string;
  station: string;
  status: "ACTIVE" | "INACTIVE";
  startedAt: string;
  /** Her last working day, "YYYY-MM-DD"; null while employed. */
  endedOn: string | null;
}

/** Every employment on her account, current first, then most recent. */
export async function getMyEmployments(): Promise<Employment[]> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("helper_profiles")
    .select("id, household_id, name, station, status, created_at, ended_on")
    .eq("user_id", user.id)
    .in("status", ["ACTIVE", "INACTIVE"])
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as {
    id: string;
    household_id: string;
    name: string;
    station: string;
    status: "ACTIVE" | "INACTIVE";
    created_at: string;
    ended_on: string | null;
  }[];

  // households_own_history_read lets her read the names of households she
  // has worked for; a failure here only costs the name.
  const ids = [...new Set(rows.map((r) => r.household_id))];
  const names = new Map<string, string>();
  if (ids.length > 0) {
    const { data: households } = await supabase.from("households").select("id, name").in("id", ids);
    for (const h of (households ?? []) as { id: string; name: string }[]) names.set(h.id, h.name);
  }

  return rows
    .map((r) => ({
      helperId: r.id,
      householdId: r.household_id,
      householdName: names.get(r.household_id) ?? null,
      name: r.name,
      station: r.station,
      status: r.status,
      startedAt: r.created_at,
      endedOn: r.ended_on,
    }))
    .sort((a, b) => (a.status === b.status ? 0 : a.status === "ACTIVE" ? -1 : 1));
}

/**
 * Joins a household with a new invite code, on the account she already has
 * (join_household_with_invite). Only when she isn't employed anywhere right
 * now; the review-terms screen shows the terms first, same as a first claim.
 */
export async function joinHousehold(code: string): Promise<{ helperId: string }> {
  const { data, error } = await supabase
    .rpc("join_household_with_invite", { p_invite_code: code })
    .maybeSingle();
  if (error || !data) {
    if (!error) throw new Error("Hindi nakasali. Subukan ulit.");
    if (/still employed/i.test(error.message)) {
      throw new Error("May household ka pa ngayon. Isa lang ang pwedeng aktibo sa isang panahon.");
    }
    if (/not found|already claimed/i.test(error.message)) {
      throw new Error("Hindi na magagamit ang code na ito. Humingi ng bago sa employer mo.");
    }
    throw new Error(error.message);
  }
  return { helperId: (data as { helper_id: string }).helper_id };
}

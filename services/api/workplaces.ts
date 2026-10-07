import { supabase } from "@/services/supabase";

// Where she works (LINARA's supabase/add-shared-staff-and-places.sql): her
// home household, which employs and pays her, and any other household of the
// same family she also works in. Before that SQL is applied every read here
// comes back empty, and the app behaves as it did with one household.

const isMissing = (error: { code?: string; message?: string } | null) =>
  !!error &&
  (error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.code === "PGRST202" ||
    /could not find the function|does not exist/i.test(error.message ?? ""));

export interface Workplace {
  householdId: string;
  name: string;
  /** The household that employs her. */
  isHome: boolean;
  teamId: string | null;
  teamName: string | null;
}

export async function getMyWorkplaces(): Promise<Workplace[]> {
  const { data, error } = await supabase.rpc("my_workplaces");
  if (isMissing(error)) return [];
  if (error) throw new Error(error.message);
  return (
    (data ?? []) as {
      household_id: string;
      name: string;
      is_home: boolean;
      team_id: string | null;
      team_name: string | null;
    }[]
  ).map((r) => ({
    householdId: r.household_id,
    name: r.name,
    isHome: r.is_home,
    teamId: r.team_id,
    teamName: r.team_name,
  }));
}

/** The family's houses, for naming the ends of a trip. */
export async function getFamilyHouses(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase.rpc("family_households");
  if (isMissing(error)) return [];
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; name: string }[];
}

/** Saved places (School, Office) of every house she works in. */
export async function getPlaces(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase.from("household_places").select("id, name");
  if (isMissing(error)) return [];
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; name: string }[];
}

/** Teams she also covers, besides her team in each house. */
export async function getMyCoveredTeams(): Promise<string[]> {
  const { data, error } = await supabase.from("helper_team_covers").select("household_teams(name)");
  if (isMissing(error)) return [];
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((row) => {
      const t = (row as { household_teams: { name: string } | { name: string }[] | null })
        .household_teams;
      return Array.isArray(t) ? t[0]?.name : t?.name;
    })
    .filter((n): n is string => !!n);
}

export interface TeamDayTask {
  id: string;
  title: string;
  scheduledStart: string;
  status: "todo" | "in_progress" | "done" | "blocked";
  householdId: string;
  helperName: string;
  teamName: string;
  from: PlaceRef | null;
  to: PlaceRef | null;
}

export type PlaceRef = { kind: "house" | "place"; id: string };

export const placeRef = (house: string | null, place: string | null): PlaceRef | null =>
  house ? { kind: "house", id: house } : place ? { kind: "place", id: place } : null;

/**
 * "My team's day": her teammates' tasks today, in every team she's on or
 * covers. Who, what, when, where and status only -- the function never
 * returns notes, photos or comments.
 */
export async function getTeamDay(from: Date, to: Date): Promise<TeamDayTask[]> {
  const { data, error } = await supabase.rpc("team_day", {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  if (isMissing(error)) return [];
  if (error) throw new Error(error.message);
  return (
    (data ?? []) as {
      ticket_id: string;
      title: string;
      scheduled_start: string;
      status: TeamDayTask["status"];
      household_id: string;
      helper_name: string;
      team_name: string;
      from_household_id: string | null;
      from_place_id: string | null;
      to_household_id: string | null;
      to_place_id: string | null;
    }[]
  )
    .map((r) => ({
      id: r.ticket_id,
      title: r.title,
      scheduledStart: r.scheduled_start,
      status: r.status,
      householdId: r.household_id,
      helperName: r.helper_name,
      teamName: r.team_name,
      from: placeRef(r.from_household_id, r.from_place_id),
      to: placeRef(r.to_household_id, r.to_place_id),
    }))
    .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));
}

import { supabase } from "@/services/supabase";

export interface TermsOnFile {
  station: string;
  employment: "live-in" | "live-out" | null;
  shiftStart: string;
  shiftEnd: string;
  breakStart: string | null;
  breakEnd: string | null;
  weeklyRestDay: number;
  monthlyRate: number;
  paydayInterval: "semi_monthly" | "monthly";
  /** When the household's record of her arrangement was created. */
  recordSince: string;
  /** Her last working day, once that household ended her employment. */
  endedOn: string | null;
  /** The last day she gave notice for, while still employed. */
  noticeLastDay: string | null;
  noticeNote: string | null;
  /** Her team (the part of the house she works in), when the household uses teams. */
  team: string | null;
  /** Labels the household gave her; she sees every one (LINARA add-teams-and-labels.sql). */
  labels: string[];
}

/**
 * The terms the household has on file for her, read-only. The concept doc's
 * "standing transparency view": the same record she reviewed when claiming,
 * visible any time, not only once. helper_profiles_isolation scopes it to her
 * household, and helper_profiles_own_read lets her read the rows of
 * households she has left; the id filter keeps it to one employment.
 */
export async function getMyTermsOnFile(helperId: string): Promise<TermsOnFile> {
  const { data, error } = await supabase
    .from("helper_profiles")
    // "*" so columns from later migrations (ended_on, started_on) are read
    // when present without breaking before they are applied.
    .select("*")
    .eq("id", helperId)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Terms not found");
  }

  return {
    station: data.station,
    employment: data.employment,
    shiftStart: data.shift_start,
    shiftEnd: data.shift_end,
    breakStart: data.break_start,
    breakEnd: data.break_end,
    weeklyRestDay: data.weekly_rest_day,
    monthlyRate: Number(data.monthly_rate),
    paydayInterval: data.payday_interval,
    // Her real first day when the household set one; the invite date before.
    recordSince: data.started_on ?? data.created_at,
    endedOn: data.ended_on ?? null,
    noticeLastDay: data.notice_last_day ?? null,
    noticeNote: data.notice_note ?? null,
    ...(await readTeamAndLabels(helperId, data.team_id ?? null)),
  };
}

/**
 * Her team's name and her labels. RLS lets her read only her own labels, and
 * only while she works in that household. Before the web's
 * add-teams-and-labels.sql is applied the tables don't exist; that, or any
 * other failure, reads as no team and no labels rather than failing the
 * whole Record.
 */
async function readTeamAndLabels(
  helperId: string,
  teamId: string | null,
): Promise<{ team: string | null; labels: string[] }> {
  const [team, labels] = await Promise.all([
    teamId
      ? supabase.from("household_teams").select("name").eq("id", teamId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("helper_labels").select("household_labels(name)").eq("helper_id", helperId),
  ]);
  const names = (labels.error ? [] : (labels.data ?? []))
    .map((row) => {
      const l = (row as { household_labels: { name: string } | { name: string }[] | null })
        .household_labels;
      return Array.isArray(l) ? l[0]?.name : l?.name;
    })
    .filter((n): n is string => !!n)
    .sort((a, b) => a.localeCompare(b));
  return {
    team: team.error ? null : ((team.data as { name: string } | null)?.name ?? null),
    labels: names,
  };
}

export type TermsFlagField = "wage" | "shift" | "restDay" | "station" | "employment" | "other";

/**
 * "May mali?": tells the manager a term on file looks wrong. The same
 * invite_flags row the claim-time flag writes (flag_invite only accepts an
 * unclaimed invite, so a claimed helper writes the row directly; the
 * household-scoped invite_flags_isolation policy admits her). It shows in the
 * manager's Needs You until they mark it resolved.
 */
export async function flagMyTerms(
  helperId: string,
  field: TermsFlagField,
  note: string,
): Promise<void> {
  const { error } = await supabase
    .from("invite_flags")
    .insert({ invite_id: helperId, field, note: note || null });

  if (error) {
    throw new Error(error.message);
  }
}

/** How many tasks she has finished in this household, counted on the server. */
export async function getMyTasksDone(helperId: string): Promise<number> {
  const { count, error } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("helper_id", helperId)
    .eq("status", "done");

  if (error) {
    throw new Error(error.message);
  }
  return count ?? 0;
}

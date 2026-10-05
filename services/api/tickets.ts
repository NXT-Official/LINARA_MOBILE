import {
  isLaterThanToday,
  reopenedStatus,
  startOfToday,
  startOfTomorrow,
  summarizeToday,
} from "@/lib/today";
import { supabase } from "@/services/supabase";
import { placeRef, type PlaceRef } from "@/services/api/workplaces";

export interface FocusTaskSop {
  id: string;
  title: string;
  description: string;
  standardImageUrl: string | null;
  steps: string[];
  toolsRequired: string[];
  safetyProtocol: string | null;
}

export interface FocusTask {
  id: string;
  title: string;
  notes: string | null;
  status: "todo" | "in_progress" | "done" | "blocked" | "cancelled";
  scheduledStart: string;
  /** Sent off-hours through the manager's override or emergency path. */
  afterHours: boolean;
  /** Her "can't now" reason, while the ticket is on hold. */
  blockReason: string | null;
  /** Who added it, so in a multi-admin home she's never left with an ambiguous "Ma'am said". */
  createdById: string | null;
  createdByName: string | null;
  sop: FocusTaskSop | null;
  /** The house it's at: hers, or one of the family's she also works in. */
  householdId: string;
  /** A trip's ends, when it's a trip (LINARA add-shared-staff-and-places.sql). */
  from: PlaceRef | null;
  to: PlaceRef | null;
}

/** The house and trip columns, read with "*" so they're simply absent before that SQL. */
interface PlaceColumns {
  household_id: string;
  from_household_id?: string | null;
  from_place_id?: string | null;
  to_household_id?: string | null;
  to_place_id?: string | null;
}

const placesOf = (row: PlaceColumns) => ({
  householdId: row.household_id,
  from: placeRef(row.from_household_id ?? null, row.from_place_id ?? null),
  to: placeRef(row.to_household_id ?? null, row.to_place_id ?? null),
});

interface TicketWithSopRow extends PlaceColumns {
  id: string;
  title: string;
  notes: string | null;
  status: FocusTask["status"];
  scheduled_start: string;
  is_after_hours: boolean;
  emergency: boolean;
  block_reason: string | null;
  created_by: string | null;
  created_by_profile: { full_name: string | null } | null;
  house_sops: {
    id: string;
    title: string;
    description: string;
    standard_image_url: string | null;
    steps: string[] | null;
    tools_required: string[] | null;
    safety_protocol: string | null;
  } | null;
}

/**
 * Tickets that are hers to see today. Leaves out a remote admin's suggestion
 * still waiting for on-site approval (`suggested`), anything held off the board
 * until the manager reopens it (`queued`), and -- via `isLaterThanToday` --
 * anything scheduled for a later day. The web Pass hides the same three.
 * RLS on tickets only scopes by household, so the `helper_id` filter is what
 * keeps this to her own queue.
 */
async function getMyTodayRows<T>(helperId: string, columns: string): Promise<T[]> {
  const now = new Date();
  const { data, error } = await supabase
    .from("tickets")
    .select(columns)
    .eq("helper_id", helperId)
    .eq("suggested", false)
    .eq("queued", false)
    // Two .or() groups are ANDed: not a later day's ticket (unless started),
    // and either unfinished or from today -- so her finished history isn't
    // re-read every time.
    .or(`status.eq.in_progress,scheduled_start.lt.${startOfTomorrow(now).toISOString()}`)
    .or(`status.neq.done,scheduled_start.gte.${startOfToday(now).toISOString()}`)
    // A task the manager cancelled isn't hers to do; My Week still shows it.
    .neq("status", "cancelled")
    .order("scheduled_start", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return (
    (data ?? []) as unknown as (T & { status: FocusTask["status"]; scheduled_start: string })[]
  ).filter(
    (row) => !isLaterThanToday({ status: row.status, scheduledStart: row.scheduled_start }, now),
  );
}

function toFocusTask(row: TicketWithSopRow): FocusTask {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    status: row.status,
    scheduledStart: row.scheduled_start,
    afterHours: row.is_after_hours || row.emergency,
    blockReason: row.block_reason,
    createdById: row.created_by,
    createdByName: row.created_by_profile?.full_name ?? null,
    sop: row.house_sops
      ? {
          id: row.house_sops.id,
          title: row.house_sops.title,
          description: row.house_sops.description,
          standardImageUrl: row.house_sops.standard_image_url,
          steps: row.house_sops.steps ?? [],
          toolsRequired: row.house_sops.tools_required ?? [],
          safetyProtocol: row.house_sops.safety_protocol,
        }
      : null,
    ...placesOf(row),
  };
}

/**
 * Every task still open today, in time order, for the Active Focus Card's
 * deck (roadmap Story 7, step 1): she swipes through them and works them in
 * whatever order the day needs. The card opens on `pickFocus`'s choice.
 * Done tickets never show; she unticks them on the list instead.
 */
export async function getFocusTasks(helperId: string): Promise<FocusTask[]> {
  const rows = await getMyTodayRows<TicketWithSopRow>(
    helperId,
    "*, created_by_profile:user_profiles(full_name), house_sops(id, title, description, standard_image_url, steps, tools_required, safety_protocol)",
  );
  return rows.filter((row) => row.status !== "done").map(toFocusTask);
}

/** One row of "Lahat ng task ngayon": every task of hers today, done ones included. */
export interface TodayTask {
  id: string;
  title: string;
  notes: string | null;
  status: FocusTask["status"];
  scheduledStart: string;
  blockReason: string | null;
  /** She pressed Start at some point, so unticking it puts it back as "Ginagawa". */
  started: boolean;
  householdId: string;
  from: PlaceRef | null;
  to: PlaceRef | null;
}

/** Everything on her list today, in time order -- the same tickets the focus card picks from. */
export async function getTodayTasks(helperId: string): Promise<TodayTask[]> {
  const rows = await getMyTodayRows<
    PlaceColumns & {
      id: string;
      title: string;
      notes: string | null;
      status: FocusTask["status"];
      scheduled_start: string;
      block_reason: string | null;
      actual_start: string | null;
    }
  >(helperId, "*");
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    notes: row.notes,
    status: row.status,
    scheduledStart: row.scheduled_start,
    blockReason: row.block_reason,
    started: row.actual_start != null,
    ...placesOf(row),
  }));
}

export interface TodayProgress {
  total: number;
  done: number;
  onHold: number;
}

/**
 * Today's tally for the close ("8 of 8, tapos"): today's tickets plus unfinished
 * ones carried over, and how many are done. Same visibility rules as the focus
 * card; a ticket finished on an earlier day isn't part of today.
 */
export async function getTodayProgress(helperId: string): Promise<TodayProgress> {
  const rows = await getMyTodayRows<{ status: FocusTask["status"]; scheduled_start: string }>(
    helperId,
    "status, scheduled_start",
  );
  return summarizeToday(
    rows.map((row) => ({ status: row.status, scheduledStart: row.scheduled_start })),
    new Date(),
  );
}

export interface WeekTask {
  id: string;
  title: string;
  status: FocusTask["status"];
  scheduledStart: string;
  /** The appointment this prepares for, e.g. "Sir's flight" -- only hers, never the household's whole calendar. */
  appointmentTitle: string | null;
  /** Its time moved because the manager moved the appointment. */
  moved: boolean;
  /** Approved but held until the manager reopens the board. */
  waiting: boolean;
  createdById: string | null;
  createdByName: string | null;
}

interface WeekTaskRow {
  id: string;
  title: string;
  status: FocusTask["status"];
  scheduled_start: string;
  appointment_title: string | null;
  reschedule_notice: unknown;
  queued: boolean;
  created_by: string | null;
  created_by_profile: { full_name: string | null } | null;
}

/**
 * Her own tickets scheduled in [from, to), for My Week's week pages and month
 * grid. Includes ones queued for when the board reopens (already approved),
 * but never a remote admin's suggestion still awaiting approval. Appointments
 * appear only through the prep tasks assigned to her, as the concept doc
 * asks: her filtered day, not the household's private schedule.
 */
export async function getMyTasksBetween(
  helperId: string,
  from: Date,
  to: Date,
): Promise<WeekTask[]> {
  const { data, error } = await supabase
    .from("tickets")
    .select(
      "id, title, status, scheduled_start, appointment_title, reschedule_notice, queued, created_by, created_by_profile:user_profiles(full_name)",
    )
    .eq("helper_id", helperId)
    .eq("suggested", false)
    .gte("scheduled_start", from.toISOString())
    .lt("scheduled_start", to.toISOString())
    .order("scheduled_start", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as WeekTaskRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    scheduledStart: row.scheduled_start,
    appointmentTitle: row.appointment_title,
    moved: row.reschedule_notice != null,
    waiting: row.queued,
    createdById: row.created_by,
    createdByName: row.created_by_profile?.full_name ?? null,
  }));
}

export interface MovedTask {
  id: string;
  title: string;
  scheduledStart: string;
  /** Where it was before the move; null on notices written before O14 was fixed. */
  previousStart: string | null;
  /** The appointment whose move shifted it; null when a manager moved it by hand. */
  appointmentTitle: string | null;
  /** Who moved it by hand (../LINARA/KNOWN_GAPS.md O20), when that's how it moved. */
  movedBy: string | null;
}

/**
 * Her upcoming tickets whose time moved: because the manager moved their
 * appointment (rescheduleAppointmentFn), or moved the task itself on the
 * planner or in Edit task (updateTicketFn, ../LINARA/KNOWN_GAPS.md O20).
 * Both write tickets.reschedule_notice. Concept doc §7: flag the affected worker rather
 * than silently shift her board. The old time comes from the notice's
 * oldStartIso instant, formatted on her phone. Older notices only carry a
 * string the web server formatted in its own time zone (../LINARA/
 * KNOWN_GAPS.md O14), which is wrong for her, so those show the new time only.
 */
export async function getMovedTasks(helperId: string): Promise<MovedTask[]> {
  const { data, error } = await supabase
    .from("tickets")
    .select("id, title, scheduled_start, reschedule_notice")
    .eq("helper_id", helperId)
    .eq("suggested", false)
    .not("status", "in", "(done,cancelled)")
    .not("reschedule_notice", "is", null)
    .gte("scheduled_start", startOfToday(new Date()).toISOString())
    .order("scheduled_start", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (
    (data ?? []) as {
      id: string;
      title: string;
      scheduled_start: string;
      reschedule_notice: {
        oldStartIso?: string;
        appointmentTitle?: string;
        movedBy?: string;
      } | null;
    }[]
  ).map((row) => ({
    id: row.id,
    title: row.title,
    scheduledStart: row.scheduled_start,
    previousStart: row.reschedule_notice?.oldStartIso ?? null,
    appointmentTitle: row.reschedule_notice?.appointmentTitle ?? null,
    movedBy: row.reschedule_notice?.movedBy ?? null,
  }));
}

/**
 * Inserts a new ticket -- the first write path into `public.tickets` anywhere
 * in either app (see ../LINARA/KNOWN_GAPS.md gap #4). Used by the "Promote to
 * Board" action (roadmap Story 9) to turn a private scratchpad note into a
 * shared task card. `householdId` must match the caller's own household for
 * `tickets_isolation` RLS to accept the insert.
 */
export async function createTicket(params: {
  householdId: string;
  helperId: string;
  createdBy: string;
  title: string;
  notes: string | null;
  scheduledStart: string;
}): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("tickets")
    .insert({
      household_id: params.householdId,
      helper_id: params.helperId,
      created_by: params.createdBy,
      title: params.title,
      notes: params.notes,
      status: "todo",
      scheduled_start: params.scheduledStart,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to create ticket");
  }

  return { id: data.id };
}

/** Marks a ticket as started, stamping `actual_start` for the shift record. */
export async function startTicket(ticketId: string): Promise<void> {
  const { error } = await supabase
    .from("tickets")
    .update({ status: "in_progress", actual_start: new Date().toISOString() })
    .eq("id", ticketId);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Marks a ticket done, stamping `actual_end` for the shift record. Pass
 * `photoEvidenceUrl` for tickets that require photo proof (e.g. a Palengke
 * Run receipt, roadmap Story 8 step 4) to persist it in the same write.
 * Works from any open status: she may tick off a task she never pressed
 * Start on, or one she had put on hold and then sorted out.
 */
export async function completeTicket(ticketId: string, photoEvidenceUrl?: string): Promise<void> {
  const { error } = await supabase
    .from("tickets")
    .update({
      status: "done",
      actual_end: new Date().toISOString(),
      block_reason: null,
      ...(photoEvidenceUrl ? { photo_evidence_url: photoEvidenceUrl } : {}),
    })
    .eq("id", ticketId);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Unticks a task she marked done by mistake: back to "Ginagawa" if she had
 * started it, otherwise to "Gagawin", with the finish time cleared.
 */
export async function reopenTicket(ticketId: string, started: boolean): Promise<void> {
  const { error } = await supabase
    .from("tickets")
    .update({ status: reopenedStatus(started), actual_end: null })
    .eq("id", ticketId);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Fixes her own task's time or note (../LINARA/KNOWN_GAPS.md O31). The
 * database lets her change only these two (and her progress) on a task that's
 * hers and still open (../LINARA/supabase/add-helper-task-edit.sql); the title
 * and who it's for stay the manager's. Rest owed follows when she actually
 * finishes, not the scheduled time, so moving it changes nothing there.
 */
export async function editMyTicket(
  ticketId: string,
  patch: { scheduledStart: string; notes: string | null },
): Promise<void> {
  const { error } = await supabase
    .from("tickets")
    .update({ scheduled_start: patch.scheduledStart, notes: patch.notes })
    .eq("id", ticketId);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * "Can't now": puts the ticket on hold with her reason. The manager's Pass
 * shows it in Needs You, where they can reply or put it back on the board.
 * Being able to say "not now" is what separates a colleague from a
 * subordinate (concept doc §8), so there is no approval step.
 */
export async function blockTicket(ticketId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from("tickets")
    .update({ status: "blocked", block_reason: reason })
    .eq("id", ticketId);

  if (error) {
    throw new Error(error.message);
  }
}

export interface PalengkeTicket {
  id: string;
  title: string;
  status: FocusTask["status"];
}

/**
 * Finds the helper's active Palengke Run ticket, if any, so the Pantry tab
 * can surface its receipt-capture completion step (roadmap Story 8, step
 * 4). "Palengke Run" isn't a distinct ticket type in the shared schema --
 * the web dashboard identifies it the same way, by title
 * (see ../LINARA/src/features/tasks/task.utils.ts's `isPalengke`).
 */
export async function getActivePalengkeTicket(helperId: string): Promise<PalengkeTicket | null> {
  const { data, error } = await supabase
    .from("tickets")
    .select("id, title, status")
    .eq("helper_id", helperId)
    .not("status", "in", "(done,cancelled)")
    .or("title.ilike.%palengke%,title.ilike.%marketing run%")
    .order("scheduled_start", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as PalengkeTicket | null;
}

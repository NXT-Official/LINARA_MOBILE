import {
  isLaterThanToday,
  pickFocus,
  startOfToday,
  startOfTomorrow,
  summarizeToday,
} from "@/lib/today";
import { supabase } from "@/services/supabase";

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
  status: "todo" | "in_progress" | "done" | "blocked";
  scheduledStart: string;
  /** Sent off-hours through the manager's override or emergency path. */
  afterHours: boolean;
  /** Her "can't now" reason, while the ticket is on hold. */
  blockReason: string | null;
  /** Who added it, so in a multi-admin home she's never left with an ambiguous "Ma'am said". */
  createdById: string | null;
  createdByName: string | null;
  sop: FocusTaskSop | null;
}

interface TicketWithSopRow {
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

/**
 * The one ticket for the Active Focus Card (roadmap Story 7, step 1): what
 * she's already doing, else the earliest not-yet-started, else one on hold
 * (see `pickFocus`). Done tickets never show.
 */
export async function getFocusTask(helperId: string): Promise<FocusTask | null> {
  const rows = (
    await getMyTodayRows<TicketWithSopRow>(
      helperId,
      "id, title, notes, status, scheduled_start, is_after_hours, emergency, block_reason, created_by, created_by_profile:user_profiles(full_name), house_sops(id, title, description, standard_image_url, steps, tools_required, safety_protocol)",
    )
  ).filter((row) => row.status !== "done");

  const focus = pickFocus(rows.map((row) => ({ ...row, scheduledStart: row.scheduled_start })));
  if (!focus) {
    return null;
  }

  return {
    id: focus.id,
    title: focus.title,
    notes: focus.notes,
    status: focus.status,
    scheduledStart: focus.scheduled_start,
    afterHours: focus.is_after_hours || focus.emergency,
    blockReason: focus.block_reason,
    createdById: focus.created_by,
    createdByName: focus.created_by_profile?.full_name ?? null,
    sop: focus.house_sops
      ? {
          id: focus.house_sops.id,
          title: focus.house_sops.title,
          description: focus.house_sops.description,
          standardImageUrl: focus.house_sops.standard_image_url,
          steps: focus.house_sops.steps ?? [],
          toolsRequired: focus.house_sops.tools_required ?? [],
          safetyProtocol: focus.house_sops.safety_protocol,
        }
      : null,
  };
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
 */
export async function completeTicket(ticketId: string, photoEvidenceUrl?: string): Promise<void> {
  const { error } = await supabase
    .from("tickets")
    .update({
      status: "done",
      actual_end: new Date().toISOString(),
      ...(photoEvidenceUrl ? { photo_evidence_url: photoEvidenceUrl } : {}),
    })
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
    .neq("status", "done")
    .or("title.ilike.%palengke%,title.ilike.%marketing run%")
    .order("scheduled_start", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as PalengkeTicket | null;
}

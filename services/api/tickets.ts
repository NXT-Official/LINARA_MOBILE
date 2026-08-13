import { supabase } from "@/services/supabase";

export interface FocusTaskSop {
  title: string;
  description: string;
  standardImageUrl: string | null;
}

export interface FocusTask {
  id: string;
  title: string;
  notes: string | null;
  status: "todo" | "in_progress" | "done" | "blocked";
  scheduledStart: string;
  sop: FocusTaskSop | null;
}

interface TicketWithSopRow {
  id: string;
  title: string;
  notes: string | null;
  status: FocusTask["status"];
  scheduled_start: string;
  house_sops: {
    title: string;
    description: string;
    standard_image_url: string | null;
  } | null;
}

/**
 * Fetches the single highest-priority uncompleted ticket for the Active
 * Focus Card (roadmap Story 7, step 1). A ticket already `in_progress`
 * outranks anything still `todo` or `blocked`; ties break on the earliest
 * `scheduled_start`. `helper_profiles_isolation`-adjacent RLS on tickets
 * only scopes by household_id, so the `helper_id` filter here is what
 * actually keeps this to the signed-in helper's own queue.
 */
export async function getFocusTask(helperId: string): Promise<FocusTask | null> {
  const { data, error } = await supabase
    .from("tickets")
    .select(
      "id, title, notes, status, scheduled_start, house_sops(title, description, standard_image_url)",
    )
    .eq("helper_id", helperId)
    .neq("status", "done")
    .order("scheduled_start", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as unknown as TicketWithSopRow[];
  if (rows.length === 0) {
    return null;
  }

  const inProgress = rows.find((row) => row.status === "in_progress");
  const focus = inProgress ?? rows[0];

  return {
    id: focus.id,
    title: focus.title,
    notes: focus.notes,
    status: focus.status,
    scheduledStart: focus.scheduled_start,
    sop: focus.house_sops
      ? {
          title: focus.house_sops.title,
          description: focus.house_sops.description,
          standardImageUrl: focus.house_sops.standard_image_url,
        }
      : null,
  };
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

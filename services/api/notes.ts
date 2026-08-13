import { supabase } from "@/services/supabase";

export interface HelperNote {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
}

interface HelperNoteRow {
  id: string;
  text: string;
  done: boolean;
  created_at: string;
}

/**
 * Lists the signed-in helper's own private scratchpad notes, newest first.
 * `helper_notes_privacy` RLS (../LINARA/architecture.md Section 5.2) already
 * restricts this to the caller's own rows -- the `helper_id` filter here
 * just avoids an unnecessary round-trip through auth.uid() resolution twice.
 */
export async function getMyNotes(helperId: string): Promise<HelperNote[]> {
  const { data, error } = await supabase
    .from("helper_notes")
    .select("id, text, done, created_at")
    .eq("helper_id", helperId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: HelperNoteRow) => ({
    id: row.id,
    text: row.text,
    done: row.done,
    createdAt: row.created_at,
  }));
}

/** Adds a typed private note to the scratchpad. */
export async function createTextNote(helperId: string, text: string): Promise<void> {
  const { error } = await supabase
    .from("helper_notes")
    .insert({ helper_id: helperId, text, done: false });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Adds a note from a transcribed voice memo. The raw audio itself is never
 * persisted here -- see ../LINARA/KNOWN_GAPS.md gap #8 for why `voice` stays
 * unset (mobile's AAC/M4A recordings don't match the shared storage bucket's
 * audio/webm-only allowlist).
 */
export async function createVoiceNote(helperId: string, transcript: string): Promise<void> {
  const { error } = await supabase
    .from("helper_notes")
    .insert({ helper_id: helperId, text: transcript, done: false });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Marks a note as promoted (reuses the `done` boolean) so "Promote to Board"
 * can't be tapped twice on the same note.
 */
export async function markNotePromoted(noteId: string): Promise<void> {
  const { error } = await supabase.from("helper_notes").update({ done: true }).eq("id", noteId);

  if (error) {
    throw new Error(error.message);
  }
}

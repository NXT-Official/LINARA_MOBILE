import { supabase } from "@/services/supabase";

/**
 * Updates on a task: a thread she and the household's managers both read and
 * add to (../LINARA/supabase/add-ticket-comments.sql). RLS limits it to tasks
 * assigned to her; the database stamps the author, so only the text is sent.
 */
export interface TaskComment {
  id: string;
  authorId: string | null;
  authorName: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
}

interface TaskCommentRow {
  id: string;
  author_id: string | null;
  author_name: string;
  body: string;
  created_at: string;
  edited_at: string | null;
}

const toComment = (row: TaskCommentRow): TaskComment => ({
  id: row.id,
  authorId: row.author_id,
  authorName: row.author_name,
  body: row.body,
  createdAt: row.created_at,
  editedAt: row.edited_at,
});

/** Oldest first. Empty before the migration is applied. */
export async function getTaskComments(ticketId: string): Promise<TaskComment[]> {
  const { data, error } = await supabase
    .from("ticket_comments")
    .select("id, author_id, author_name, body, created_at, edited_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  if (error) {
    if (/ticket_comments/.test(error.message)) return [];
    throw new Error(error.message);
  }
  return ((data ?? []) as TaskCommentRow[]).map(toComment);
}

export async function addTaskComment(ticketId: string, body: string): Promise<void> {
  const { error } = await supabase
    .from("ticket_comments")
    .insert({ ticket_id: ticketId, body: body.trim() });
  if (error) throw new Error(error.message);
}

/** Her own only; RLS ignores anyone else's. */
export async function deleteTaskComment(commentId: string): Promise<void> {
  const { error } = await supabase.from("ticket_comments").delete().eq("id", commentId);
  if (error) throw new Error(error.message);
}

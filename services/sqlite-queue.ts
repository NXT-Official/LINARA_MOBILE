import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

const DB_NAME = "linara_offline.db";

/**
 * The offline-capable mutations wired up in roadmap Story 10: task status
 * changes (with an optional local receipt photo awaiting upload) and
 * private scratchpad notes. Voice notes and grocery checklist edits stay
 * online-only -- Whisper transcription has no offline meaning, and the
 * three-flow diagram in architecture.md Section 4 only calls out task
 * status, receipt capture, and notes.
 */
export type SyncActionType = "start_ticket" | "complete_ticket" | "add_text_note";

export interface StartTicketPayload {
  ticketId: string;
}

export interface CompleteTicketPayload {
  ticketId: string;
  /** Storage object paths must be `<household_id>/...`-prefixed per ../LINARA_MOBILE/supabase/storage-policies.sql. */
  householdId: string;
}

export interface AddTextNotePayload {
  helperId: string;
  text: string;
}

export type SyncActionPayload = StartTicketPayload | CompleteTicketPayload | AddTextNotePayload;

export interface QueuedSyncAction {
  id: string;
  actionType: SyncActionType;
  payload: SyncActionPayload;
  /** Local file URI for a not-yet-uploaded receipt photo, if any. */
  filePath: string | null;
  createdAt: number;
}

interface SyncActionRow {
  id: string;
  action_type: SyncActionType;
  payload: string;
  file_path: string | null;
  created_at: number;
}

let dbPromise: Promise<SQLiteDatabase> | null = null;

function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS offline_sync_queue (
          id TEXT PRIMARY KEY,
          action_type TEXT NOT NULL,
          payload TEXT NOT NULL,
          file_path TEXT,
          created_at INTEGER NOT NULL
        );
      `);
      return db;
    });
  }
  return dbPromise;
}

/**
 * Buffers a mutation locally while the device is offline (roadmap Story 10
 * step 2 / architecture.md Section 6.2). `use-offline-sync.ts` drains this
 * table in chronological order once connectivity returns.
 */
export async function enqueueSyncAction(
  actionType: SyncActionType,
  payload: SyncActionPayload,
  filePath?: string | null,
): Promise<QueuedSyncAction> {
  const db = await getDb();
  const action: QueuedSyncAction = {
    id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    actionType,
    payload,
    filePath: filePath ?? null,
    createdAt: Date.now(),
  };

  await db.runAsync(
    "INSERT INTO offline_sync_queue (id, action_type, payload, file_path, created_at) VALUES (?, ?, ?, ?, ?)",
    [
      action.id,
      action.actionType,
      JSON.stringify(action.payload),
      action.filePath,
      action.createdAt,
    ],
  );

  return action;
}

/** Every buffered action, oldest first, so replays preserve chronological order. */
export async function getQueuedActions(): Promise<QueuedSyncAction[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SyncActionRow>(
    "SELECT id, action_type, payload, file_path, created_at FROM offline_sync_queue ORDER BY created_at ASC",
  );

  return rows.map((row) => ({
    id: row.id,
    actionType: row.action_type,
    payload: JSON.parse(row.payload) as SyncActionPayload,
    filePath: row.file_path,
    createdAt: row.created_at,
  }));
}

/** Clears one row once it has synced successfully. */
export async function removeQueuedAction(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM offline_sync_queue WHERE id = ?", [id]);
}

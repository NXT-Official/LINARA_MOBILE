# Story 10: SQLite Offline-First Sync Queue & Realtime

## Objective

Implement local SQLite transaction queues, intercept network disconnections, buffer status mutations and photos, and automate sequential background synchronization upon reconnection.

## Context References

- **PRD Specs:** [`../LINARA_MOBILE/plan.md`](../LINARA_MOBILE/plan.md:Section 4)
- **Technical Architecture:** [`../LINARA_MOBILE/architecture.md`](../LINARA_MOBILE/architecture.md:Section 3.2 & 10)
- **Existing Asset References:** [`src/lib/offline-queue.ts`](src/lib/offline-queue.ts) (reference for web offline trackers).

## Explicit Dependencies

- `Story_9_VoiceToTaskPromoterAndSOPTranslator.md`

## Explicit Inputs

- **Supabase Client:** Realtime broadcast channel methods.
- **Hardware API:** NetInfo or native connection monitors.

## Step-by-Step Implementation Instructions

1. Setup a local SQLite database in the mobile app, declaring table schemas for offline actions:
   ```sql
   CREATE TABLE IF NOT EXISTS offline_sync_queue (
     id TEXT PRIMARY KEY,
     action_type TEXT,
     payload TEXT,
     file_path TEXT,
     created_at INTEGER
   );
   ```
2. Build network interceptors using `@react-native-community/netinfo`. If `isConnected === false`, writes are intercepted, saved locally in SQLite, and rendered instantly in the offline UI cache.
3. Write background listeners to detect internet recovery.
4. When online, the background driver sequentially:
   - Uploads compressed JPEG images from SQLite file references to Supabase Storage.
   - Updates corresponding payload fields with the returned storage URL.
   - Triggers sequential backend mutations matching chronological queue times.
   - Clears synced rows from SQLite.

## Expected Output

- Persistent SQLite table schemas storing buffered offline edits.
- NetInfo integration hooks reacting automatically to connectivity changes.
- Background drivers handling image uploads and sequential transaction replays.

## Acceptance Criteria

- Completing tasks or adding notes while offline buffers rows in SQLite and updates the local UI instantly.
- Reconnecting to the internet automatically uploads local images and syncs all database changes sequentially.
- Local SQLite tables are completely cleared of successfully synced transactions.

## Definition of Done

- Offline mutations operate seamlessly with zero database data loss.
- Outbox sync processes run in the background.
- Concurrent client updates are synced sequentially based on timestamps.

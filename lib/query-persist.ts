import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { Query } from "@tanstack/react-query";

import { queryClient } from "./query-client";

/**
 * Record ko kept on the phone, so it opens with no internet (a spinner
 * before: ../LINARA/KNOWN_GAPS.md O55, the user's choice 2026-10-09). Only the
 * queries that screen shows are saved; everything else is live as before.
 * The copy is cleared on sign-out (clearSavedRecord), so the next person on
 * the phone never sees it.
 */
const RECORD_KEYS = new Set([
  "my-employments",
  "terms-on-file",
  "my-workplaces",
  "my-covered-teams",
  "payslips",
  "rest-off-requests",
  "tasks-done",
  "leave",
]);

/** How long a saved copy is kept without being refreshed. */
export const SAVED_RECORD_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

// Kept in memory as long as on disk, or a restored copy would be dropped
// after the usual five minutes and the next save would lose it.
for (const key of RECORD_KEYS) {
  queryClient.setQueryDefaults([key], { gcTime: SAVED_RECORD_MAX_AGE });
}

export const recordPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "linara-saved-record",
});

export const shouldSaveQuery = (query: Query) =>
  query.state.status === "success" && RECORD_KEYS.has(String(query.queryKey[0]));

export async function clearSavedRecord(): Promise<void> {
  await recordPersister.removeClient();
}

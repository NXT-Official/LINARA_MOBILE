import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";

import {
  getQueuedActions,
  removeQueuedAction,
  type AddTextNotePayload,
  type CompleteTicketPayload,
  type StartTicketPayload,
} from "@/services/sqlite-queue";
import { completeTicket, startTicket } from "@/services/api/tickets";
import { createTextNote } from "@/services/api/notes";
import { uploadEvidenceImage } from "@/services/media-upload";

/**
 * Drains the SQLite sync queue in strict chronological order whenever the
 * device regains connectivity (roadmap Story 10 steps 3-4 / architecture.md
 * Section 6.2's offline-ticket-completion flow). Mounted once at the app
 * shell so buffered work replays regardless of which screen is active when
 * reconnection happens.
 *
 * Stops at the first failure in a run rather than skipping ahead -- a later
 * row can depend on an earlier one applying first (e.g. a ticket must exist
 * before its completion syncs), and the Definition of Done requires strict
 * sequential replay. The next reconnect (or another queue-mutating action)
 * retries from that same row.
 */
export function useOfflineSync(): void {
  const queryClient = useQueryClient();
  const isDraining = useRef(false);

  useEffect(() => {
    const drainQueue = async () => {
      if (isDraining.current) {
        return;
      }
      isDraining.current = true;

      try {
        const queued = await getQueuedActions();
        for (const action of queued) {
          try {
            if (action.actionType === "start_ticket") {
              const payload = action.payload as StartTicketPayload;
              await startTicket(payload.ticketId);
              queryClient.invalidateQueries({ queryKey: ["focus-task"] });
            } else if (action.actionType === "complete_ticket") {
              const payload = action.payload as CompleteTicketPayload;
              let photoUrl: string | undefined;
              if (action.filePath) {
                const storagePath = `${payload.householdId}/tickets/${payload.ticketId}-${action.id}.jpg`;
                const uploaded = await uploadEvidenceImage(action.filePath, storagePath);
                photoUrl = uploaded.signedUrl;
              }
              await completeTicket(payload.ticketId, photoUrl);
              queryClient.invalidateQueries({ queryKey: ["focus-task"] });
              queryClient.invalidateQueries({ queryKey: ["palengke-ticket"] });
            } else if (action.actionType === "add_text_note") {
              const payload = action.payload as AddTextNotePayload;
              await createTextNote(payload.helperId, payload.text);
              queryClient.invalidateQueries({ queryKey: ["helper-notes", payload.helperId] });
            }

            await removeQueuedAction(action.id);
          } catch {
            break;
          }
        }
      } finally {
        isDraining.current = false;
      }
    };

    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      if (online) {
        void drainQueue();
      }
    });

    return () => unsubscribe();
  }, [queryClient]);
}

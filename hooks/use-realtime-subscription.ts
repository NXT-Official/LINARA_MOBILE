import { useEffect, useRef } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { supabase } from "@/services/supabase";

/** The columns this hook reacts to from public.tickets (../LINARA/ARCHITECTURE.md Section 8). */
export interface TicketRealtimeRow {
  id: string;
  household_id: string;
  helper_id: string;
  status: "todo" | "in_progress" | "done" | "blocked";
}

/** The columns this hook reacts to from public.quick_utos (../LINARA/ARCHITECTURE.md Section 8). */
export interface QuickUtoRealtimeRow {
  id: string;
  recipient_id: string;
  ack_state: "sent" | "seen" | "done";
}

export interface RealtimeSubscriptionCallbacks {
  onTicketChange?: (payload: RealtimePostgresChangesPayload<TicketRealtimeRow>) => void;
  onQuickUtoChange?: (payload: RealtimePostgresChangesPayload<QuickUtoRealtimeRow>) => void;
}

/**
 * Subscribes to postgres_changes broadcasts for the tickets and quick_utos
 * assigned to one helper, so screens can react to manager-side edits without
 * polling. Callbacks are read from a ref on every event so callers can pass
 * inline functions without tearing the subscription down on every render;
 * only a change in `helperId` re-subscribes.
 *
 * Deliberately callback-based rather than wired to TanStack Query directly —
 * this story only establishes backend connectivity (see Story_3 roadmap
 * file), not the query cache. Callers that want cache invalidation can pass
 * `queryClient.invalidateQueries` as a callback once that provider exists.
 */
export function useRealtimeSubscription(
  helperId: string | null,
  callbacks: RealtimeSubscriptionCallbacks,
): void {
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  useEffect(() => {
    if (!helperId) {
      return;
    }

    // A topic of its own per subscriber: supabase.channel(name) hands back
    // any live channel already using that name, so a second screen (Today and
    // My Week are both mounted as tabs) would re-attach listeners to an
    // already-joined channel and join it twice -- the same failure fixed on
    // the web in ../LINARA's app-store-provider.
    const channel = supabase
      .channel(`helper-station-${helperId}-${Math.random().toString(36).slice(2, 10)}`)
      .on<TicketRealtimeRow>(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets", filter: `helper_id=eq.${helperId}` },
        (payload) => callbacksRef.current.onTicketChange?.(payload),
      )
      .on<QuickUtoRealtimeRow>(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "quick_utos",
          filter: `recipient_id=eq.${helperId}`,
        },
        (payload) => callbacksRef.current.onQuickUtoChange?.(payload),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [helperId]);
}

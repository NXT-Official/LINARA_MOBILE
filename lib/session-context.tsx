import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";

import { clearSavedRecord } from "@/lib/query-persist";
import { supabase } from "@/services/supabase";

interface SessionContextValue {
  session: Session | null;
  /** True until the persisted AsyncStorage session has been read at least once. */
  isLoading: boolean;
  /** Reads the saved session again, after a start that seems stuck. */
  reload: () => void;
  /**
   * Treats this phone as signed out without waiting on Supabase or storage:
   * the way out when signing out properly stalls. Any session that arrives
   * later (a stalled read finishing) still takes over.
   */
  dropSession: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Mounts once at the app root so every screen can read the active Supabase
 * session synchronously instead of re-querying `supabase.auth` itself. Backs
 * the auth-vs-app route gating in app/index.tsx and app/(app)/_layout.tsx.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch((err: unknown) => {
        // Storage that can't be read: carry on signed out, to the sign-in screen.
        console.warn("[session] Couldn't read the saved session:", (err as Error).message);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const dropSession = useCallback(() => {
    setSession(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    reload();

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // However she was signed out, her saved Record ko goes with her.
      if (event === "SIGNED_OUT") void clearSavedRecord();
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, [reload]);

  return (
    <SessionContext.Provider value={{ session, isLoading, reload, dropSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}

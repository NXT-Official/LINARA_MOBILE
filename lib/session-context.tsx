import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/services/supabase";

interface SessionContextValue {
  session: Session | null;
  /** True until the persisted AsyncStorage session has been read at least once. */
  isLoading: boolean;
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return (
    <SessionContext.Provider value={{ session, isLoading }}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}

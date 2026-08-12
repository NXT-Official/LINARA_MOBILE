import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

/**
 * Shared Supabase client for the native runtime. Session tokens persist in
 * AsyncStorage so a claimed helper stays signed in across app restarts, and
 * `detectSessionInUrl` is disabled because there is no browser redirect flow
 * on-device. This client talks to the exact same Postgres instance, tables,
 * and RLS policies as the LINARA web dashboard (see ../LINARA/ARCHITECTURE.md
 * Section 8) — no schema or policy changes are made from the mobile client.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

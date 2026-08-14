import { useEffect, useState } from "react";

import {
  deriveRosaStatus,
  type ManualAvailability,
  type RosaAvailabilityStatus,
  type ShiftWindow,
} from "@/lib/availability";

const REFRESH_INTERVAL_MS = 60_000;

/**
 * Derives Rosa's live reachability from her shift and her manual opt-in.
 * Purely a derivation now -- `manual` is real, Supabase-backed data
 * (`helper_profiles.manual_status`/`.manual_available_until`, fetched by the
 * caller via services/api/helper-profile.ts's getMyHelperProfile) rather
 * than this hook's own AsyncStorage state. Setting the opt-in is a plain
 * Supabase write (services/api/availability.ts) followed by a profile
 * refetch, owned by the caller (see app/(app)/today.tsx), matching this
 * app's existing mutation pattern (mutations live in screens, not hooks).
 * See ../../LINARA/MULTI_HELPER_HANDLING.md for why this changed.
 */
export function useRosaAvailability(
  shift: ShiftWindow | null,
  manual: ManualAvailability,
): RosaAvailabilityStatus {
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNowTs(Date.now()), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return shift
    ? deriveRosaStatus(nowTs, shift, manual)
    : { status: "off", until: null, quiet: false, restDay: false };
}

import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  deriveRosaStatus,
  OFF_AVAILABILITY,
  type ManualAvailability,
  type RosaAvailabilityStatus,
  type ShiftWindow,
} from "@/lib/availability";

const STORAGE_KEY = "linara.rosaAvail";
const REFRESH_INTERVAL_MS = 60_000;

export interface RosaAvailability {
  status: RosaAvailabilityStatus;
  /** Opt in to being reachable for a bounded window. Refused during quiet hours. */
  setAvailable: (hours: number) => void;
  setOff: () => void;
}

/**
 * On-shift and quiet hours are derived automatically from the helper's
 * shift; anything else needs a bounded manual opt-in. The opt-in survives
 * an app restart via AsyncStorage, matching the web dashboard's
 * localStorage-backed equivalent.
 */
export function useRosaAvailability(shift: ShiftWindow | null): RosaAvailability {
  const [manual, setManual] = useState<ManualAvailability>(OFF_AVAILABILITY);
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setManual(JSON.parse(raw) as ManualAvailability);
      })
      .catch(() => {
        // Corrupt/missing cache entry -- default to Off is safe.
      });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(manual)).catch(() => {});
  }, [manual]);

  useEffect(() => {
    const interval = setInterval(() => setNowTs(Date.now()), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // deriveRosaStatus already treats an expired `manual.availableUntil` as Off,
  // so an expiry doesn't need its own setState-in-effect -- the next
  // setAvailable()/setOff() call overwrites the stale persisted value anyway.
  const status: RosaAvailabilityStatus = shift
    ? deriveRosaStatus(nowTs, shift, manual)
    : { status: "off", until: null, quiet: false, restDay: false };

  return {
    status,
    setAvailable: (hours: number) => {
      if (status.quiet) return;
      setManual({ manual: "available", availableUntil: nowTs + hours * 60 * 60 * 1000 });
    },
    setOff: () => setManual(OFF_AVAILABILITY),
  };
}

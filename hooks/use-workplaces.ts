import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";

import {
  getFamilyHouses,
  getMyWorkplaces,
  getPlaces,
  type PlaceRef,
  type Workplace,
} from "@/services/api/workplaces";

// Which house she's looking at: "all" (Today only) or one household. Kept on
// this phone and shared by every tab, so picking the Beach House on Today
// opens the Beach House's pantry too.
const KEY = "linara.workplace";
let selected: string = "all";
let loaded = false;
const listeners = new Set<() => void>();

function set(next: string) {
  selected = next;
  for (const fn of listeners) fn();
  AsyncStorage.setItem(KEY, next).catch(() => {});
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Her workplaces and the house she's looking at. `multi` is false for a
 * helper who works in one household: every screen then looks as it always
 * has.
 */
export function useWorkplaces(homeHouseholdId: string | null) {
  const current = useSyncExternalStore(subscribe, () => selected);

  useEffect(() => {
    if (loaded) return;
    loaded = true;
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (v) set(v);
      })
      .catch(() => {});
  }, []);

  const workplacesQuery = useQuery({
    queryKey: ["my-workplaces"],
    queryFn: getMyWorkplaces,
    staleTime: 5 * 60_000,
  });
  const housesQuery = useQuery({
    queryKey: ["family-houses"],
    queryFn: getFamilyHouses,
    staleTime: 5 * 60_000,
  });
  const placesQuery = useQuery({
    queryKey: ["places"],
    queryFn: getPlaces,
    staleTime: 5 * 60_000,
  });

  const workplaces: Workplace[] = useMemo(() => workplacesQuery.data ?? [], [workplacesQuery.data]);
  const multi = workplaces.length > 1;
  const ids = workplaces.map((w) => w.householdId);
  // A house she no longer works in (or "all" on a one-house helper) falls back.
  const house = multi && (current === "all" || ids.includes(current)) ? current : "all";
  const homeId = workplaces.find((w) => w.isHome)?.householdId ?? homeHouseholdId;

  const houseName = useCallback(
    (id: string | null | undefined) =>
      !id
        ? null
        : (workplaces.find((w) => w.householdId === id)?.name ??
          housesQuery.data?.find((h) => h.id === id)?.name ??
          null),
    [workplaces, housesQuery.data],
  );

  return {
    workplaces,
    multi,
    /** "all" or a household id: what Today shows. */
    house,
    setHouse: set,
    /** One household, never "all": the pantry, receipts and new tasks. */
    oneHouse: house === "all" ? homeId : house,
    /** Her other households, for listening to their task changes. */
    otherHouseholdIds: ids.filter((id) => id !== homeHouseholdId),
    houseName,
    placeName: (ref: PlaceRef | null | undefined) =>
      !ref
        ? null
        : ref.kind === "house"
          ? houseName(ref.id)
          : (placesQuery.data?.find((p) => p.id === ref.id)?.name ?? null),
  };
}

export type Workplaces = ReturnType<typeof useWorkplaces>;

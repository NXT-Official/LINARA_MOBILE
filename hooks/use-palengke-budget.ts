import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "linara.palengkeBudget";
const DEFAULT_BUDGET_PHP = 1500;

export interface PalengkeBudget {
  budget: number;
  setBudget: (n: number) => void;
}

/**
 * The allocated petty-cash budget for the active Palengke run (plan.md
 * 3.2). No shared table carries a manager-set allocation yet -- the web
 * reference's `useGroceryList` keeps this same figure in local component
 * state (`useState(1500)`), not in Postgres -- so this mirrors that with
 * an AsyncStorage-persisted, device-local value instead of inventing a
 * budget column on this mobile client. Revisit once the web side has a
 * real manager-set allocation to sync down.
 */
export function usePalengkeBudget(): PalengkeBudget {
  const [budget, setBudgetState] = useState(DEFAULT_BUDGET_PHP);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = Number(raw);
          if (!Number.isNaN(parsed)) setBudgetState(parsed);
        }
      })
      .catch(() => {
        // Corrupt/missing cache entry -- default budget is safe.
      });
  }, []);

  const setBudget = (n: number) => {
    const clamped = Math.max(0, n);
    setBudgetState(clamped);
    AsyncStorage.setItem(STORAGE_KEY, String(clamped)).catch(() => {});
  };

  return { budget, setBudget };
}

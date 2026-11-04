import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createDraftRun,
  deleteRun,
  getGroceryRuns,
  getRunSpent,
  moveGroceryItems,
  setRunStatus,
  type GroceryRun,
} from "@/services/api/grocery";
import { useT } from "@/lib/i18n/locale-context";

/**
 * Her grocery runs in one house (../LINARA/supabase/add-grocery-runs.sql):
 * the ready ones she shops, and -- for a pantry lead -- drafts she makes
 * and sends for approval. `available` is false until that SQL is applied;
 * the Pantry tab then shows the one list it always had. Online only, like
 * the rest of the palengke edits.
 */
export function useGroceryRuns(householdId: string | null) {
  const t = useT();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runsQuery = useQuery({
    queryKey: ["grocery-runs", householdId],
    queryFn: () => getGroceryRuns(householdId as string),
    enabled: Boolean(householdId),
  });
  const recent = runsQuery.data?.recent ?? [];
  const spentQuery = useQuery({
    queryKey: ["grocery-runs-spent", recent.map((r) => r.id).join(",")],
    queryFn: () => getRunSpent(recent.map((r) => r.id)),
    enabled: recent.length > 0,
  });

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["grocery-runs"] }),
      queryClient.invalidateQueries({ queryKey: ["grocery-items"] }),
      queryClient.invalidateQueries({ queryKey: ["grocery-runs-spent"] }),
    ]);

  /** One step, with the database's refusal shown in her words if it says no. */
  const step = async (id: string, work: () => Promise<unknown>, fallback: string) => {
    setBusy(id);
    setError(null);
    try {
      await work();
      await refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
      void refresh();
      return false;
    } finally {
      setBusy(null);
    }
  };

  return {
    /**
     * Null while loading; false before the runs migration (or if the runs
     * can't be read right now, so she still gets the list).
     */
    available: runsQuery.isError
      ? false
      : runsQuery.data === undefined
        ? null
        : runsQuery.data !== null,
    loading: runsQuery.isLoading,
    open: runsQuery.data?.open ?? [],
    recent,
    recentSpent: spentQuery.data ?? {},
    busy,
    error,
    refresh,
    createDraft: (title: string, itemIds: string[], shopOn: string | null) =>
      step(
        "new-run",
        () => createDraftRun(householdId as string, title, itemIds, shopOn),
        t("pantry.hindiNagawaAngRun"),
      ),
    submit: (run: GroceryRun) =>
      step(run.id, () => setRunStatus(run.id, "pending"), t("pantry.hindiNaipadalaSaManager")),
    withdraw: (run: GroceryRun) =>
      step(run.id, () => setRunStatus(run.id, "draft"), t("pantry.hindiNabawi")),
    remove: (run: GroceryRun) => step(run.id, () => deleteRun(run.id), t("pantry.hindiNabura")),
    close: (run: GroceryRun, change: number | null) =>
      step(
        run.id,
        async () => {
          await setRunStatus(run.id, "done", change);
          // Closing finishes the task carrying the run, if any
          // (../LINARA/supabase/add-run-closes-task.sql), so it leaves Ngayon
          // and stops asking for a receipt of its own.
          if (run.ticketId) {
            for (const key of ["palengke-ticket", "focus-task", "today-progress", "today-tasks"]) {
              void queryClient.invalidateQueries({ queryKey: [key] });
            }
          }
        },
        t("pantry.hindiNataposAngRun"),
      ),
    backToPool: (itemId: string) =>
      step(itemId, () => moveGroceryItems([itemId], null), t("pantry.hindiNaibalik")),
  };
}

export type GroceryRuns = ReturnType<typeof useGroceryRuns>;

import { supabase } from "@/services/supabase";

export interface GroceryItemRow {
  id: string;
  name: string;
  qty: number;
  unit: string;
  pantryItemId: string | null;
  bought: boolean;
  actualCost: number | null;
  /** The run it's on; null for the Kailangan pool (../LINARA/supabase/add-grocery-runs.sql). */
  runId: string | null;
}

// The runs migration isn't applied yet: the app behaves as it did with one list.
const isMissing = (error: { code?: string; message?: string } | null) =>
  !!error &&
  (error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.code === "42703" ||
    error.code === "PGRST202" ||
    /does not exist|could not find/i.test(error.message ?? ""));

type GroceryDbRow = {
  id: string;
  name: string;
  qty: number;
  unit: string;
  pantry_item_id: string | null;
  bought: boolean;
  actual_cost: number | null;
  run_id?: string | null;
};

const toItem = (row: GroceryDbRow): GroceryItemRow => ({
  id: row.id,
  name: row.name,
  qty: Number(row.qty),
  unit: row.unit,
  pantryItemId: row.pantry_item_id,
  bought: row.bought,
  actualCost: row.actual_cost === null ? null : Number(row.actual_cost),
  runId: row.run_id ?? null,
});

/**
 * One house's palengke lines (she may read several houses; see
 * getPantryItems). With runs (`openRunIds` given): the pool's unbought
 * lines and what was ticked today, plus every line on the open runs she can
 * see -- the database hides the rest. Without (`null`): the whole list, as
 * before. Unbought first, so it reads as a to-do list.
 */
export async function getGroceryItems(
  householdId: string,
  openRunIds: string[] | null,
  todayStart: Date,
): Promise<GroceryItemRow[]> {
  if (openRunIds === null) {
    const { data, error } = await supabase
      .from("grocery_items")
      .select("*")
      .eq("household_id", householdId)
      .order("bought", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as GroceryDbRow[]).map(toItem);
  }

  const [pool, onRuns] = await Promise.all([
    supabase
      .from("grocery_items")
      .select("*")
      .eq("household_id", householdId)
      .is("run_id", null)
      .or(`bought.eq.false,bought_at.gte."${todayStart.toISOString()}"`)
      .order("bought", { ascending: true })
      .order("created_at", { ascending: true }),
    openRunIds.length
      ? supabase
          .from("grocery_items")
          .select("*")
          .in("run_id", openRunIds)
          .order("bought", { ascending: true })
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (pool.error) throw new Error(pool.error.message);
  if (onRuns.error) throw new Error(onRuns.error.message);
  return [...(pool.data ?? []), ...(onRuns.data ?? [])].map((r) => toItem(r as GroceryDbRow));
}

export type RunStatus = "draft" | "pending" | "ready" | "done" | "cancelled";

export interface GroceryRun {
  id: string;
  title: string;
  status: RunStatus;
  teamId: string | null;
  /** YYYY-MM-DD. */
  shopOn: string | null;
  ticketId: string | null;
  /** Abono: the cash she was given. */
  cashGiven: number | null;
  /** Sukli: the change she gave back. */
  changeReturned: number | null;
  note: string | null;
  closedAt: string | null;
}

type RunDbRow = {
  id: string;
  title: string;
  status: RunStatus;
  team_id: string | null;
  shop_on: string | null;
  ticket_id: string | null;
  cash_given: number | null;
  change_returned: number | null;
  note: string | null;
  closed_at: string | null;
};

const toRun = (r: RunDbRow): GroceryRun => ({
  id: r.id,
  title: r.title,
  status: r.status,
  teamId: r.team_id,
  shopOn: r.shop_on,
  ticketId: r.ticket_id,
  cashGiven: r.cash_given === null ? null : Number(r.cash_given),
  changeReturned: r.change_returned === null ? null : Number(r.change_returned),
  note: r.note,
  closedAt: r.closed_at,
});

/**
 * The runs she can see in one house: open ones (a pantry lead sees drafts
 * and those waiting for approval too; everyone else only ready ones for
 * her, her team or her task) and the last few closed. `null` before the
 * runs migration is applied.
 */
export async function getGroceryRuns(
  householdId: string,
): Promise<{ open: GroceryRun[]; recent: GroceryRun[] } | null> {
  const [open, recent] = await Promise.all([
    supabase
      .from("grocery_runs")
      .select("*")
      .eq("household_id", householdId)
      .in("status", ["draft", "pending", "ready"])
      .order("shop_on", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("grocery_runs")
      .select("*")
      .eq("household_id", householdId)
      .eq("status", "done")
      .order("closed_at", { ascending: false })
      .limit(5),
  ]);
  if (isMissing(open.error)) return null;
  if (open.error) throw new Error(open.error.message);
  if (recent.error) throw new Error(recent.error.message);
  return {
    open: ((open.data ?? []) as RunDbRow[]).map(toRun),
    recent: ((recent.data ?? []) as RunDbRow[]).map(toRun),
  };
}

/** What each closed run cost, for her list of past runs. */
export async function getRunSpent(runIds: string[]): Promise<Record<string, number>> {
  if (runIds.length === 0) return {};
  const { data, error } = await supabase
    .from("grocery_items")
    .select("run_id, actual_cost")
    .in("run_id", runIds)
    .eq("bought", true);
  if (error) throw new Error(error.message);
  const out: Record<string, number> = {};
  for (const r of (data ?? []) as { run_id: string; actual_cost: number | null }[]) {
    out[r.run_id] = (out[r.run_id] ?? 0) + Number(r.actual_cost ?? 0);
  }
  return out;
}

/** The open run a task carries, if she can see it (for the Today card). */
export async function getRunForTicket(
  ticketId: string,
): Promise<{ id: string; title: string } | null> {
  const { data, error } = await supabase
    .from("grocery_runs")
    .select("id, title")
    .eq("ticket_id", ticketId)
    .in("status", ["draft", "pending", "ready"])
    .limit(1)
    .maybeSingle();
  if (isMissing(error)) return null;
  if (error) throw new Error(error.message);
  return data ? { id: data.id as string, title: data.title as string } : null;
}

/** A pantry lead's draft run, with the pool lines she chose moved onto it. */
export async function createDraftRun(
  householdId: string,
  title: string,
  itemIds: string[],
  shopOn: string | null,
): Promise<string> {
  const { data, error } = await supabase
    .from("grocery_runs")
    .insert({ household_id: householdId, title, shop_on: shopOn })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Hindi nagawa ang run.");
  const runId = data.id as string;
  if (!itemIds.length) return runId;
  // Only lines still to buy and still in Kailangan: one ticked bought or put on
  // another run meanwhile stays where it is, instead of failing the move and
  // leaving an empty draft (KNOWN_GAPS.md O53).
  const { data: moved, error: moveError } = await supabase
    .from("grocery_items")
    .update({ run_id: runId })
    .in("id", itemIds)
    .eq("bought", false)
    .is("run_id", null)
    .select("id");
  if (moveError || !moved?.length) {
    await supabase.from("grocery_runs").delete().eq("id", runId);
    throw new Error(
      moveError
        ? "Hindi nailagay sa run ang mga bibilhin. Subukan ulit."
        : "Nabili na o nasa ibang run na ang mga pinili mo. Pumili ulit.",
    );
  }
  return runId;
}

/** Moves a run along: ask for approval (pending), take it back (draft), close it (done). */
export async function setRunStatus(
  runId: string,
  status: RunStatus,
  changeReturned?: number | null,
): Promise<void> {
  const { error } = await supabase
    .from("grocery_runs")
    .update(changeReturned === undefined ? { status } : { status, change_returned: changeReturned })
    .eq("id", runId);
  if (error) throw new Error(error.message);
}

/** Only a draft or one waiting for approval; its lines go back to Kailangan. */
export async function deleteRun(runId: string): Promise<void> {
  const { error } = await supabase.from("grocery_runs").delete().eq("id", runId);
  if (error) throw new Error(error.message);
}

/** Lines onto a run, or back to the pool (`runId` null). */
export async function moveGroceryItems(itemIds: string[], runId: string | null): Promise<void> {
  const { error } = await supabase
    .from("grocery_items")
    .update({ run_id: runId })
    .in("id", itemIds);
  if (error) throw new Error(error.message);
}

/**
 * Toggles a checklist item's bought state. Matches the web reference's
 * behavior of clearing the entered cost when an item is un-checked, so a
 * mis-tap doesn't leave a stale cost counted against the budget.
 */
export async function setGroceryItemBought(id: string, bought: boolean): Promise<void> {
  const { error } = await supabase
    .from("grocery_items")
    .update({ bought, actual_cost: bought ? undefined : null })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

/** Records the actual price paid for a bought checklist item. */
export async function setGroceryItemCost(id: string, cost: number | null): Promise<void> {
  const { error } = await supabase.from("grocery_items").update({ actual_cost: cost }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export interface GroceryItemInput {
  name: string;
  qty: number;
  unit: string;
  /** Set when it comes from a low pantry item, so buying it can restock that item. */
  pantryItemId?: string | null;
}

/**
 * Puts something on the palengke list. Whoever keeps the pantry can add
 * anything; every helper can add a pantry item that ran out
 * (../LINARA/supabase/add-pantry-roles.sql).
 */
export async function addGroceryItem(householdId: string, input: GroceryItemInput): Promise<void> {
  const { error } = await supabase.from("grocery_items").insert({
    household_id: householdId,
    name: input.name,
    qty: input.qty,
    unit: input.unit,
    pantry_item_id: input.pantryItemId ?? null,
    bought: false,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/** Fixes an item's name or amount. */
export async function updateGroceryItem(
  id: string,
  patch: Pick<GroceryItemInput, "name" | "qty" | "unit">,
): Promise<void> {
  const { error } = await supabase.from("grocery_items").update(patch).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Takes an item off the list. The screen only offers it before the item is
 * bought, so a purchase and its cost stay on record.
 */
export async function deleteGroceryItem(id: string): Promise<void> {
  const { error } = await supabase.from("grocery_items").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export interface GroceryReceipt {
  id: string;
  /** Signed for 15 minutes. */
  url: string;
  createdAt: string;
}

/**
 * Records a receipt photo already uploaded to household-evidence
 * (../LINARA/supabase/add-grocery-receipts.sql), so the manager sees it on
 * the web whether or not a Palengke Run task was open. `ticketId` links it to
 * that run when there was one.
 */
export async function recordGroceryReceipt(
  householdId: string,
  storagePath: string,
  ticketId?: string,
  runId?: string,
): Promise<{ id: string; createdAt: string }> {
  const { data, error } = await supabase
    .from("grocery_receipts")
    .insert({
      household_id: householdId,
      storage_path: storagePath,
      ticket_id: ticketId ?? null,
      // Only when there is one, so this works before the runs migration.
      ...(runId ? { run_id: runId } : {}),
    })
    .select("id, created_at")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Hindi na-save ang resibo.");
  }
  return { id: data.id, createdAt: data.created_at };
}

/** The household's latest receipt, signed for display; null if none (or the table isn't there yet). */
export async function getLatestGroceryReceipt(householdId: string): Promise<GroceryReceipt | null> {
  const { data, error } = await supabase
    .from("grocery_receipts")
    .select("id, storage_path, created_at")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  // 42P01 / PGRST205: the table isn't there yet.
  if (error?.code === "42P01" || error?.code === "PGRST205") return null;
  if (error) throw new Error(error.message);
  if (!data) return null;

  const { data: link } = await supabase.storage
    .from("household-evidence")
    .createSignedUrl(data.storage_path, 900);
  return link ? { id: data.id, url: link.signedUrl, createdAt: data.created_at } : null;
}

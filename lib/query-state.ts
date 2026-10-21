/**
 * A read that has nothing to show and won't get anything until the phone is
 * back online: it failed, or it's paused for lack of a connection, and there's
 * no earlier copy. The screen says so instead of drawing an empty list
 * (QA F-LM-002).
 */
export function noDataToShow(query: {
  data: unknown;
  isError: boolean;
  fetchStatus: string;
}): boolean {
  return query.data === undefined && (query.isError || query.fetchStatus === "paused");
}

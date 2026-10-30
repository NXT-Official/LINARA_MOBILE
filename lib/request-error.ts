import { tr, type MessageKey } from "./i18n/instance";

/**
 * What a helper reads when a request she sent (vale, leave) didn't go
 * through. The server and the network answer in English ("TypeError: Network
 * request failed", "Not enough rest owed: ..."), so the screen never shows
 * them as they are (QA LM-16, F-LM-003).
 */

const OFFLINE_SEND: MessageKey = "requestError.offline";

/** The no-internet message, in the language she is using now. */
export const offlineSendText = (): string => tr(OFFLINE_SEND);

const NOT_SENT: MessageKey = "requestError.notSent";

const NETWORK = /network request failed|failed to fetch|fetch failed|timed? ?out|load failed/i;

/** Known server refusals, in the helper's words. First match wins. */
const KNOWN: { match: RegExp; text: MessageKey }[] = [
  // request_leave, cancel_leave_request (../LINARA/supabase/add-leave.sql)
  {
    match: /not enough rest owed/i,
    text: "requestError.notEnoughRestOwed",
  },
  {
    match: /not enough service incentive leave/i,
    text: "requestError.notEnoughSil",
  },
  {
    match: /service incentive leave starts after one year/i,
    text: "requestError.silNotYet",
  },
  {
    match: /new service year starts/i,
    text: "requestError.newServiceYear",
  },
  { match: /already passed/i, text: "requestError.datePassed" },
  { match: /overlaps/i, text: "requestError.overlaps" },
  { match: /rest off on/i, text: "requestError.restOffThatDay" },
  { match: /at most 90 days/i, text: "requestError.max90" },
  { match: /all rest days/i, text: "requestError.allRestDays" },
  {
    match: /last day must be on or after/i,
    text: "requestError.lastBeforeFirst",
  },
  {
    match: /shift hours are not set/i,
    text: "requestError.noShiftHours",
  },
  { match: /already started/i, text: "requestError.alreadyStarted" },
  {
    match: /already on a payslip/i,
    text: "requestError.onPayslip",
  },
  { match: /request was already/i, text: "requestError.alreadyDecided" },
];

export function requestErrorMessage(raw: string | null | undefined, offline: boolean): string {
  if (offline) return tr(OFFLINE_SEND);
  const text = (raw ?? "").trim();
  if (text === "") return tr(NOT_SENT);
  if (NETWORK.test(text)) return tr(OFFLINE_SEND);
  return tr(KNOWN.find((k) => k.match.test(text))?.text ?? NOT_SENT);
}

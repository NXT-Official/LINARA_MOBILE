/**
 * What a helper reads when a request she sent (vale, leave) didn't go
 * through. The server and the network answer in English ("TypeError: Network
 * request failed", "Not enough rest owed: ..."), so the screen never shows
 * them as they are (QA LM-16, F-LM-003).
 */

export const OFFLINE_SEND =
  "Walang internet, kaya hindi pa ito naipadala. Subukan ulit kapag may signal na.";

const NOT_SENT = "Hindi naipadala. Subukan ulit mamaya.";

const NETWORK = /network request failed|failed to fetch|fetch failed|timed? ?out|load failed/i;

/** Known server refusals, in the helper's words. First match wins. */
const KNOWN: { match: RegExp; text: string }[] = [];

export function requestErrorMessage(raw: string | null | undefined, offline: boolean): string {
  if (offline) return OFFLINE_SEND;
  const text = (raw ?? "").trim();
  if (text === "") return NOT_SENT;
  if (NETWORK.test(text)) return OFFLINE_SEND;
  return KNOWN.find((k) => k.match.test(text))?.text ?? NOT_SENT;
}

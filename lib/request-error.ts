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
const KNOWN: { match: RegExp; text: string }[] = [
  // request_leave, cancel_leave_request (../LINARA/supabase/add-leave.sql)
  {
    match: /not enough rest owed/i,
    text: "Kulang ang rest owed mo para sa mga araw na ito. Pumili ng SIL o Walang bayad, o bawasan ang araw.",
  },
  {
    match: /not enough service incentive leave/i,
    text: "Kulang na ang SIL mo para sa mga araw na ito.",
  },
  {
    match: /service incentive leave starts after one year/i,
    text: "Wala ka pang SIL. Magsisimula ito pagkatapos ng isang taon ng serbisyo.",
  },
  {
    match: /new service year starts/i,
    text: "May bagong taon ng serbisyo sa gitna nito. Hatiin sa dalawang request.",
  },
  { match: /already passed/i, text: "Lumipas na ang petsang iyon. Pumili ng ibang araw." },
  { match: /overlaps/i, text: "May leave ka na sa mga araw na iyon." },
  { match: /rest off on/i, text: "May rest off ka na sa araw na iyon. Kanselahin muna iyon." },
  { match: /at most 90 days/i, text: "Hanggang 90 araw lang ang isang request." },
  { match: /all rest days/i, text: "Rest day mo lahat ng araw na iyon." },
  {
    match: /last day must be on or after/i,
    text: "Dapat sa unang araw o pagkatapos nito ang huling araw.",
  },
  {
    match: /shift hours are not set/i,
    text: "Hindi pa naka-set ang oras ng shift mo, kaya hindi mabilang ang rest owed. Sabihan ang manager mo.",
  },
  { match: /already started/i, text: "Nagsimula na ang leave na ito, kaya hindi na makakansela." },
  {
    match: /already on a payslip/i,
    text: "Nasa payslip na ang leave na ito, kaya hindi na makakansela.",
  },
  { match: /request was already/i, text: "Napagpasyahan na ang request na ito." },
];

export function requestErrorMessage(raw: string | null | undefined, offline: boolean): string {
  if (offline) return OFFLINE_SEND;
  const text = (raw ?? "").trim();
  if (text === "") return NOT_SENT;
  if (NETWORK.test(text)) return OFFLINE_SEND;
  return KNOWN.find((k) => k.match.test(text))?.text ?? NOT_SENT;
}

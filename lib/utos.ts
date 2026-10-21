/** A Quick Utos she can still answer: unanswered, or Sige'd but not done. */
export type UtosAck = "sent" | "seen";

/** How long a Sige'd utos stays on Ngayon waiting for Tapos na. */
export const SEEN_UTOS_KEPT_MS = 24 * 60 * 60 * 1000;

/**
 * The answers a utos still offers (QA F-LM-004): Sige and Tapos na before she
 * answers, then only Tapos na. Sige never takes it off Ngayon.
 */
export function utosAnswers(ack: UtosAck): ("seen" | "done")[] {
  return ack === "sent" ? ["seen", "done"] : ["done"];
}

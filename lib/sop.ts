import type { FocusTaskSop } from "@/services/api/tickets";

export interface SopSlide {
  key: string;
  imageUrl: string | null;
  text: string;
}

/**
 * Fallback slide builder used by useSopSlides (hooks/use-sop-slides.ts) when
 * a `house_sops` row has no `steps` yet -- either because a manager hasn't
 * (re)generated it via the web dashboard's "Save to Library" flow, or the
 * simplify-sop edge function is unreachable. `house_sops.steps` now exists
 * and is preferred when populated (see ../LINARA/KNOWN_GAPS.md gap #1/C7);
 * this newline-split of `description` remains the safety net for rows that
 * predate that flow or were written by hand.
 */
export function buildSopSlides(sop: FocusTaskSop): SopSlide[] {
  const lines = sop.description
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const stepLines = lines.length > 0 ? lines : [sop.title];

  return stepLines.map((text, index) => ({
    key: `${sop.title}-${index}`,
    imageUrl: index === 0 ? sop.standardImageUrl : null,
    text,
  }));
}

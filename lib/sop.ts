import type { FocusTaskSop } from "@/services/api/tickets";

export interface SopSlide {
  key: string;
  imageUrl: string | null;
  text: string;
}

/**
 * `house_sops` only persists a single `description` TEXT column (no
 * discrete steps table), even though the AI SOP generator edge function
 * returns a structured `steps: string[]` array -- that array is never
 * written back to the table on the schema-owning web side (see
 * ../LINARA/src/features/tasks/task.actions.ts' HouseStandardSOP). Until
 * that gap is closed there, this splits description on newlines so a
 * manager who writes one instruction per line still gets a swipable
 * multi-slide deck instead of one wall of text, without this mobile client
 * adding a column the web app doesn't know about.
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

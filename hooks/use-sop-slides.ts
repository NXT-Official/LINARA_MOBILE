import { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { buildSopSlides, type SopSlide } from "@/lib/sop";
import { simplifySop } from "@/services/voice-pipeline";
import type { FocusTaskSop } from "@/services/api/tickets";

const CACHE_KEY_PREFIX = "linara.sopSimplified.";

interface SimplifiedResult {
  sopId: string;
  slides: SopSlide[];
}

/**
 * Resolves the slides to show on the SOP carousel: real Taglish-simplified
 * cards when `sop.steps` has structured data (from the AI SOP Creator +
 * "Save to Library" flow on the web dashboard), the existing newline-split
 * `description` fallback otherwise or on any failure. Never blocks the
 * carousel -- the sync fallback renders immediately while a simplification
 * resolves in the background, matching the offline-resilience pattern in
 * ../LINARA_MOBILE/architecture.md Section 10.
 */
export function useSopSlides(sop: FocusTaskSop): SopSlide[] {
  const fallbackSlides = useMemo(() => buildSopSlides(sop), [sop]);
  const [simplified, setSimplified] = useState<SimplifiedResult | null>(null);

  useEffect(() => {
    if (sop.steps.length === 0) {
      return;
    }

    let cancelled = false;
    const cacheKey = `${CACHE_KEY_PREFIX}${sop.id}`;

    async function resolveSimplifiedSlides() {
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as SopSlide[];
          if (!cancelled) setSimplified({ sopId: sop.id, slides: parsed });
          return;
        }

        const translation = await simplifySop(sop.steps, sop.title);
        const slides: SopSlide[] = translation.visualCards.map((card, index) => ({
          key: `${sop.id}-${card.stepNumber}`,
          imageUrl: index === 0 ? sop.standardImageUrl : null,
          text: card.instruction,
        }));

        await AsyncStorage.setItem(cacheKey, JSON.stringify(slides));
        if (!cancelled) setSimplified({ sopId: sop.id, slides });
      } catch {
        // Offline or API failure -- fallbackSlides (below) stays in use.
      }
    }

    resolveSimplifiedSlides();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on sop.id, not full sop identity
  }, [sop.id]);

  return simplified?.sopId === sop.id ? simplified.slides : fallbackSlides;
}

/**
 * The AI features (voice-note transcription, turning a note into a task,
 * Taglish-simplified SOP cards) are hidden until a provider is hooked up.
 * Their edge functions only return canned mock output
 * (../LINARA/KNOWN_GAPS.md O26), so a voice note came back as someone else's
 * words. Same switch as ../LINARA/src/lib/ai.ts; flip both when they're live.
 */
export const AI_ENABLED = false;

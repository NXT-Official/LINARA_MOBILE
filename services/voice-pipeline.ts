import { File } from "expo-file-system";
import { encode } from "base64-arraybuffer";

import { supabase } from "@/services/supabase";

type Station = "Yaya" | "Cook" | "Laundry" | "Driver" | "House";

export interface VoiceTaskPromotion {
  cleanTitle: string;
  note: string;
  station: Station;
  targetDateOffset: number;
  targetTime: string;
  subtasks: string[];
}

export interface SopVisualCard {
  stepNumber: number;
  instruction: string;
  focusPoint: string;
}

export interface SopTranslation {
  simplifiedGoal: string;
  visualCards: SopVisualCard[];
}

/**
 * Reads a locally-recorded voice memo, sends it to the `transcribe-notes`
 * edge function for Whisper transcription, then discards the local file.
 * The raw audio is never persisted to Supabase Storage -- see
 * ../LINARA/KNOWN_GAPS.md gap #8 for why.
 */
export async function transcribeAudio(localUri: string): Promise<string> {
  const file = new File(localUri);
  const audioBase64 = encode(await file.arrayBuffer());

  const { data, error } = await supabase.functions.invoke<{ transcript: string }>(
    "transcribe-notes",
    { body: { audioBase64, mimeType: "audio/m4a" } },
  );

  if (file.exists) {
    try {
      file.delete();
    } catch {
      // Best-effort cleanup -- a leftover cache file isn't worth failing the note over.
    }
  }

  if (error || !data) {
    throw new Error(error?.message || "Failed to transcribe voice note");
  }

  return data.transcript;
}

/**
 * Structures a Taglish transcript into a task payload via the
 * `promote-voice-task` edge function (aiagent.md Section 2). Used by the
 * scratchpad's "Promote to Board" action.
 */
export async function promoteVoiceTask(
  transcript: string,
  station: Station,
): Promise<VoiceTaskPromotion> {
  const { data, error } = await supabase.functions.invoke<VoiceTaskPromotion>(
    "promote-voice-task",
    { body: { transcript, station, nowIso: new Date().toISOString() } },
  );

  if (error || !data) {
    throw new Error(error?.message || "Failed to structure voice task");
  }

  return data;
}

/**
 * Translates a House Standard's structured `steps` into simplified Taglish
 * visual cards via the `simplify-sop` edge function (aiagent.md Section 3).
 */
export async function simplifySop(steps: string[], title?: string): Promise<SopTranslation> {
  const { data, error } = await supabase.functions.invoke<SopTranslation>("simplify-sop", {
    body: { steps, title },
  });

  if (error || !data) {
    throw new Error(error?.message || "Failed to simplify SOP");
  }

  return data;
}

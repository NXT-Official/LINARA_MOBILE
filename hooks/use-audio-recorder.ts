import { useCallback, useEffect, useRef, useState } from "react";
import {
  requestRecordingPermissionsAsync,
  RecordingPresets,
  useAudioRecorder as useExpoAudioRecorder,
} from "expo-audio";

/**
 * Engineering safety cap on a single scratchpad voice note -- not a product
 * requirement (unlike the separate 15-second cap on manager Quick Utos in
 * ../LINARA/plan.md Section 2.3, a different feature). Just guards against a
 * forgotten "hold to record" turning into a runaway, expensive transcription.
 */
const MAX_RECORDING_MS = 120_000;

interface UseAudioRecorderResult {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  /** Resolves to the local file URI (`.m4a`), or `null` if nothing was recorded. */
  stopRecording: () => Promise<string | null>;
}

/**
 * Thin wrapper around expo-audio's recorder for the Private Scratchpad's
 * "Hold to Record" button (roadmap Story 9). expo-audio replaces the
 * deprecated expo-av Audio API as of Expo SDK 52+ -- see AGENTS.md's
 * "Expo HAS CHANGED" banner.
 */
export function useAudioRecorder(): UseAudioRecorderResult {
  const recorder = useExpoAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const autoStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (autoStopTimer.current) {
        clearTimeout(autoStopTimer.current);
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Microphone permission was not granted.");
    }

    await recorder.prepareToRecordAsync();
    recorder.record();
    setIsRecording(true);

    autoStopTimer.current = setTimeout(() => {
      recorder.stop().catch(() => {});
      setIsRecording(false);
    }, MAX_RECORDING_MS);
  }, [recorder]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (autoStopTimer.current) {
      clearTimeout(autoStopTimer.current);
      autoStopTimer.current = null;
    }

    if (!isRecording) {
      return null;
    }

    await recorder.stop();
    setIsRecording(false);
    return recorder.uri;
  }, [recorder, isRecording]);

  return { isRecording, startRecording, stopRecording };
}

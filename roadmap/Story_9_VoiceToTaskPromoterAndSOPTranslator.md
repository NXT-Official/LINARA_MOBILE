# Story 9: Voice-to-Task Promoter & SOP Translator

## Objective

Implement client-side voice recorders, hook transcripts to transcription APIs, parse Taglish speech notes to insert formal tasks, and translate English SOP definitions into simplified Taglish visual cards.

## Context References

- **PRD Specs:** [`../LINARA_MOBILE/plan.md`](../LINARA_MOBILE/plan.md:Section 3.2)
- **Technical Architecture:** [`../LINARA_MOBILE/architecture.md`](../LINARA_MOBILE/architecture.md:Section 3)
- **AI Agent Specifications:** [`../LINARA_MOBILE/aiagent.md`](../LINARA_MOBILE/aiagent.md:Section 2 & 3)

## Explicit Dependencies

- `Story_8_PantryAndPalengkeBudgetChecklists.md`

## Explicit Inputs

- **Hardware Plugins:** `expo-av` for voice recording.
- **Edge API URL:** Supabase Transcription and GPT-4o-mini completions endpoints.

## Step-by-Step Implementation Instructions

1. Implement the `Hold to Record` audio button component in `components/features/notes/PrivateScratchpad.tsx` using `expo-av`.
2. Audio recordings are saved locally as lightweight WebM files, then posted to the Supabase Edge Function `/v1/transcribe-notes` for Whisper transcription.
3. Hook transcriptions to the **Taglish Voice-to-Task Promoter** agent prompts, extracting title, station, dates, and sub-task arrays (refer to [`../LINARA_MOBILE/aiagent.md`](../LINARA_MOBILE/aiagent.md:Section 2.4)).
4. Build the `"Promote to Board"` button, mapping extracted JSON arrays to insert new task cards into `public.tickets`.
5. Integrate the **SOP Taglish Simplifier** client side. Translates complex English steps into 3 single-sentence Taglish cards for focus screens, caching results to minimize API costs.

## Expected Output

- Responsive micro-voice recorders with automatic audio compression.
- Async transcribers and semantic parser connectors returning valid JSON blocks.
- On-the-fly Taglish SOP translators rendering simplified checklists on mobile.

## Acceptance Criteria

- Holding the recording button captures raw audio, saving local WebM files.
- Releasing the button transcribes Taglish speech with 90%+ accuracy and parses clean structured tasks.
- Tapping Promote successfully adds public tasks to the manager's board.

## Definition of Done

- Voice-to-task promoters are fully active and tested.
- API requests leverage lightweight models to remain fast.
- SOP translators deliver clean, simplified Taglish visual slides.

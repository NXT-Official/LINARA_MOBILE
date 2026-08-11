# Linara Mobile — AI Agent Behavior & Prompt Engineering Specifications

This document defines the complete prompt engineering patterns, context boundaries, and structured JSON schemas for the client-side AI capabilities integrated directly into **Linara Mobile**.

The AI design on the mobile app is strictly guided by the **Dignity by Design** and **Clarity, not Control** principles mapped in [`plan.md`](plan.md), ensuring that AI acts as an empowering tool for the household staff ("invited users") rather than a surveillance or tracking instrument.

---

## 1. Core Mobile AI Agent Philosophy

On the mobile client, AI is utilized to **lower cognitive load, facilitate voice capture, and bridge language barriers**:

1. **Empower Helper Agency:** Transitions the helper from a passive task-recipient to an active author. By using voice-to-text, helpers can easily record tasks and grocery needs in their own words.
2. **Eliminate English-Centric Barriers:** Translates complex, text-heavy English house instructions (SOPs) into clear, simplified, friendly Taglish checklists.
3. **Protect Task Boundaries:** Automatically warns of shift conflicts before a helper commits a self-reported note into a live, scheduled task.
4. **Offline Resilience:** All AI prompts and schemas are optimized to run gracefully over highly high-latency 3G/4G networks, utilizing lightweight model parameters.

---

## 2. AI Agent 1: The Taglish Voice-to-Task Promoter & Structurer

### 2.1 Mission & Behavioral Persona

This agent serves as a helpful, quiet secretary for the helper. When a helper records a voice note or types a rough reminder in their private scratchpad (e.g., _"Bumili ng gatas at itlog para sa almusal ni Sofia bukas ng umaga, tapos ayusin din ang nursery"_), this agent parses the Taglish transcript and structures it into a formal, database-ready task payload.

### 2.2 System Prompt & Instructions

```markdown
You are the Linara Helper's Voice Assistant, a supportive, silent organizer that transforms raw Taglish (Filipino-English) transcripts into clean, formal task objects.

Your instructions:

1. Speak in a respectful, clear, and culturally native tone.
2. Clean up conversational fillers, redundant phrases, and verbal stumbles (e.g., map "Ah, kailangan ko pala bumili ng sabon mamaya" to "Bumili ng sabon").
3. Determine the correct Household Station for the task:
   - Tasks related to childcare, milk, baby bottles, or homework -> Yaya
   - Tasks related to ingredients, cooking, dishes, or wet market -> Cook
   - Tasks related to washing, folding, ironing, or dry cleaning -> Laundry
   - Tasks related to driving, car wash, airport runs, or fuel -> Driver
   - General cleaning, locking doors, organizing, or repairs -> House
4. Detect relative dates mentioned in the text (e.g., "mamaya" -> today, "bukas" -> tomorrow, "sa Lunes" -> next Monday) and compute the exact target date relative to the user's base simulation clock.
5. If the voice memo contains multiple distinct tasks, separate them into itemized sub-tasks.
```

### 2.3 Context Inputs & Constraints

- **Sender Profile:** The active helper's profile ID and station context (refer to [`src/features/people/people.types.ts:Helper`](../LINARA/src/features/people/people.types.ts:5)).
- **Simulation Time:** Takes `simOffsetMs` as the ground-truth base clock to parse temporal terms (e.g., "tomorrow" or "tonight").

### 2.4 Precise JSON Output Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "VoiceTaskPromotion",
  "type": "object",
  "properties": {
    "cleanTitle": {
      "type": "string",
      "description": "Normalized, concise title of the primary task (e.g., 'Bumili ng gatas at itlog')"
    },
    "note": {
      "type": "string",
      "description": "Explans, details, or specific locations mentioned (e.g., 'Para sa almusal ni Sofia bukas ng umaga. Ayusin din ang nursery.')"
    },
    "station": {
      "type": "string",
      "enum": ["Yaya", "Cook", "Laundry", "Driver", "House"],
      "description": "Determined operational lane"
    },
    "targetDateOffset": {
      "type": "integer",
      "description": "Number of days from the current simulation date (e.g., today = 0, tomorrow = 1, yesterday = -1)"
    },
    "targetTime": {
      "type": "string",
      "pattern": "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$",
      "description": "Extracted time of execution in HH:MM format, defaulting to current time if unstated"
    },
    "subtasks": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Itemized list of secondary tasks if multiple actions are mentioned (e.g., ['Bumili ng gatas', 'Bumili ng itlog', 'Ayusin ang nursery'])"
    }
  },
  "required": ["cleanTitle", "note", "station", "targetDateOffset", "targetTime", "subtasks"],
  "additionalProperties": false
}
```

---

## 3. AI Agent 2: The Mobile SOP Taglish Companion & Simplifier

### 3.1 Mission & Behavioral Persona

This agent acts like an encouraging, senior Ate (elder sister) or Kuya in the kitchen. When a manager writes a long, technical, or complex House Standard (SOP) in English (e.g., _"Sanitize child toys using the steam machine, wipe down with disinfectant, and catalog"_), this agent translates and simplifies it into easy-to-follow, reassuring Taglish cards for the helper's focus screen.

### 3.2 System Prompt & Instructions

```markdown
You are Ate Linara, a supportive and reassuring guide for household helpers. Your job is to translate and simplify technical English house instructions (SOPs) into small, friendly, Taglish action steps.

Your instructions:

1. Speak in a warm, polite, and encouraging tone. Always use respectful Taglish honorifics (e.g., "po", "opo") when appropriate.
2. Break down heavy text paragraphs into a maximum of 3 highly focused, single-sentence visual cards.
3. Replace technical jargon with common Philippine household terms (e.g., "disinfectant" -> "alcohol o sabon", "steam machine" -> "mainit na tubig o steam machine").
4. Never sound demanding or monitoring. Highlight safety and child comfort as collaborative goals (e.g., "Siguraduhing hindi masyadong mainit para ligtas si baby" instead of "Do not burn the baby").
```

### 3.3 Context Inputs & Constraints

- **Target SOP:** The master SOP record schema from [`src/features/pantry/pantry.types.ts`](../LINARA/src/features/pantry/pantry.types.ts) or [`public.house_sops`](../LINARA/ARCHITECTURE.md:643).
- **Display Limit:** Strictly limit each simplified visual card's text length to 100 characters max to prevent layout overflow on smaller smartphone screens.

### 3.4 Precise JSON Output Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SOPTranslation",
  "type": "object",
  "properties": {
    "simplifiedGoal": {
      "type": "string",
      "description": "A very short, warm summary of why this SOP matters (e.g., 'Para manatiling ligtas at malinis ang mga laruan ni baby.')"
    },
    "visualCards": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "stepNumber": { "type": "integer" },
          "instruction": {
            "type": "string",
            "maxLength": 100,
            "description": "A brief, clear Taglish step (e.g., 'Hugasan muna ang mga laruan gamit ang malinis na tubig.')"
          },
          "focusPoint": {
            "type": "string",
            "description": "A single focus keyword or safety tip (e.g., 'Mag-ingat sa mainit na tubig')"
          }
        },
        "required": ["stepNumber", "instruction", "focusPoint"]
      },
      "minItems": 1,
      "maxItems": 3,
      "description": "Bite-sized sequential slides shown on the helper's Active Focus card."
    }
  },
  "required": ["simplifiedGoal", "visualCards"],
  "additionalProperties": false
}
```

---

## 4. Mobile Runtime & Inference Strategy

To maintain an agile, data-efficient mobile runtime on cellular networks, the AI implementation is split into a robust pipeline:

### 4.1 Audio Transcription Pipeline

1. **Audio Recording:** The helper records their voice note in WebM/AAC format using the microphone module in `expo-av`.
2. **Edge Processing:** The compressed audio payload is transmitted to the Supabase Edge Function endpoint `https://<ref>.supabase.co/functions/v1/transcribe-notes`.
3. **Whisper Transcription:** The edge function transcribes the Taglish audio utilizing an optimized Whisper API model.

### 4.2 LLM Model Tiering & Cost Optimization

- **Transcription & Note Promotion:** Employs fast, cost-effective models (e.g., **GPT-4o-mini** or **Llama 3 8B Instruct**) to perform Whisper transcribing and structural JSON extraction. Response times are kept under 1.5 seconds.
- **Interactive SOP Translations:** Prompt translations run on standard Vercel or Supabase serverless edge nodes. Translating complex SOPs runs on-demand, caching the Taglish output JSON in `public.house_sops` to avoid redundant LLM billing.
- **Offline Fallback:** If internet is disconnected, raw text inputs are cached locally in the SQLite table. When connection is recovered, the sync queue automatically runs the API triggers sequentially.

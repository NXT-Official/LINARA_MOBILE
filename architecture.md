# Linara Mobile — Technical System Architecture & Blueprint

This document defines the complete technical architecture, data contracts, state management patterns, and system integration models for **Linara Mobile** (the mobile application running in the `LINARA_MOBILE` workspace). It provides a production-ready, offline-first specification for a native React Native (Expo) app, fully compatible with the centralized database instance and API patterns established in the main [`LINARA`](../LINARA/README.md) workspace.

---

## 1. System Overview

**Linara Mobile** is the dedicated native client for the household staff ("invited users") in the Philippines. It models domestic workflows under the metaphor of a "restaurant management system for the home" where tasks are represented as tickets, and household helpers are assigned to specific operational "stations" (Yaya, Cook, Laundry, Driver, House).

### 1.1 Core Objectives
- **Dignity by Design:** The helper is a first-class user who claims and owns their account. Their work history, completed SOP records, and payslips remain their portable property.
- **Offline Resilience:** Philippine networks suffer from high latency and frequent disconnects. The mobile client acts as a reliable, standalone queue that records status mutations and offline photos, syncing them sequentially when network status returns.
- **Low-Cognition Ergonomics:** Features high-contrast typography, large touch-targets, and deep support for Taglish phrasing to ensure ease of use for non-technical users.

### 1.2 Technology Stack
- **Native Runtime:** React Native inside Expo SDK 52+ (managed workflow via EAS).
- **Navigation Shell:** Expo Router (file-based layout under `app/`).
- **Client Cache:** TanStack Query v5 (React Query) utilizing a localized client provider.
- **Styles & Layout:** NativeWind v4 (Tailwind engine compiling to native primitives).
- **Local Storage:** SQLite (for robust, structured transactional sync queues) paired with AsyncStorage (for basic key-value user preferences).
- **Sensors & Hardware:**
  - `expo-camera` & `expo-image-picker`: Low-level camera handlers capturing receipt uploads and task evidence, with local compression (JPEG, max width 1200px, 80% quality).
  - `expo-av`: Audio session recorders to record Taglish voice memos and private notes.
- **Database Client:** Supabase JavaScript Client (`@supabase/supabase-js`) communicating with the centralized PostgreSQL backend.

---

## 2. Textual Architecture Diagram

The system coordinates mobile runtime states with the central Supabase tables, enforcing high data isolation (the "Privacy Wall" for private notes) and queuing un-synced local mutations.

```
       ┌────────────────────────────────────────────────────────┐
       │                 MOBILE NATIVE RUNTIME                  │
       │                                                        │
       │  ┌──────────────────────────────────────────────────┐  │
       │  │             Expo Router View-Shell               │  │
       │  │   - (auth) Code Verification, Flagging, & Claim   │  │
       │  │   - (app) Today, Pantry, Pay Bottom Tabs         │  │
       │  └───────┬──────────────────────────────────┬───────┘  │
       │          │                                  │          │
       │          ▼                                  ▼          │
       │  ┌───────────────────────┐      ┌───────────────────┐  │
       │  │ TanStack Query Cache │      │  Grocery Context  │  │
       │  └───────┬───────────────┘      └───────────┬───────┘  │
       │          │                                  │          │
       │          └────────────────┬─────────────────┘          │
       │                           ▼                            │
       │             SQLite Transaction Sync Queue              │
       │           (Pushes offline actions sequentially)        │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   │ HTTPS Mutations / WebSockets (Supabase Realtime)
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │                  SHARED BACKEND TIER                   │
       │                                                        │
       │   ┌────────────────────────┐  ┌────────────────────┐   │
       │   │  Supabase Auth Router  │  │ Nitro Web Server   │   │
       │   │  (GoTrue JWT Gateway)  │  │ (Admin Dashboard)  │   │
       │   └───────────┬────────────┘  └─────────┬──────────┘   │
       │               │                         │              │
       │               └────────────┬────────────┘              │
       │                            ▼                           │
       │                Central PostgreSQL Schema               │
       │          (Tenant Isolation via RLS Policies)           │
       │          (Strict Privacy Wall on helper_notes)         │
       └────────────────────────────────────────────────────────┘
```

---

## 3. Frontend Architecture

The mobile app employs Expo Router conventions to split authentication contexts from authenticated bottom tabs.

### 3.1 Directory Structure
```text
LINARA_MOBILE/
├── app/
│   ├── _layout.tsx              ← Root provider shell (TanStack Query, Supabase Session)
│   ├── (auth)/
│   │   ├── _layout.tsx          ← Auth stack navigator
│   │   ├── welcome.tsx          ← 6-character Invite Code entry screen
│   │   ├── review-terms.tsx     ← Pre-claim term audit screen
│   │   ├── flag-terms.tsx       ← Terms discrepancy logger
│   │   └── claim-account.tsx    ← Password creator & account locker
│   └── (app)/
│       ├── _layout.tsx          ← Bottom Tab Navigator (Today, Pantry, Pay)
│       ├── today.tsx            ← Focus card, Quick Utos feed, private scratchpad
│       ├── pantry.tsx           ← Grocery checklist & stock-level viewer
│       └── pay.tsx              ← Digital payslips, vales requests, rest hours
├── components/
│   ├── ui/                      ← Native design primitives (Buttons, Inputs, Cards)
│   └── features/
│       ├── tasks/               ← ActiveTaskCard, SOPCarousel, BlockReasonModal
│       ├── utos/                ← FloatingQuickUtosFeed, UtosChip
│       └── notes/               ← PrivateScratchpad, VoiceRecorderButton
├── hooks/
│   ├── use-offline-sync.ts      ← Evaluates network states and triggers SQLite queue drains
│   └── use-audio-recorder.ts    ← Wraps expo-av recording sessions
└── services/
    ├── sqlite-queue.ts          ← Declares local tables and appends/deletes SyncActions
    └── supabase.ts              ← Instantiates the local client SDK
```

### 3.2 State Management & Client-Side Cache
1. **TanStack Query Cache:** Represents the single source of truth for remote tables (`tickets`, `helper_profiles`, `pantry_items`, `vales`). Leverages the Supabase JS client for fetching data and uses Query Invalidation to trigger reactive updates.
2. **`GroceryCtx` (React Context):** Synchronizes the active grocery checklist locally across views, converting completed purchases into restocked pantry inventory items.
3. **SQLite Client Queue:** The persistent offline log. All status changes made while offline are saved to SQLite. Once connection is restored, a hook automatically processes the queue in sequential chronological order.

---

## 4. Backend Architecture

**Linara Mobile** utilizes the exact same database and API infrastructure defined in the main [`LINARA`](../LINARA/ARCHITECTURE.md) workspace, maintaining 100% backwards compatibility.

- **GoTrue Auth Router:** Serves JWT session validation and handles helper password registration.
- **Supabase PostgreSQL RLS Policies:** Data access queries are restricted at the database level:
  - Users are restricted to queries matching their verified `household_id`.
  - Private scratchpads inside the `helper_notes` table are completely private to the specific authenticated helper, utilizing:
    ```sql
    CREATE POLICY helper_notes_privacy ON helper_notes
        FOR ALL USING (helper_id = (SELECT id FROM public.helper_profiles WHERE user_id = auth.uid()));
    ```
- **Shared Schemas:** The mobile app executes direct transactional writes into `tickets`, `helper_notes`, `pantry_items`, `grocery_items`, `vales`, and `ledger_entries`.

---

## 5. External Integration Designs

### 5.1 Supabase Object Storage Media Pipeline
- **Evidence uploads:** Photo evidence and paper receipt captures utilize `expo-image-picker`. Images are resized client-side to a maximum width of 1200px and 80% compression to reduce mobile data usage.
- **Signed Storage Pipe:** The app generates temporary pre-signed S3 URLs via Supabase Storage client nodes to write compressed JPEGs directly into the private `household-evidence` storage bucket with a strict 15-minute expiry, keeping household records private.

### 5.2 HitPay / Xendit Fintech Payout Pipeline
- **Ledger Ingestion:** Payout confirmations triggered on the web dashboard (via HitPay or Xendit webhook notifications) map directly to active rows in `public.ledger_entries`.
- **Transparency Display:** The mobile client queries these ledger updates to generate a clear, unified financial breakdown in the `Pay` tab, mapping base wages, SSS/PhilHealth/Pag-IBIG statutory deductions, approved vales, and premium pay balances.

---

## 6. Step-by-Step Data Flow

### 6.1 Onboarding handshake and flagging terms
```
[Helper App]                   [Supabase / DB]                  [Admin Web]
      │                               │                               │
      ├─► 1. Verify Code (LN98A2) ───►│                               │
      │   ◄── Returns Terms ──────────┤                               │
      │                               │                               │
      ├─► 2. Audit Terms              │                               │
      │      (Wage: ₱8k, Shift: 6-6)  │                               │
      │                               │                               │
      ├─► 3. Flags Mismatch (Wage) ──►├─► Writes to invite_flags      │
      │                               │                               │
      │                               └─► Realtime Alert ────────────►├─► Displays alert:
      ▼                                                               ▼   "Maria Rosa flagged wage"
 [Handshake Paused]
```

### 6.2 Offline-First Ticket Completion
```
[Helper App (Offline)]           [SQLite Queue]               [Supabase Storage/DB]
          │                             │                              │
          ├─► 1. Complete Task ────────►│                              │
          │   (Captures Receipt local)  ├─► Save SyncAction row        │
          │                             │                              │
          ├─► 2. Connection Restored ───┼──────────────────────────────┤
          │                             │                              │
          │                             ├─► 3. Upload Compressed JPG ─►├─► Writes image binary
          │                             │   ◄─ Returns URL ────────────┤
          │                             │                              │
          │                             ├─► 4. Update Ticket status ──►├─► status = 'done'
          │                             │                              │   photo_evidence = URL
          ▼                             ▼                              ▼
```

---

## 7. API Design

The mobile client consumes type-safe server queries and database updates using direct Supabase Client interfaces, maintaining full compliance with the core API endpoints of the central architecture:

### 7.1 Invitation Audit & Claiming
- **Verify Invitation terms:**
  - `GET /api/helpers/claim/verify?code=LN98A2` (Read-only, pre-onboarding terms extraction).
- **Flag terms mismatch:**
  - `POST /api/helpers/claim/flag` (Pushes a category mismatch and explanation note to `public.invite_flags`).
- **Claim account:**
  - `POST /api/helpers/claim` (Registers email and locks account credentials).

### 7.2 Ticket Operations
- **Update ticket status:**
  - `PATCH /api/tickets/:id/status` (Sets status to `todo`, `in_progress`, `done`, or `blocked`).
- **Complete task with evidence:**
  - `POST /api/tickets/:id/complete` (Signed multipart media post containing compressed image URL and optional notes).

### 7.3 Ephemeral Messaging
- **Acknowledge Quick Uto:**
  - `POST /api/utos/:id/ack` (Updates target `ack_state` to `done`).

---

## 8. Data Structures (Stable Database Schemas)

To maintain absolute stability, the mobile client maps directly to the central PostgreSQL tables defined in [`ARCHITECTURE.md`](../LINARA/ARCHITECTURE.md:611):

```sql
-- 1. Helper Profiles (Employment parameters)
CREATE TABLE public.helper_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    household_id UUID NOT NULL,
    name TEXT NOT NULL,
    station TEXT NOT NULL CHECK (station IN ('Yaya', 'Cook', 'Laundry', 'Driver', 'House')),
    monthly_rate NUMERIC(10,2) NOT NULL,
    payday_interval TEXT NOT NULL CHECK (payday_interval IN ('semi_monthly', 'monthly')),
    shift_start TIME NOT NULL,
    shift_end TIME NOT NULL,
    daily_break_duration INTEGER NOT NULL DEFAULT 60,
    weekly_rest_day INTEGER NOT NULL CHECK (weekly_rest_day BETWEEN 0 AND 6),
    invite_code VARCHAR(12) UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('PENDING_CLAIM', 'ACTIVE', 'INACTIVE')) DEFAULT 'PENDING_CLAIM'
);

-- 2. Tickets (Assigned household tasks)
CREATE TABLE public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL,
    title TEXT NOT NULL,
    notes TEXT,
    helper_id UUID REFERENCES public.helper_profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'done', 'blocked')) DEFAULT 'todo',
    sop_id UUID REFERENCES public.house_sops(id) ON DELETE SET NULL,
    photo_evidence_url TEXT,
    is_after_hours BOOLEAN NOT NULL DEFAULT FALSE,
    scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_start TIMESTAMP WITH TIME ZONE,
    actual_end TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES public.user_profiles(id)
);

-- 3. Private Helper Notes (RLS-guarded scratchpad)
CREATE TABLE public.helper_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    helper_id UUID REFERENCES public.helper_profiles(id) ON DELETE CASCADE NOT NULL,
    text TEXT NOT NULL,
    done BOOLEAN NOT NULL DEFAULT FALSE,
    voice TEXT, -- Local URL path or pre-signed storage reference URL
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Quick Utos (Ephemeral messages)
CREATE TABLE public.quick_utos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_name TEXT NOT NULL,
    recipient_id UUID REFERENCES public.helper_profiles(id) NOT NULL,
    content TEXT NOT NULL,
    ack_state TEXT NOT NULL CHECK (ack_state IN ('sent', 'seen', 'done')) DEFAULT 'sent',
    after_hours BOOLEAN NOT NULL DEFAULT FALSE,
    emergency BOOLEAN NOT NULL DEFAULT FALSE,
    waiting BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Vales (Cash advance requests)
CREATE TABLE public.vales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    helper_id UUID REFERENCES public.helper_profiles(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'declined')) DEFAULT 'pending',
    approved_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
```

---

## 9. State and Context Handling

### 9.1 Reactive Realtime Synchronizations
The mobile client instantiates a single persistent connection to Supabase Realtime Channels on startup:
```typescript
const ticketSubscription = supabase
  .channel('public:tickets')
  .on('postgres_changes', { event: '*', filter: `helper_id=eq.${myHelperId}`, schema: 'public', table: 'tickets' }, (payload) => {
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
  })
  .subscribe();
```
This channel forces TanStack Query to invalidate cache lines when tasks are assigned, modified, or completed, ensuring real-time UI synchronization without requiring manual refresh gestures.

### 9.2 Local Grocery Checklist State Context
`GroceryCtx` handles local purchase lists:
- The context queries `public.grocery_items` where `bought = false`.
- The checklist calculates remaining petty-cash allocations: `remainingBudget = initialBudget - sum(actual_cost)`.
- Compressing receipt photos runs as an inline promise before writing updates back to the shared storage bucket.

---

## 10. Error Handling Strategy

- **Token Expiry Handlers:** Intercepts outgoing Supabase database requests. If session authentication fails due to expired JWT credentials, it triggers the GoTrue token refresh protocol. If refresh fails, it clears local state and displays a Taglish fallback modal: *"Nawalan ng session. Pakisuyong mag-login muli."*
- **Offline Upload Restarts:** If image uploads fail mid-task because of spotty coverage, the task status modification is safely retained in the local SQLite table. The sync controller automatically retries the payload sequentially when internet reconnects.
- **Empty / Incomplete Responses:** If a network call fails to fetch standard SOP images, the client falls back to cached standard vector icons or displays simplified text checklists, preventing app crashes.

---

## 11. Local Deployment Model

### 11.1 Local Environment Variables (`.env`)
Create a `.env` file in the root of the `LINARA_MOBILE` folder:

```env
# 1. Supabase Local Configuration Coordinates (Link with local dev CLI)
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsLWVudmlyb25tZW50...

# 2. National Labor Compliance Defaults
REGIONAL_MINIMUM_WAGE=6000.00
```

### 11.2 Development Setup & Verification
1. **Configure Environment:** Install Node.js (v20+), Bun, and the Expo Go client app on your physical test device.
2. **Install Dependencies:**
   ```bash
   bun install
   ```
3. **Apply Database Schema:** Ensure the local Supabase container is active and has the PostgreSQL tables applied (refer to Section 8).
4. **Boot Development Bundler:**
   ```bash
   bun run start
   ```
   Press `a` to run on Android Emulator, `i` to boot on iOS Simulator, or scan the generated QR code to run the app directly on your physical test device.
5. **Verify EAS Builds:**
   To test EAS build setups before publishing:
   ```bash
   eas build:configure
   eas build --platform all --local
   ```

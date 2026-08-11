# Linara Mobile — Mobile App Product Requirements Document (PRD) & Migration Plan

This document defines the complete product specifications, technical architecture, user flows, and step-by-step implementation roadmap for **Linara Mobile**, a React Native (Expo) application designed specifically for household staff in the Philippines (helpers, yayas, cooks, drivers, all-around).

By separating the user-facing roles, we establish an **Admin Web App + Mobile Native App** ecosystem:

- **Admin Web App (retaining the `LINARA` workspace):** A React/TanStack Start web dashboard for on-site family managers and Remote Admins (OFWs).
- **Mobile Native App (the `LINARA_MOBILE` workspace):** A lightweight, high-contrast, offline-first React Native (Expo) app for invited and claimed household staff ("invited users").

Both applications access and synchronize state through the same **Supabase Database Instance** (`public` schema tables and storage buckets).

---

## 1. High-Level Vision & Filipino-First Realities

The informal domestic work sector in the Philippines operates primarily on word-of-mouth and manual payouts (cash, GCash, Maya). **Linara Mobile** ensures **Dignity by Design**:

- **Portable Verified History:** Complete task completions, on-time records, and digital payslips belong strictly to the helper’s self-claimed account, allowing them to carry their verified work history to future households.
- **Transparency in Terms:** The helper reviews terms of work (base wage, shift start/end, daily rest breaks, and weekly rest days) _before_ claiming their account, flagging any discrepancies directly back to the employer's dashboard.
- **Batas Kasambahay Compliance:** Automates regional minimum wage compliance checks (NCR: ₱6,000/mo) and statutory splits (SSS, PhilHealth, Pag-IBIG) while accruing overtime/after-hours work as Rest Owed (Time-Off in Lieu) or premium rates (1.3x multiplier) on the pay ledger.
- **Domestic Philippine Fintech:** Fully supports local payment aggregator APIs like **HitPay** (Primary Choice, support for GCash, Maya, GrabPay, and banks) and **Xendit** (Alternative) to enable instant salary disbursements and vale (cash advance) payouts.

---

## 2. Core Tech Stack for Linara Mobile

The mobile client is optimized for battery efficiency, slow 3G/4G networks, and offline reliability.

- **Framework:** React Native (Expo SDK 52+) with **Expo Router** (file-based navigation).
- **State Management:** **TanStack Query v5** (React Query) for caching and synchronizing network responses, colocated with standard React Context.
- **Styling:** **NativeWind v4** (Tailwind CSS for React Native) to share design tokens, margins, and the warm color palette (Pine-teal `#1F5A54`, Sand `#F7F3EC`, Card Cream `#FDFBF6`, Terracotta-gold `#D99A6C`).
- **Offline Storage:** **SQLite** or **AsyncStorage** paired with a local client-side queue for Offline-First synchronization.
- **Device Capabilities:**
  - **Camera & Gallery:** `expo-camera` and `expo-image-picker` to photograph receipts (Palengke run) and task completion evidence (plated dish, clean living room) with local image compression (max width 1200px) prior to upload.
  - **Audio Recording:** `expo-av` for recording private audio notes and scratchpad entries in Taglish.
- **Backend Connection:** Supabase JS Client communicating with the centralized PostgreSQL database. Uses PostgreSQL Realtime broadcast channels for ephemeral messages (Quick Utos).

---

## 3. Step-by-Step User Flows & Screens

### 3.1 Onboarding and Account Handshake Flow

To prevent employer account-hijacking, onboarding is a secure digital handshake:

```
[Manager on Web Dashboard]                               [Helper on Mobile App]
            │                                                      │
            ├─► 1. Enters helper info, wage, shift                 │
            ├─► 2. Generates secure Invitation Code                │
            │                                                      │
            │      ─── (Shared via SMS or Viber) ─────────────────►│
            │                                                      ├─► 3. Opens app, enters code
            │                                                      ├─► 4. Reviews terms read-only
            │                                                      │    ├─► If Terms Match:
            │                                                      │    │   └─► Sets secure password & claims
            │                                                      │    └─► If Terms Mismatch:
            │                                                      │        └─► Flags incorrect fields & Halts
            ▼                                                      ▼
```

1. **Verify Invite Code (`(auth)/welcome.tsx`):** Unauthenticated screen. The helper inputs the 6-character alphanumeric invite code (e.g., `LN98A2`) generated in the manager's `people.tsx` dashboard.
2. **Review Employment Terms (`(auth)/review-terms.tsx`):** Fetches terms from `public.helper_profiles` (refer to type `Invite` in [`src/features/people/people.types.ts`](../LINARA/src/features/people/people.types.ts:27)). Displays Name, Station/Role, Monthly Rate, Shifts, and Rest Day.
3. **Discrepancy Flagging (`(auth)/flag-terms.tsx`):** If any item disagrees with verbal promises, the helper taps `"Something's not right?"`, selects the misaligned field, enters Taglish notes, and flags it. This freezes the onboarding process and creates an alert inside the manager's `<NeedsYou />` panel on the web app.
4. **Secure Claim (`(auth)/claim-account.tsx`):** If terms are correct, the helper enters their personal email and creates a secure password. The profile status transitions from `PENDING_CLAIM` to `ACTIVE` and locks out any employer access to credentials.

---

### 3.2 The Worker's Station (Tab Navigation)

Once authenticated, the app renders a bottom-tab navigation layout:

#### Tab 1: Today Page (`(app)/today.tsx`)

- **Dignity Header:** Displays a Taglish greeting (_"Magandang umaga, Ate Rosa."_), current shift indicators, and a countdown to the upcoming weekly rest day.
- **Active Focus Card:** Renders the single high-priority task. Integrates **House Standards (SOPs)** as interactive image/text slides (e.g., _"Bottle: 4oz warm water, 2 level scoops"_).
- **Ephemeral Quick Utos Feed:** Lightweight floating banners for momentary small asks (e.g., _"+ Rice"_, _"Come to living room"_). Features a single `"Got It"` or `"Done"` tap action that updates the web dashboard in real time.
- **Private Notes Scratchpad:** Private text area + microphone audio memo tool completely isolated behind Supabase RLS (Row-Level Security). Managers cannot view or search these notes. Features a `"Promote to Board"` trigger to convert a personal reminder into a public task card.

#### Tab 2: Pantry & Palengke (`(app)/pantry.tsx`)

- **Stock Indicators:** Replicates pantry listings (refer to [`src/features/pantry/pantry.constants.ts`](../LINARA/src/features/pantry/pantry.constants.ts)), showing items running below par thresholds.
- **Palengke Shopping Checklist:** Synchronizes with `GroceryCtx` to display the active marketing list, required units, and the allocated petty-cash budget.
- **Expense Receipt Slot:** The helper enters actual item costs and attaches a picture of the paper receipt before completing the Palengke Run task.

#### Tab 3: My Pay (`(app)/pay.tsx`)

- **Digital Payslips:** Transparent semi-monthly/monthly ledger history containing base wages, statutory contribution breakdowns (SSS, PhilHealth, Pag-IBIG), and HitPay payment confirmations.
- **Vale Ledger:** Lists pending, approved, or declined salary advance requests with simple form inputs to request new vales.
- **Rest Owed Counter:** Live ledger total showing accumulated after-hours rest hours/minutes (Time-Off in Lieu) accrued from working off-shift or during rest days.

---

## 4. Offline-First Sync Architecture

Mobile connectivity in Philippine provincial contexts is highly intermittent. **Linara Mobile** employs a robust offline-first synchronization queue:

```
                  [Device is Offline]
                           │
       ├───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
[Task Status Done]   [Capture Receipt]   [Save Private Note]
       │                   │                   │
       └───────────────────┼───────────────────┘
                           ▼
               [Saved to Client Queue]
             (SQLite / AsyncStorage Cache)
                           │
                 [Device Comes Online]
                           ▼
          [Auto-upload compressed photos]
        [Sync updates sequentially to Supabase]
```

- **Local Storage Cache:** All active tasks, pantry levels, and notes are cached locally upon successful load.
- **Sync Queue Schema:**
  ```typescript
  interface SyncAction {
    id: string; // UUID
    actionType: "UPDATE_STATUS" | "COMPLETE_TASK" | "ADD_NOTE" | "VALE_REQUEST";
    payload: any; // Serialized arguments
    filePath?: string; // Path to compressed local receipt/evidence image
    createdAt: number; // Timestamp
  }
  ```
- **Execution Rules:**
  1. When network state `navigator.onLine === false`, UI mutations execute instantly in local cache, and a `SyncAction` is pushed to the SQLite/AsyncStorage table.
  2. A background listener monitors network re-connection.
  3. Upon transition back online, the client uploads compressed images (JPEG compressed using Expo Image Manipulator) to Supabase Storage, retrieves secure URLs, and posts the queued requests in strict sequential order.

---

## 5. Centralized Database Schema (Shared)

The mobile app reads and writes to the centralized database. RLS policies are applied based on the authenticated helper's user ID.

- **Helper Profile:** [`public.helper_profiles`](../LINARA/ARCHITECTURE.md:626)
- **Invite Flags:** [`public.invite_flags`](../LINARA/ARCHITECTURE.md:750)
- **Private Notes:** [`public.helper_notes`](../LINARA/ARCHITECTURE.md:741)
- **Quick Utos:** [`public.quick_utos`](../LINARA/ARCHITECTURE.md:727)
- **Tickets & SOPs:** [`public.tickets`](../LINARA/ARCHITECTURE.md:652) and [`public.house_sops`](../LINARA/ARCHITECTURE.md:643)
- **Wages & Vales Ledger:** [`public.ledger_entries`](../LINARA/ARCHITECTURE.md:679) and [`public.vales`](../LINARA/ARCHITECTURE.md:691)

---

## 6. Step-by-Step Execution Roadmap

This 10-story roadmap coordinates the bootstrapping, layout development, feature migration, offline capability, and final deployment of **Linara Mobile**.

### Story 1: Project Bootstrapping & Core Native Ingestion

- **Objective:** Initialize the Expo project, configure directory extraction rules, and install dependencies.
- **Tasks:**
  1. Boot React Native Expo using Bun: `bun create expo-app LINARA_MOBILE -t expo-template-blank-typescript`.
  2. Setup file-based routing with Expo Router and configure `@/*` TypeScript aliases.
  3. Install styling libraries: `nativewind` and Tailwind CSS v4 configurations.
  4. Initialize the Supabase Client SDK and link it with the existing credentials template (`.env.example`).
- **Definition of Done:** Empty Expo project boots successfully on both iOS Simulator and Android Emulator with styling and TS working.

### Story 2: Handshake & Claim Screens Implementation

- **Objective:** Re-create the pre-onboarding, flagging, and registration screens in React Native.
- **Tasks:**
  1. Build `(auth)/welcome.tsx` containing the 6-digit invitation entry field.
  2. Implement `(auth)/review-terms.tsx` fetching helper terms from the shared database.
  3. Create `(auth)/flag-terms.tsx` allowing helpers to choose incorrect categories (e.g., `"wage"`, `"shift"`) and input Taglish explanations, pushing the rows to `public.invite_flags`.
  4. Develop `(auth)/claim-account.tsx` with email/password input to transition the helper status to active.
- **Definition of Done:** A tester can input a valid invite code from the database, review terms, flag incorrect data, or successfully input credentials and claim the account.

### Story 3: Worker's Station Layout & Tab Navigation

- **Objective:** Set up the main navigation shell, bottom tabs, and the Dignity Header.
- **Tasks:**
  1. Build the root layout `(app)/_layout.tsx` featuring standard bottom tabs (Today, Pantry, Pay).
  2. Implement the Dignity Header component inside `(app)/today.tsx` mapping name, shift hours, and weekly rest days.
  3. Add the `RosaAvailControl` component with big, accessible touch-targets for states (On Shift, Available, Off).
- **Definition of Done:** Authenticated users land in the Today tab and can toggle their reachability status smoothly with visible shift information.

### Story 4: Active Task Detail & Standard SOP Slides

- **Objective:** Create the main interactive task focus card that embeds house standards.
- **Tasks:**
  1. Fetch active tasks using TanStack Query, isolating tickets assigned to the active helper ID.
  2. Build the Active Focus Card showing the primary, uncompleted ticket.
  3. Embed the House Standard SOP slideshow inside the ticket card, allowing helpers to swipe left/right to view clean physical guidelines (refer to [`src/components/ui/carousel.tsx`](../LINARA/src/components/ui/carousel.tsx)).
  4. Integrate status buttons (Start Task, Done).
- **Definition of Done:** The Today page displays the next upcoming task. Swiping through SOP guidelines works, and tapping Start or Done updates the database status field.

### Story 5: Ephemeral Quick Utos Live Feed

- **Objective:** Set up real-time floating banners for short-order tasks.
- **Tasks:**
  1. Implement a WebSocket channel listener connecting to `public.quick_utos` for the active helper.
  2. Build floating, lightweight alert banners that appear at the bottom of the layout when a new utos is dispatched.
  3. Create an instantaneous `"Got It"` action button that sets `ack_state` to `done`.
- **Definition of Done:** A task sent from the manager's web console triggers an immediate floating banner on the mobile screen, which vanishes instantly upon acknowledgment.

### Story 6: Private Notes Scratchpad

- **Objective:** Create the private scratchpad notepad secure behind RLS.
- **Tasks:**
  1. Implement a private text editor inside `(app)/today.tsx` writing rows to `public.helper_notes`.
  2. Configure a `Hold to Record` Taglish voice recorder utilizing `expo-av` to record audio bytes and save local file URLs.
  3. Add a `"Promote to Board"` button to transform private notes into shared public task cards with status `todo`.
- **Definition of Done:** Private text notes save correctly to the database. Tapping promote turns the private note into an active household task on the manager's board.

### Story 7: My Pay Tab & statutory calculation displays

- **Objective:** Recreate the financial ledger, vale advances, and compliance tables on mobile.
- **Tasks:**
  1. Build the ledger viewer in `(app)/pay.tsx` showing accrued base wages, contribution tables, and payment statuses.
  2. Create the Vale Request module, containing simple form fields to send cash advances and view approval states.
  3. Add a prominent "Rest Owed" display summarizing overtime hours compiled in the After-Hours Ledger.
- **Definition of Done:** Payslips, active vales, and rest hours display accurate information mapped directly from backend tables.

### Story 8: AsyncStorage/SQLite Offline-First Sync Queue

- **Objective:** Enable robust offline-first capabilities for ticket completion and expense uploads.
- **Tasks:**
  1. Create a SQLite or AsyncStorage sync queue table storing actions, timestamps, and payloads.
  2. Intercept API updates when the device is disconnected, pushing actions to the offline table.
  3. Integrate `expo-camera` or `expo-image-picker` to capture receipts and compress images locally before saving file references.
  4. Write a listener that triggers sequential synchronization of queued updates and media assets upon detecting internet connection.
- **Definition of Done:** A tester can complete tasks and upload receipts while in airplane mode. Re-connecting to the internet syncs all data and images sequentially to Supabase storage.

### Story 9: Supabase Realtime Channels Integration

- **Objective:** Establish automatic sync of boards, schedules, and pay details.
- **Tasks:**
  1. Initialize Supabase Realtime channels in `(app)/_layout.tsx` targeting updates in `public.tickets`, `public.helper_profiles`, and `public.ledger_entries`.
  2. Hook database changes directly into TanStack Query's invalidation client, forcing cache invalidation on modified rows.
- **Definition of Done:** Changes made on the Manager's Web console (e.g., rescheduling an appointment, approving a vale) reflect on the mobile screen instantly without manually pulling to refresh.

### Story 10: Performance Optimization, Polish, and Expo Pre-flight

- **Objective:** Apply brand style design tokens, layout transitions, and build production packages.
- **Tasks:**
  1. Configure custom brand typography (Fraunces and Nunito Sans) on mobile.
  2. Apply NativeWind variants for smooth loading skeletons, status chip colors, and disabled states.
  3. Optimize image render sizing and clear stale local audio files.
  4. Build the project using EAS Build (`eas build`) for iOS (TestFlight) and Android (APK).
- **Definition of Done:** The app runs smoothly on physical devices at 60fps, utilizing standard corporate brand assets, and EAS builds complete successfully.

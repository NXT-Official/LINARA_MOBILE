# Linara Mobile — The Worker's Station

**Linara Mobile** is a high-contrast, offline-first native mobile application built on **React Native (Expo)**. It is designed specifically for household staff in the Philippines (yayas, cooks, laundresses, drivers, all-around helpers) to manage their daily workflows, view terms of work, request vale advances, and maintain a portable, verified employment record.

This application connects to the centralized **Supabase Database Instance** shared with the main [**Linara Admin Web App**](../LINARA/README.md).

---

## 🚀 Core Product Capabilities

- **Onboarding Handshake:** Handshake code registration that allows workers to review terms (base wage, shift start/end, daily rest breaks, and weekly rest days) *before* claiming their account. If terms mismatch verbal agreements, helpers can flag discrepancies directly back to the employer's dashboard.
- **The Today Screen:** Displays a welcoming Taglish greeting (*"Magandang umaga, Ate Rosa."*), visual rest-day countdowns, and a single-focus card highlighting the active task with swipable **House Standard (SOP)** visual steps.
- **Quick Utos Live Feed:** Lightweight floating notification banners for immediate short-order requests (e.g., *"+ Rice"*, *"Come to kitchen"*). Tapping `"Got It"` updates the web dashboard in real time with sub-second latency.
- **Private Notes Scratchpad:** RLS-isolated personal notepad allowing helpers to capture text and record audio notes in Taglish. Features an `"Add to Board"` trigger to promote private reminders into active, shared task tickets.
- **My Pay Tab:** Displays payslip history, SSS/PhilHealth/Pag-IBIG compliance sheets, vale (salary advance) submission forms, and a live overtime counter representing accrued Rest Owed (Time-Off in Lieu) from the After-Hours Ledger.

---

## 🛠️ Technical Architecture Overview

Refer to [`architecture.md`](architecture.md) for full specifications:
- **Framework:** React Native inside Expo SDK 52+ (managed workflow).
- **Navigation:** Expo Router (typed file-based layouts under `app/`).
- **Cache & Sync:** TanStack Query v5 configured with a centralized Supabase JS client.
- **Design & Theme:** NativeWind v4 (Tailwind engine compiles to native iOS/Android primitives).
- **Offline Sync Queue:** Local SQLite table storing queued mutations (such as status updates, cash requests, and compressed receipt image files) during offline status, syncing sequentially when network re-connects.
- **Native Device Features:**
  - `expo-camera` & `expo-image-picker`: Low-level camera selectors capturing task evidence and grocery receipts, compressed client-side (JPEG, 1200px max width, 80% quality) to reduce mobile data costs.
  - `expo-av`: Audio session recorders for capturing Taglish speech notes.

---

## ⚙️ Environment Variables Configuration

Create a `.env` file in the root of your `LINARA_MOBILE` directory. Do not commit this file to git.

```env
# 1. Supabase Local Configuration Coordinates (Link with local dev CLI)
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsLWVudmlyb25tZW50...

# 2. National Labor Compliance Defaults
REGIONAL_MINIMUM_WAGE=6000.00
```

---

## 📦 Developer Installation & Run Guides

Ensure you have **Node.js (v20+)**, **Bun**, and the **Expo Go** client app (installed on your physical iOS or Android testing device) ready before proceeding.

### 1. Install Project Dependencies
Verify that your terminal is active inside the `LINARA_MOBILE` workspace folder, then run:
```bash
bun install
```

### 2. Connect to the Central Database
Make sure your local Supabase database container is running and contains the applied public schema (refer to Section 8 in [`../LINARA/ARCHITECTURE.md`](../LINARA/ARCHITECTURE.md:611)):
```bash
# Verify local Supabase is active
supabase status
```

### 3. Boot the Development Bundler
Start the local Expo development bundler:
```bash
bun run start
```
- **Run on Simulators:** Press `i` to launch on the iOS Simulator, or press `a` to run on the Android Emulator.
- **Run on Physical Devices (Recommended):** Scan the generated terminal QR code using your phone's native camera app (iOS) or the Expo Go app scanner (Android). Your phone must be connected to the same Wi-Fi network as your computer.

### 4. Create Local Pre-flight Builds
To configure or compile native binaries locally utilizing EAS (Expo Application Services):
```bash
# 1. Login to your Expo developer account
eas login

# 2. Configure project profiles
eas build:configure

# 3. Compile local debug/development build (iOS/Android)
eas build --platform all --local --profile development
```

---

## 🧑‍💻 Code Quality & Testing Guidelines

We enforce clean, type-safe, and formatted coding standards:

```bash
# Run ESLint check
bun run lint

# Verify type safety
bun run typecheck

# Format codebase with Prettier
bun run format
```

All folder and module file allocations must conform to the unidirectional import hierarchy specified in [`architecture.md`](architecture.md):
- Core features belong inside localized folders under `components/features/`.
- Cross-feature imports are strictly forbidden unless importing types or constants downstream.
- Conversational Taglish labels and toast notices must remain polite, warm, and highly respectful (utilizing Taglish honorifics like *"po"* and *"opo"*).

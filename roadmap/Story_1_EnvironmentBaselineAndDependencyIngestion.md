# Story 1: Environment Baseline & Dependency Ingestion

## Objective
Bootstrap the Expo native TypeScript application, audit lockfiles, configure robust `.gitignore` rules to avoid committing cache bundles, map path aliases, and verify clean local compilation of base dependencies. This story must be completed before any application logic is written.

## Context References
- **PRD Specs:** [`../LINARA_MOBILE/plan.md`](../LINARA_MOBILE/plan.md:Story 1)
- **Technical Architecture:** [`../LINARA_MOBILE/architecture.md`](../LINARA_MOBILE/architecture.md:Section 11)
- **Existing Asset References:** [`package.json`](package.json) (use as dependency coordinate guide).

## Explicit Dependencies
- None (Initial story of Phase 1).

## Explicit Inputs
- **File System:** Existing environment parameters layout from [`.env.example`](.env.example).

## Step-by-Step Implementation Instructions
1. Navigate to the `LINARA_MOBILE` workspace parent. Initialize the React Native Expo app utilizing Bun:
   ```bash
   bun create expo-app LINARA_MOBILE --template expo-template-blank-typescript
   ```
2. Configure `.gitignore` in the root of the folder to exclude:
   - Expo development build caches (`.expo/`, `.next/`, `web-build/`)
   - Native build caches (`ios/`, `android/` directories generated on the fly)
   - Binary packages (`node_modules/`)
   - Sensitive credentials files (`.env`, `.env.local`, `*.keystore`)
3. Install the primary dependencies:
   - Supabase SDK: `bun add @supabase/supabase-js`
   - TanStack Query: `bun add @tanstack/react-query`
   - Navigation & Routing: `bun add expo-router react-native-safe-area-context react-native-screens`
   - Layout Utilities: `bun add react-native-gesture-handler expo-status-bar`
4. Integrate styling primitives:
   - Install NativeWind v4: `bun add nativewind react-native-css-interop`
   - Set up custom branding pine-teal, sand, cream, and terracotta colors inside a root Tailwind CSS config.
5. Setup TypeScript absolute path mapping in `tsconfig.json` so that `@/*` resolves directly to `./*`.
6. Document variables inside the template file `.env.example`.

## Expected Output
- A compile-ready, empty Expo project directory with fully audited dependencies.
- A functional `.gitignore` file that screens binary logs.
- Path aliases configured inside `tsconfig.json` and a `.env.example` template mapping regional parameters.

## Acceptance Criteria
- Running `bun install` resolves all dependencies with zero unresolved packages or conflicting lockfiles.
- Running `bun run start` successfully boots the Metro bundler.
- Compiles successfully on local simulated devices with zero warnings or absolute path resolution failures.

## Definition of Done
- Metro bundler loads the empty template.
- All configurations match strict TypeScript parameters.
- Git excludes cache packages.

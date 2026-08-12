# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Required reading before any task in this repo

This workspace is one half of a two-app system that shares a single Supabase
Postgres instance with the [`LINARA`](../LINARA/README.md) web dashboard
workspace. Before implementing, reviewing, or modifying anything here, read:

1. [`plan.md`](plan.md) — product requirements, user flows, screen-by-screen spec, and the original 10-story roadmap.
2. [`architecture.md`](architecture.md) — tech stack, directory layout, state management, and the full shared Postgres schema (Section 8) this app reads/writes.
3. [`aiagent.md`](aiagent.md) — system prompts and JSON schemas for the two on-device AI agents (Voice-to-Task Promoter, SOP Taglish Simplifier).
4. [`execution_plan.md`](execution_plan.md) — the authoritative 11-story roadmap and per-story files under [`roadmap/`](roadmap/). This is the current source of truth for "what story am I on" — it supersedes the older 10-story roadmap embedded in `plan.md` Section 6 where the two disagree.
5. [`app_dev_rules.md`](app_dev_rules.md) — mandatory execution rules for implementing a story (pre-existing-context priority, scope discipline, git hygiene, terminology sanitization).

**Cross-repo context — do not treat this app in isolation:**

- Both apps point at the **same** Supabase project (`EXPO_PUBLIC_SUPABASE_URL` here == `SUPABASE_URL` in `../LINARA/.env`). Never add, rename, or drop a database column or storage bucket policy from this workspace without checking `../LINARA/architecture.md` Section 8 for the canonical schema first — this app must stay backward-compatible with it.
- `public.helper_notes` is RLS-isolated per helper (the "Privacy Wall") — no code path in either app may let a manager read it.
- The mobile client is helper-facing only; the manager-facing Pass/Board/Money views live exclusively in `../LINARA`.
- If something here seems to contradict `../LINARA/architecture.md` or `../LINARA/plan.md`, the web repo's docs win for anything schema-related — flag the discrepancy rather than silently picking one.

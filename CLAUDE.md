@AGENTS.md

# CLAUDE.md — Linara Mobile · Project Directive & Pipeline Gates

This file applies the global directive (`~/.claude/CLAUDE.md`) to this repo. `AGENTS.md` (imported
above) holds the required reading and the cross-repo rules; `architecture.md` and
`../LINARA/ARCHITECTURE.md` Section 8 hold the contracts. This file adds what is specific to working
here with Claude Code: operating mode, git gating, the exact validation commands, the 3-stage pipeline
with its cold-freeze QA protocol, tooling, and the handoff format.

---

## 1. Operating Mindset

- Act as an elite co-developer and strict QA gatekeeper.
- Lead directly with code, command output, and actionable analysis. No pleasantries, apologies, or
  narration. Answer short-form questions concisely; elaborate only when asked.
- Apply surgical diffs only: never reformat, refactor, or delete adjacent code you were not asked to
  touch.
- Enforce strict proof: never declare a task complete without running the relevant scoped command
  (§3) and showing its output and exit code.

---

## 2. Git & Version Control Guardrails

- **Never run `git add`, `git commit`, `git push`, `git checkout -b` / `git switch -c`, `git merge`,
  `git rebase`, `git tag`, or `git reset --hard` on your own initiative.** Each needs an explicit,
  unambiguous instruction in the current request. Approval for one commit is not approval for the
  next, or for a push.
- **Never push to `main`, `staging`, or `production`.** Never force-push any branch. Never delete a
  remote branch. Never amend a pushed commit. Never skip hooks (`--no-verify`) or signing.
- When work is finished, leave it as uncommitted working-tree diffs and list every modified file.
- Commit messages, when asked for, follow Conventional Commits with a feature-area scope and a
  plain-English outcome, as the history does: `feat(pantry): …`, `fix(pay): …`, `fix(startup): …`,
  `style(mobile): …`, `docs(pay): …`. One feature per commit. A fix for a `../LINARA/KNOWN_GAPS.md`
  entry cites its ID (`fix(pay): only ask a helper to confirm her own payments (O45)`); a fix for a
  device-QA finding cites that ID (`fix(today): close the edit sheet on hardware back (QA F-LM-002)`).
- Read-only git commands (`status`, `diff`, `log`, `show`, `branch`, `fetch`) need no approval.
- `apk-preview/` (a local preview APK, ~140 MB) is untracked and **not** gitignored — never stage it.

---

## 3. Fast Targeted Validation Commands

> Never run repository-wide suites for a small edit. Scope validation to the files you touched; the
> full suite runs only at a stage gate (§4).

Bun is the package manager (`bun.lock`; CI runs `bun install --frozen-lockfile` then `bun run`). No
Node version is pinned (no `.nvmrc`, no `engines`). Vitest 4, ESLint 9 flat config (`eslint.config.js`,
`eslint .`), `tsc` strict, Prettier enforced through ESLint. Add packages only with `npx expo install`,
and only after approval. Never run `npm install`: it would write a `package-lock.json` next to
`bun.lock`.

```bash
# Install (lockfile is protected)
bun install --frozen-lockfile
git config core.hooksPath .githooks       # once per clone, if `prepare` didn't run: turns on the pre-push QA hook

# Typecheck (whole project — tsc cannot be scoped without dropping tsconfig paths; it is fast)
bun run typecheck

# Scoped lint (same rule set as `bun run lint`)
npx eslint <relative-path-to-file-or-folder>

# Scoped unit tests
npx vitest run lib/<subject>.test.ts                     # one test file
npx vitest related <relative-path-to-file> --run         # tests that import the changed file
npx vitest run lib/<subject>.test.ts -t "<name>"         # one test by name

# Markdown / JSON formatting (code files get Prettier through ESLint)
npx prettier --check <relative-path>

# Stage-gate suite (PR into main, and before any promotion)
bun run qa:fast    # typecheck + lint + unit tests — also what the pre-push hook runs
bun run qa         # the above + Android bundle (`expo export --platform android`)
#   Both write qa-reports/latest.md and track each failure as M-<n> in qa-reports/issues.json.

# Promotion gate extras
npx expo-doctor

# Staging device QA (black-box, preview APK) — harness lives OUTSIDE the repo
#   ..\stress-testing\  (not created yet: copy from the global `mobile-app-testing` skill's scripts\)
..\stress-testing\run-flows.ps1 -Package com.linara.mobile                 # Maestro suite, `credits` flows excluded
..\stress-testing\run-flows.ps1 -Package com.linara.mobile -Tags smoke     # smoke subset
..\stress-testing\run-monkey.ps1 -Package com.linara.mobile -Seeds 101,202,303,404,505 -Events 5000

# Refresh the codebase knowledge graph (token-saving navigation)
/graphify . --update
```

**What CI does and does not check.** `.github/workflows/validate-pull-request.yml` runs on pull
requests into `main` (and `development`, which does not exist) and runs **lint + typecheck only — no
unit tests, no bundle**. Unit tests run only locally: in `bun run qa*` and in the pre-push hook, and
the hook is off until `core.hooksPath` is set on that clone.

### Test layout

- Tests are co-located in `lib/` as `<subject>.test.ts` (14 files today). There is no `__tests__/`.
- Vitest runs with **no config file**: Node environment, default include pattern, and **no `@/`
  alias resolution**. A module under test may use `import type … from "@/…"` (erased, e.g.
  `lib/pantry.ts`), but a runtime import of `@/…`, `react-native`, or `expo-*` breaks its test.
  Keep decision logic pure in `lib/` with relative imports so it stays testable.
- There is no component, hook, or service harness (no RN renderer, no Supabase mock), and
  `services/supabase.ts` throws at import without env vars via `lib/env.ts`. Adding test
  infrastructure (a `vitest.config`, a testing library) is a dependency change — ask first.
- Time-zone-sensitive tests use `vi.stubEnv("TZ", …)`, never `process.env.TZ = …` (lint bans
  `process.env`; see `lib/datetime-fields.test.ts`).

### Lint rules that fail most often (real defects, not style nits)

- `no-restricted-syntax` on `process.env`: only `lib/env.ts` may read it, with static dot access
  (Expo inlines `EXPO_PUBLIC_*` by literal name; `process.env[name]` stays `undefined` in a release
  bundle). Everything else imports the constants from `lib/env.ts`.
- `@typescript-eslint/no-explicit-any`: no `any` anywhere.
- `@typescript-eslint/no-unused-vars`: prefix a deliberately unused binding with `_`.
- `react-hooks/rules-of-hooks` (error). `react-hooks/exhaustive-deps` is a warning and does not fail
  lint — still read it.
- `prettier/prettier`: double quotes, semicolons, trailing commas, `printWidth` 100. A `Delete ␍`
  error means a file was written with CRLF; `.gitattributes` forces LF — fix the line endings, never
  the rule.

Not lint-enforced, but held today (keep it that way): `services/` and `lib/` never import from
`app/`, `components/`, or `hooks/`; `components/features/<area>/` never imports another feature area
except for types and constants.

---

## 4. 3-Stage Pipeline & Cold Freeze QA Protocol

```
[STAGE 1: DEV] feature/* · fix/* · jamesDev · nicoleDev ──PR──► main ──promote──►
[STAGE 2: STAGING] staging  (COLD FREEZE & DEVICE QA) ──promote──►
[STAGE 3: PROD] production  (store release)
```

Origin has only `main`, `jamesDev`, and `nicoleDev`. **`staging` and `production` do not exist yet**;
creating them is an explicit-instruction action (§2). Every stage maps to an EAS profile in
`eas.json`:

| Stage       | Branch                                | EAS profile   | EAS environment | Package             | Artifact                                  | For                                     |
| ----------- | ------------------------------------- | ------------- | --------------- | ------------------- | ----------------------------------------- | --------------------------------------- |
| **Dev**     | feature/fix/personal → PR into `main` | `development` | `development`   | `com.linara.mobile` | Dev-client build, internal                | The developer, on a real device         |
| **Staging** | `main` promoted to `staging`          | `preview`     | `preview`       | `com.linara.mobile` | Release-mode APK, internal                | QA and client sign-off                  |
| **Prod**    | `staging` promoted to `production`    | `production`  | `production`    | `com.linara.mobile` | AAB (`autoIncrement`, remote versionCode) | Play Store / App Store via `eas submit` |

**Pipeline facts that change how you test:**

- **One package for every profile.** `app.json` is static (no `app.config.ts`, no `APP_VARIANT`), so a
  dev, preview, and prod build replace each other on a device — they cannot be installed side by
  side, and uninstalling to switch clears the signed-in session.
- `EXPO_PUBLIC_*` values for builds come from the EAS environment named in each profile
  (`eas env:list --environment <name>`), not from `eas.json` and not from the local `.env`.
- CI runs only on pull requests (§3). Nothing runs on a push, on `staging`, or on `production`, and a
  local `git merge` into `main` skips CI entirely — the local gates are the only check before a
  promotion.
- All profiles point at the **same** Supabase project the `../LINARA` web dashboard uses
  (AGENTS.md). A staging build reads and writes live data that real households' dashboards show —
  terms flags, vale and leave requests, payment confirmations, ticket updates. **Treat staging
  testing as production testing**, and only ever against a dedicated test household.
- The AI edge functions this app calls (`transcribe-notes`, `promote-voice-task`, `simplify-sop`)
  return mocks today (`../LINARA/KNOWN_GAPS.md` O26). Once a provider is set they spend real money:
  tag every flow that reaches them `credits` now, so they stay excluded by default.
- A shipped binary cannot be hot-fixed from the server. Every table, RPC, and edge-function contract
  it depends on must keep working for as long as that version is installed. The manager side is the
  exception: it is the web dashboard in a WebView (`app/manager.tsx`, O18), so it changes with
  `../LINARA` deploys, not with app releases.

**Outward-facing actions** — do not run `eas build`, `eas submit`, `eas update`, `eas env:*` writes,
or `eas metadata:push`, and do not merge or promote into `main`, `staging`, or `production`, unless
explicitly asked in the current request.

### STAGE 1: DEVELOPMENT (`feature/*`, `fix/*`, personal branches)

- Feature work and bug fixes stay isolated on their own branches. Never commit directly to `main`,
  `staging`, or `production`.
- **Mandatory 4-point edge-case suite.** Every piece of decision logic — money and statutory math,
  date and cutoff rules, validation, queue ordering, the session/role gate — ships with tests
  covering the four points below. Where the decision lives in a service, hook, or screen the current
  harness cannot reach (§3), extract it into a pure `lib/` function and test that; device QA covers
  the wiring.
  1. **Happy path** — valid input, expected value or parsed row, correct TanStack Query key
     invalidated after a mutation.
  2. **Malformed / boundary input** — empty strings, length limits, missing required fields, PH
     mobile-number formats, peso rounding (`net-pay`, `statutory`), cutoff / week / time-zone
     boundaries, oversized images (1200 px, 80 % JPEG).
  3. **Auth & access failures** — no session, expired JWT (the token-refresh path, then the Taglish
     re-login fallback), RLS returning empty vs. erroring, a manager account routed to the WebView,
     and the Privacy Wall: no path lets a manager read `helper_notes`.
  4. **State / concurrency failures** — double tap / duplicate submit (vale, leave, rest-off,
     payment confirmation, ticket status), offline writes landing in the SQLite queue and draining in
     chronological order, timeouts, null / empty server returns, stale cache after a mutation,
     Realtime events arriving out of order.
- Every bug fix in testable logic lands with a test that fails without the fix.
- **Gate to `main`:** a PR (so CI runs) with CI green, `bun run qa:fast` passing locally, and the
  change run on a real Android device with a `development` build.

### STAGE 2: STAGING (COLD FREEZE & DEVICE QA)

Promoting `main` into `staging` starts a **Cold Freeze**:

- **Zero feature code.** No new features, scope creep, dependency bumps, or speculative refactors.
- **Fixes only.** Only fixes for findings raised by this staging QA cycle, on `fix/staging-*`
  branches, each citing its `F-LM-###` ID. A fix re-enters through the Stage 1 gate (PR into `main`,
  then re-promote) — never a direct commit to `staging`.

**Automated device QA** — follow the global `mobile-app-testing` skill against the `preview` APK on a
dedicated `Linara_Test` emulator (not created yet; **never use `Mila_Test`** — it belongs to another
project), then a real device:

1. Safety gate: a dedicated test household on the shared project, with a test helper account
   (onboarded through a 6-character invite code) and a test manager account, each signed in by hand.
   The monkey credit watchdog (`-MaxCreditSpend`) does nothing here — there is no on-screen balance
   to read — so keep `credits`-tagged flows excluded, and once O26 closes, revoke `RECORD_AUDIO` for
   monkey runs and get any AI spend approved first.
2. **Maestro functional suite** (`run-flows.ps1`): onboarding (`welcome` → `review-terms` →
   `flag-terms` → `claim-account`), sign-in / create-account / forgot-password, session persistence,
   every tab (Ngayon, Linggo ko, Pantry, Sahod ko, Record ko), primary journeys (focus card and SOP
   carousel, Quick Utos, private notes, grocery runs and receipt capture, vale / leave / rest-off
   forms, payslips, work-record PDF export), the manager WebView, the startup safety net (Try again /
   Sign out after 12 s, O44), **hardware back on every screen, modal, and sheet** (release gate),
   offline and reconnect with queue drain, error states with retry, tab-switch endurance.
3. **Seeded monkey** (`run-monkey.ps1`): ≥ 5 seeds; zero `FATAL EXCEPTION`, zero ANR, zero
   `E ReactNativeJS`; memory (PSS) curve reviewed for leaks.
4. Failure screenshots and hierarchy JSON are kept in the run folder for every red step.
5. Findings go into `..\stress-testing\QA-REPORT.md` as `F-LM-###` (zero-padded, in discovery order,
   never reused, starting at `F-LM-001`), in the skill's report format, each verified twice with
   numbered reproduction steps. (`M-<n>` IDs are the static checks tracked by `bun run qa`; `O<n>` /
   `C<n>` are `../LINARA/KNOWN_GAPS.md` entries.)

**Backend non-destruction check** (mobile's equivalent of a migration check):

- The mobile client makes **no schema changes** — no tables, columns, policies, RPCs, or edge
  functions. Confirm the diff since the last promotion touches none. The one SQL file here,
  `supabase/storage-policies.sql`, is applied by hand to the shared project: a change to it is a live
  storage-policy change and goes through `../LINARA/ARCHITECTURE.md` Section 8 first (AGENTS.md).
- Every table, RPC, and edge function the build calls exists on the live backend with the shape the
  client parses; no call depends on an unmerged or undeployed `../LINARA` change.
- The Privacy Wall holds: no code path — the manager WebView included — reads `helper_notes` as a
  manager.

**Proof-based reporting.** Staging is never marked verified without the raw Maestro summary
(`n/n Flows Passed`), the monkey `summary.csv`, the logcat crash counts, and the exit codes of
`bun run qa` and `npx expo-doctor`.

### STAGE 3: PRODUCTION (`production`)

Promotion from `staging` to `production` is blocked until every item is verified:

- [ ] Staging device QA passed: Maestro suite green (except tracked `known-bug` flows signed off as
      deferred), monkey seeds clean, and every open `F-LM-###` either fixed and re-verified or
      explicitly deferred by the owner.
- [ ] The `preview` build has been signed off on a real device, and previously built features have
      been re-tested against it.
- [ ] Zero `FATAL EXCEPTION` / `E ReactNativeJS` in logcat from the staging build over the QA window.
      The app has no crash reporter (no Sentry), so logcat is the only crash evidence — keep it.
- [ ] Backward compatibility: every table, RPC, and edge-function contract used by versions still
      installed in the field keeps working; no breaking response change without a version bump.
- [ ] Environment audit: every `EXPO_PUBLIC_*` the app reads (`lib/env.ts`: `SUPABASE_URL`,
      `SUPABASE_ANON_KEY`, `WEB_APP_URL`) is set with the correct value in the `production` EAS
      environment, every new variable is in `.env.example` and read only through `lib/env.ts`, and no
      server secret (service-role key, AI provider key) is in any `EXPO_PUBLIC_*` value. There is no
      secret-scan script yet; adding one needs approval.
- [ ] `npx expo-doctor` passes.
- [ ] Production AAB built with EAS, installed from the Play **internal testing track** on a real
      device, and smoke-tested there (`run-flows.ps1 -Package com.linara.mobile -Tags smoke`) — not
      only the preview APK.
- [ ] Rollback plan logged in the Obsidian release note (§6): a store binary cannot be un-shipped, so
      the plan is to halt the Play staged rollout and promote a rebuilt previous tag; note which
      server behaviour (`../LINARA/supabase/*.sql`, edge functions, web deploy) the new version
      depends on.
- [ ] Release tagged `vX.Y.Z` matching `expo.version` in `app.json` (versionCode / buildNumber are
      managed remotely by EAS — `appVersionSource: remote` — so the values in `app.json` are ignored).
- [ ] Staged rollout in Play Console (internal → closed → production %), not a 100% release.

---

## 5. Protected Assets & Repository Invariants

Never hand-edit:

- `bun.lock` — and never create a `package-lock.json` beside it.
- `expo-env.d.ts` and `.expo/types/**` — generated by Expo (typed routes).
- `scripts/qa-runner.mjs` — kept byte-identical with `../LINARA/scripts/qa-runner.mjs`. Change both
  together or neither.
- `supabase/storage-policies.sql` — SQL already applied to the shared project (§4).
- There are no migrations in this repo, and none may be added: the schema and its SQL live in
  `../LINARA` (AGENTS.md).

---

## 6. Skills, Context Hygiene & Tooling

- **Skills:** `/graphify` (knowledge graph; follow `~/.claude/skills/graphify/SKILL.md`), `/commit`
  (draft a Conventional Commit from `git diff`, wait for approval), `/mobile-app-testing` (all device
  QA in §4), `/sync-docs` (ADRs and release notes to the vault). `/test-smoke` is for web apps: the
  manager dashboard's browser QA belongs in `../LINARA`, not here.
- **Navigation:** consult `graphify-out/graph.json` before broad greps once it exists (it does not
  yet; build it with `/graphify .`). Keep command output condensed to failures, stack traces, and exit
  codes. Prompt for `/compact` or `/clear` between distinct features or at ~50 % context.
- **Obsidian vault:** the parent folder `..\` (`G:\Naaxtech-projects\LINARA\`, holds `.obsidian`);
  QA documents live in `..\QA-documentation\`. Read specs there instead of asking for them again.
- **Postgres MCP:** read-only schema introspection only. It is the shared live database — never
  write, and never query `helper_notes` contents.
- **GitHub MCP:** `NXT-Official/LINARA_MOBILE` for PR and diff work, under the same §2 gating.
- **Hermes:** background execution, routine scripts, and maintenance tasks where applicable.

---

## 7. Execution & Handoff Summary Format

Conclude every completed task with exactly:

- **Files Modified:** `<comma-separated list of paths>`
- **Verification Executed:** `<command> -> Exit Code: <0 or failure details>` (one line per command)
- **Stage Status:** `[DEV Green | In Cold Freeze QA | Ready for Prod Release]`

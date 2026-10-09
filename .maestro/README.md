# Device tests (Maestro)

Flows that drive the installed app on an emulator or phone. Run them with
`npm run test:device` (all top-level flows) or name files or folders:
`npm run test:device -- .maestro/uat/SA-006-sign-in-and-wrong-password.yaml`.
`scripts/device-test.mjs` passes the test accounts from `../LINARA/.env.e2e`
as `MAESTRO_*` variables, so no login is written in a flow.

- Top level: checks for QA round LMM-A3, A4, A6 (`../LINARA/KNOWN_GAPS.md` C96).
- `uat/`: one flow per case in `Linara-UAT.xlsx`, named by its ID. `SA-*` are
  the Staff (app) tab; `MW-*` are Manager (web) cases run in the app's
  manager WebView (several cases to a flow where they chain); `E2E-*` switch
  between the helper and the manager. Each says at the top what it needs and
  what it leaves behind.
- `common/`: steps the others share (sign-in, picking a date or time, and for
  the WebView `settle`, `scroll-to-top` and `set-web-time`).

Tags: `changes-data` flows add records and remove or cancel them again;
`needs-setup` flows need the manager side first (a task for today, a quick
utos, recorded pay or leave, an invite code, a closed board). Run the rest
on their own with `npm run test:device -- --exclude-tags needs-setup .maestro/uat`.

Things that trip flows up:

- Type passwords and invite codes with `setClipboard` + `pasteText`: fast
  typing races fields that upper-case as you type.
- Submit sign-in with `pressKey: Enter`; the on-screen keyboard can cover the
  button.
- A double-quoted YAML string can't hold `\(`; put regexes with backslashes in
  single quotes.
- A flow's `name` becomes a folder name, so no `?` or `:` in it on Windows.
- If runs fail with "device offline" or "Device server died", cold-restart the
  emulator.
- Disk: every `maestro test` and `maestro hierarchy` leaves a ~137 MB driver
  APK in `%TEMP%` (`tmp*.apk`, `maestro-app*.apk`). Delete them after a run;
  dozens filled the drive on 2026-10-09.

In the manager WebView (`MW-*`):

- An element scrolled out of view stays in the tree with clipped bounds, so
  `scrollUntilVisible` can "find" it and the tap lands on nothing. Scroll with
  `common/scroll-to-top.yaml` and `centerElement: true`; for a button below
  the fold, submit its field with `pressKey: Enter` instead.
- `hideKeyboard` with no keyboard up sends Back, and Back closes the open
  sheet (LMM-A3), dropping what was typed. Use `common/settle.yaml` only right
  after typing; not after an Enter that already closed the keyboard.
- The keyboard moves sheets and the tree lags behind: settle between fields.
- Labels repeat across the page and its open sheet ("Add", "Unit", "Add item",
  each day's "Add task"); pick by position (`below`, `rightOf`, `above`), not
  `index`, which counts top to bottom on screen.
- A tap lands where it hits: mid-number in a centred field. `longPressOn`
  selects a number to type over in most fields; in a left-aligned one, tap
  and `eraseText`.
- The WebView's date and time dialogs confirm with SET (the app's own say OK).
- Text inside one element can be split into several nodes ("1" + " running
  low", "/ " + "₱100"); assert one part, or a row's whole text with `.*`.
- The shopper and assignee pickers are search boxes: type a name, Enter.

# Device tests (Maestro)

Flows that drive the installed app on an emulator or phone. Run them with
`npm run test:device` (all top-level flows) or name files or folders:
`npm run test:device -- .maestro/uat/SA-006-sign-in-and-wrong-password.yaml`.
`scripts/device-test.mjs` passes the test accounts from `../LINARA/.env.e2e`
as `MAESTRO_*` variables, so no login is written in a flow.

- Top level: checks for QA round LMM-A3, A4, A6 (`../LINARA/KNOWN_GAPS.md` C96).
- `uat/`: one flow per case in `Linara-UAT.xlsx` (Staff (app) tab), named by
  its ID. Each says at the top what it needs and what it leaves behind.
- `common/`: steps the others share (sign-in, picking a date or time).

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

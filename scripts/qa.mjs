/**
 * Local QA pass: what the client's QA bot checks, run on this machine.
 *
 *   npm run qa         typecheck, lint, unit tests, Android bundle
 *   npm run qa:fast    typecheck, lint, unit tests (also the pre-push hook)
 *
 * The bundle is `expo export --platform android` (what the APK runs); there
 * is no web target. On-device checks are still by hand. Issues, IDs and the
 * report: scripts/qa-runner.mjs (shared with ../LINARA, which also runs
 * browser tests).
 */
import { join } from "node:path";

import { run, runQa } from "./qa-runner.mjs";

const mode = process.argv.includes("--fast") ? "fast" : "full";

const steps = [
  { name: "Typecheck", slug: "typecheck", cmd: "npm run typecheck", parse: "typecheck" },
  { name: "Lint", slug: "lint", cmd: "npm run lint", parse: "eslint" },
  { name: "Unit tests", slug: "unit", cmd: "npm test", parse: "vitest" },
  ...(mode === "fast"
    ? []
    : [
        {
          name: "Android bundle",
          slug: "build",
          exec: (ctx) =>
            run(
              `npx expo export --platform android --output-dir ${join(ctx.outDir, "android")}`,
              ctx,
            ),
        },
      ]),
];

process.exit(await runQa({ app: "LINARA Mobile", prefix: "M", mode, steps }));

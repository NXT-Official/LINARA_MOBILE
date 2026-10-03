/**
 * Local QA pass: what the client's QA bot checks, run on this machine.
 *
 *   npm run qa         typecheck, lint, unit tests, Android bundle
 *   npm run qa:fast    typecheck, lint, unit tests
 *
 * Every step runs even if an earlier one fails, so one run shows everything.
 * The build is `expo export --platform android` (what the APK runs); there is
 * no web target. On-device checks are still by hand. Output goes to
 * qa-reports/<time>/: one log per step and report.md. Exits 1 if anything
 * failed. ../LINARA has the same script, plus browser tests.
 */
import { execSync, spawn } from "node:child_process";
import { createWriteStream, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FAST = process.argv.includes("--fast");

const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
const outDir = join("qa-reports", stamp);
mkdirSync(outDir, { recursive: true });

const env = { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1", CI: "1" };
// Colour codes some tools print anyway.
const ANSI = /\x1b\[[0-9;]*m/g;

/** Runs a shell command, logging to qa-reports/<time>/<slug>.log. */
function run(cmd, slug) {
  return new Promise((resolve) => {
    const log = createWriteStream(join(outDir, `${slug}.log`));
    let output = "";
    const child = spawn(cmd, { shell: true, env });
    const take = (chunk) => {
      const text = chunk.toString().replace(ANSI, "");
      output += text;
      log.write(text);
    };
    child.stdout.on("data", take);
    child.stderr.on("data", take);
    child.on("close", (code) => {
      log.end();
      resolve({ ok: code === 0, output });
    });
  });
}

/** A one-line result for the summary, read from the tool's own output. */
const summaries = {
  typecheck: (out) => {
    const n = (out.match(/error TS\d+/g) ?? []).length;
    return n ? `${n} error${n > 1 ? "s" : ""}` : "";
  },
  lint: (out) => {
    const m = /(\d+) problems? \((\d+) errors?, (\d+) warnings?\)/.exec(out);
    const counts = m ? `${m[2]} errors, ${m[3]} warnings` : "0 errors, 0 warnings";
    // Windows line endings in the working tree; see .gitattributes.
    const cr = (out.match(/Delete `␍`/g) ?? []).length;
    return cr ? `${counts} (${cr} are line endings: see .gitattributes)` : counts;
  },
  unit: (out) => /Tests\s+(.+?)\s*\(\d+\)/.exec(out)?.[1] ?? "",
};

const steps = [
  { name: "Typecheck", slug: "typecheck", cmd: "npm run typecheck" },
  { name: "Lint", slug: "lint", cmd: "npm run lint" },
  { name: "Unit tests", slug: "unit", cmd: "npm test" },
  ...(FAST
    ? []
    : [
        {
          name: "Android bundle",
          slug: "build",
          cmd: `npx expo export --platform android --output-dir ${join(outDir, "android")}`,
        },
      ]),
];

const git = (args) => execSync(`git ${args}`, { encoding: "utf8" }).trim();
const branch = git("rev-parse --abbrev-ref HEAD");
const commit = git("rev-parse --short HEAD");
const dirty = git("status --porcelain") !== "";

console.log(
  `QA ${FAST ? "(fast) " : ""}on ${branch} @ ${commit}${dirty ? " + uncommitted changes" : ""}`,
);

const results = [];
for (const step of steps) {
  process.stdout.write(`  ${step.name.padEnd(16)}`);
  const started = Date.now();
  const result = await run(step.cmd, step.slug);
  const seconds = Math.round((Date.now() - started) / 1000);
  const detail = summaries[step.slug]?.(result.output) ?? "";
  results.push({ ...step, ...result, seconds, detail });
  console.log(`${result.ok ? "✓ pass" : "✗ FAIL"}  ${seconds}s  ${detail}`);
}

const failed = results.filter((r) => !r.ok);
const tail = (text, n = 40) => text.trim().split("\n").slice(-n).join("\n");

const report = [
  `# LINARA Mobile — local QA`,
  "",
  `${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })} PHT · \`${branch}\` @ \`${commit}\`${dirty ? " (with uncommitted changes)" : ""}${FAST ? " · fast pass" : ""}`,
  "",
  `**${failed.length ? `${failed.length} step${failed.length > 1 ? "s" : ""} failed` : "All clear"}**`,
  "",
  "| Check | Result | Time | Detail |",
  "|---|---|---|---|",
  ...results.map(
    (r) => `| ${r.name} | ${r.ok ? "pass" : "**FAIL**"} | ${r.seconds}s | ${r.detail} |`,
  ),
  "",
  ...failed.flatMap((r) => [
    `## ${r.name}`,
    "",
    `Full log: \`${r.slug}.log\`. Last lines:`,
    "",
    "```",
    tail(r.output),
    "```",
    "",
  ]),
  "Not covered: anything on a real device (camera, push, the manager WebView).",
  "",
].join("\n");

writeFileSync(join(outDir, "report.md"), report);
writeFileSync(join("qa-reports", "latest.md"), report);
console.log(`\nReport: ${join(outDir, "report.md")} (also qa-reports/latest.md)`);
process.exit(failed.length ? 1 : 0);

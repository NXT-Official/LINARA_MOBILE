#!/usr/bin/env node
/**
 * Runs the Maestro flows in .maestro/ on a connected emulator or phone with
 * the app installed: `npm run test:device`, or one flow:
 * `npm run test:device -- .maestro/manager-back-closes-modal.yaml`.
 *
 * The test accounts come from ../LINARA/.env.e2e (gitignored), loaded the way
 * the web's Playwright config loads them, and reach the flows as MAESTRO_*
 * environment variables, which Maestro reads itself. Nothing secret goes on
 * a command line or into a flow file.
 */
import { spawn } from "node:child_process";
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Maestro copies its driver app (about 137 MB) into the temp folder as
 * tmp<digits>.apk on every run and never deletes it: 109 of them filled the
 * disk in one day (2026-10-09). Before and after each run, clear the ones
 * older than 15 minutes; a newer one may belong to a run going on elsewhere
 * (another terminal, the Maestro MCP server), and one still open is skipped.
 */
function clearOldDriverApks() {
  const dir = tmpdir();
  const before = Date.now() - 15 * 60 * 1000;
  let freed = 0;
  for (const name of readdirSync(dir)) {
    // tmp<digits>.apk per run; maestro-app<digits>.apk from `maestro hierarchy`.
    if (!/^(tmp|maestro-app)\d+\.apk$/.test(name)) continue;
    const file = join(dir, name);
    try {
      const { mtimeMs, size } = statSync(file);
      if (mtimeMs > before) continue;
      rmSync(file);
      freed += size;
    } catch {
      // In use or already gone.
    }
  }
  if (freed > 0) console.log(`Cleared ${Math.round(freed / 1024 / 1024)} MB of old Maestro APKs`);
}

const accounts = join("..", "LINARA", ".env.e2e");
if (existsSync(accounts)) process.loadEnvFile(accounts);

const env = {
  ...process.env,
  MAESTRO_MANAGER_EMAIL: process.env.E2E_MANAGER_EMAIL ?? "",
  MAESTRO_MANAGER_PASSWORD: process.env.E2E_MANAGER_PASSWORD ?? "",
  MAESTRO_STAFF_EMAIL: process.env.E2E_STAFF_EMAIL ?? "",
  MAESTRO_STAFF_PASSWORD: process.env.E2E_STAFF_PASSWORD ?? "",
};

// Where this machine's setup put them, unless the shell already says.
const localAppData = process.env.LOCALAPPDATA ?? "";
env.ANDROID_HOME ??= join(localAppData, "Android", "Sdk");
env.JAVA_HOME ??= "C:\\Program Files\\Java\\jdk-20";
const maestro =
  process.platform === "win32" ? join(localAppData, "maestro", "bin", "maestro.bat") : "maestro";

const flows = process.argv.slice(2);
const args = ["test", ...(flows.length ? flows : [".maestro"])];
clearOldDriverApks();
const child =
  process.platform === "win32"
    ? spawn("cmd.exe", ["/d", "/c", maestro, ...args], { env, stdio: "inherit" })
    : spawn(maestro, args, { env, stdio: "inherit" });
child.on("exit", (code) => {
  clearOldDriverApks();
  process.exit(code ?? 1);
});

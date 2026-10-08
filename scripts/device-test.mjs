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
import { existsSync } from "node:fs";
import { join } from "node:path";

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
const child =
  process.platform === "win32"
    ? spawn("cmd.exe", ["/d", "/c", maestro, ...args], { env, stdio: "inherit" })
    : spawn(maestro, args, { env, stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 1));

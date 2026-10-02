/**
 * Centralized, validated access to build-time environment variables.
 *
 * `EXPO_PUBLIC_*` values are inlined at bundle time by Expo/Metro, but a
 * missing `.env` entry otherwise only surfaces as a confusing downstream
 * failure (e.g. Supabase rejecting an `undefined` URL). Reading every
 * variable through this module means that failure happens immediately,
 * with the name of the missing variable, instead of later and unlabeled.
 *
 * This is the one file allowed to touch `process.env` directly — every
 * other module should import the exported constants below instead.
 */

function assertEnvVar(value: string | undefined, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(
      `Missing required environment variable "${name}". Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

// Access must stay static (dot-notation), never `process.env[name]` — Expo's
// build-time babel transform only inlines EXPO_PUBLIC_* values it can find
// by literal property name, so a dynamic lookup would silently stay undefined
// in a production bundle even though it works under the dev server.
// eslint-disable-next-line no-restricted-syntax -- sole, validated process.env access point
const rawSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
export const SUPABASE_URL = assertEnvVar(rawSupabaseUrl, "EXPO_PUBLIC_SUPABASE_URL");

// eslint-disable-next-line no-restricted-syntax -- sole, validated process.env access point
const rawSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const SUPABASE_ANON_KEY = assertEnvVar(rawSupabaseAnonKey, "EXPO_PUBLIC_SUPABASE_ANON_KEY");

// Optional: the LINARA web dashboard's origin. Password-reset emails link to
// its /reset-password page, which serves helpers and managers alike. When
// unset, Supabase falls back to the project's Site URL, and the web landing
// page forwards recovery links from there.
// eslint-disable-next-line no-restricted-syntax -- sole, validated process.env access point
const rawWebAppUrl = process.env.EXPO_PUBLIC_WEB_APP_URL;
export const WEB_APP_URL: string | null = rawWebAppUrl?.trim().replace(/\/+$/, "") || null;

// Where a manager's dashboard loads from. Managers use the same web dashboard
// inside the app (app/manager.tsx) until it is rebuilt natively. Falls back to
// the deployed dashboard so a build without EXPO_PUBLIC_WEB_APP_URL still
// opens it.
export const MANAGER_DASHBOARD_URL = WEB_APP_URL ?? "https://linara-delta.vercel.app";

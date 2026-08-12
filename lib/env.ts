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

/**
 * When the app reports to Sentry, and where. Pure, so the rules are tested
 * without loading the native SDK.
 */

/** The linara-mobile project's DSN. Public by design: it only lets a client send events. */
export const DEFAULT_SENTRY_DSN =
  "https://d9667edf247d9acf8598fa30547302f0@o4512240981311488.ingest.us.sentry.io/4512241040097280";

// Scheme, public key, host and a numeric project id. Mila reported through a
// DSN whose public key had been stripped: the SDK stayed on and every capture
// failed inside it. Only a DSN of this shape turns reporting on.
// src: https://docs.sentry.io/platforms/react-native/configuration/options/#dsn · 8.30.0 · 2026-10-12
const DSN_PATTERN = /^https?:\/\/[^@\s/]+@[^/\s?#]+\/\d+$/;

/** True only for a DSN the SDK can actually deliver to. */
export function isUsableDsn(value: string | null | undefined): value is string {
  return typeof value === "string" && DSN_PATTERN.test(value.trim());
}

export type SentrySettings =
  { enabled: false } | { enabled: true; dsn: string; environment: string };

/**
 * Reporting is on only when an EAS build has named the environment (eas.json
 * sets EXPO_PUBLIC_SENTRY_ENVIRONMENT for preview and production) and the DSN
 * is well formed, so a developer's phone, a dev client, Expo Go and the test run never send
 * anything. An override DSN replaces the committed one; a malformed override
 * turns reporting off rather than falling back.
 */
export function resolveSentrySettings(input: {
  dsn: string | null;
  environment: string | null;
}): SentrySettings {
  const dsn = input.dsn?.trim() || DEFAULT_SENTRY_DSN;
  const environment = input.environment?.trim();
  if (!environment || !isUsableDsn(dsn)) return { enabled: false };
  return { enabled: true, dsn, environment };
}

/**
 * The route a screen-opened log names: expo-router's file segments, which keep
 * `[id]` as written, never the concrete path or its params.
 */
export function routeTemplate(segments: readonly string[]): string {
  return segments.length > 0 ? segments.join("/") : "/";
}

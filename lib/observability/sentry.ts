import type { ComponentType } from "react";
import * as Sentry from "@sentry/react-native";
import { isRunningInExpoGo } from "expo";

import { SENTRY_DSN, SENTRY_ENVIRONMENT } from "../env";
import { resolveSentrySettings } from "./config";
import { sentryUserFor, type SessionLike } from "./identity";
import { scrubSentryEvent, scrubSentryLog } from "./scrub";

/**
 * The one module that talks to the Sentry SDK. Importing it initialises
 * Sentry, so app/_layout.tsx imports it before anything else.
 *
 * What reaches Sentry: errors, warn/error console lines, one "Screen opened"
 * log per route, and navigation traces, each tagged with the signed-in
 * account's opaque id and nothing else about her. Every event, transaction,
 * breadcrumb and log goes through scrub.ts first.
 */

const settings = resolveSentrySettings({ dsn: SENTRY_DSN, environment: SENTRY_ENVIRONMENT });
// Expo Go has no native Sentry module, so frame and display timing can't be measured there.
// src: https://docs.sentry.io/platforms/react-native/tracing/instrumentation/expo-router/ · 8.30.0 · 2026-10-12
const inExpoGo = isRunningInExpoGo();

// A hook that throws makes the SDK report the failure as a new internal event
// that skips beforeSend and carries whatever the error says. A scrubber that
// fails drops the item instead.
// src: @sentry/core build/esm/client.js (_processEvent, __sentry__) · 10.76.0 · 2026-10-12
function failClosed<A extends unknown[], R>(
  hook: (...args: A) => R | null,
): (...args: A) => R | null {
  return (...args) => {
    try {
      return hook(...args);
    } catch {
      return null;
    }
  };
}

Sentry.init({
  // Off means no DSN at all, so the native SDK is not started either.
  dsn: settings.enabled ? settings.dsn : undefined,
  enabled: settings.enabled,
  ...(settings.enabled ? { environment: settings.environment } : {}),
  // No IP, cookies, headers or route params; the user is set to { id } only.
  sendDefaultPii: false,
  // Every navigation is traced while there are few users. Lower this when the
  // Sentry usage page shows spans nearing the plan's monthly quota.
  tracesSampleRate: 1.0,
  enableNativeFramesTracking: !inExpoGo,
  enableLogs: true,
  // The automatic console capture takes every level; only warn and error are
  // worth sending, so the integration is added below with those two.
  // src: https://docs.sentry.io/platforms/react-native/logs/ · 8.30.0 · 2026-10-12
  enableAutoConsoleLogs: false,
  // Native SDK logs would skip beforeSendLog; only JS logs, which are scrubbed, are sent.
  logsOrigin: "js",
  // iOS records its own HTTP breadcrumbs with the raw query (a signed payout-QR
  // URL's ?token=), and native crash, hang and watchdog reports never pass the
  // JS hooks. The JS layer already records every request, through the scrubber.
  // src: @sentry/react-native dist/js/options.d.ts (enableNetworkBreadcrumbs) · 8.30.0 · 2026-10-12
  enableNetworkBreadcrumbs: false,
  integrations: [
    Sentry.expoRouterIntegration({ enableTimeToInitialDisplay: !inExpoGo }),
    Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
  ],
  beforeSend: failClosed((event) => scrubSentryEvent(event)),
  beforeSendTransaction: failClosed((event) => scrubSentryEvent(event)),
  beforeBreadcrumb: failClosed((breadcrumb) => scrubSentryEvent(breadcrumb)),
  beforeSendLog: failClosed((log) => scrubSentryLog(log)),
});

/**
 * Wraps the root layout so Sentry sees touches, the app start and render
 * errors. Tap breadcrumbs would otherwise carry the text under the finger;
 * scrub.ts also strips the labels the SDK still reads from accessibilityLabel
 * and testID.
 * src: @sentry/react-native dist/js/touchevents.js (extractTextFromChildren) · 8.30.0 · 2026-10-12
 */
export function wrapRootLayout<P extends Record<string, unknown>>(
  component: ComponentType<P>,
): ComponentType<P> {
  return Sentry.wrap(component, { touchEventBoundaryProps: { extractTextFromChildren: false } });
}

/** Tags everything that follows with the account's opaque id; null on sign-out. */
export function setSentryUser(session: SessionLike | null): void {
  Sentry.setUser(sentryUserFor(session));
}

/** One info log per route change, naming the route template (never the concrete path). */
export function logScreenOpened(route: string): void {
  Sentry.logger.info("Screen opened", { "linara.route": route });
}

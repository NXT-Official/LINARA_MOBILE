import type { ReactNativeOptions } from "@sentry/react-native";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_SENTRY_DSN } from "./config";

// One instance across module reloads, so each test reads the calls made by the
// copy of ./sentry it just imported. The real SDK (and its native module) never loads.
const sdk = vi.hoisted(() => ({
  init: vi.fn<(options: ReactNativeOptions) => void>(),
  wrap: vi.fn((component: unknown) => component),
  setUser: vi.fn(),
  logger: { info: vi.fn() },
  expoRouterIntegration: vi.fn((options: unknown) => ({ name: "ExpoRouter", options })),
  consoleLoggingIntegration: vi.fn((options: unknown) => ({ name: "ConsoleLogs", options })),
}));
const expo = vi.hoisted(() => ({ inExpoGo: false }));

vi.mock("@sentry/react-native", () => sdk);
vi.mock("expo", () => ({ isRunningInExpoGo: () => expo.inExpoGo }));

interface Env {
  SENTRY_DSN: string | null;
  SENTRY_ENVIRONMENT: string | null;
}

async function load(env: Env) {
  vi.resetModules();
  vi.doMock("../env", () => env);
  sdk.init.mockClear();
  const adapter = await import("./sentry");
  const options = sdk.init.mock.calls[0]?.[0];
  if (!options) throw new Error("Sentry.init was not called on import");
  return { adapter, options };
}

beforeEach(() => {
  expo.inExpoGo = false;
  vi.clearAllMocks();
});

describe("Sentry init", () => {
  it("stays off with no DSN when no EAS profile named the environment", async () => {
    const { options } = await load({ SENTRY_DSN: null, SENTRY_ENVIRONMENT: null });
    expect(sdk.init).toHaveBeenCalledTimes(1);
    expect(options.enabled).toBe(false);
    // No DSN at all, so the native SDK is not started either.
    expect(options.dsn).toBeUndefined();
  });

  it("reports to the committed DSN under the profile's environment", async () => {
    const { options } = await load({ SENTRY_DSN: null, SENTRY_ENVIRONMENT: "preview" });
    expect(options).toMatchObject({
      enabled: true,
      dsn: DEFAULT_SENTRY_DSN,
      environment: "preview",
      sendDefaultPii: false,
      enableLogs: true,
      enableAutoConsoleLogs: false,
      logsOrigin: "js",
      tracesSampleRate: 1.0,
      enableNativeFramesTracking: true,
    });
  });

  it("leaves HTTP breadcrumbs to the scrubbed JS layer, not iOS's raw native ones", async () => {
    const { options } = await load({ SENTRY_DSN: null, SENTRY_ENVIRONMENT: "production" });
    expect(options.enableNetworkBreadcrumbs).toBe(false);
  });

  it("captures warn and error console lines, and traces expo-router navigation", async () => {
    const { options } = await load({ SENTRY_DSN: null, SENTRY_ENVIRONMENT: "production" });
    expect(sdk.consoleLoggingIntegration).toHaveBeenCalledWith({ levels: ["warn", "error"] });
    expect(sdk.expoRouterIntegration).toHaveBeenCalledWith({ enableTimeToInitialDisplay: true });
    expect(options.integrations).toEqual([
      { name: "ExpoRouter", options: { enableTimeToInitialDisplay: true } },
      { name: "ConsoleLogs", options: { levels: ["warn", "error"] } },
    ]);
  });

  it("skips native frame and display timing in Expo Go, which cannot measure them", async () => {
    expo.inExpoGo = true;
    const { options } = await load({ SENTRY_DSN: null, SENTRY_ENVIRONMENT: "development" });
    expect(options.enableNativeFramesTracking).toBe(false);
    expect(sdk.expoRouterIntegration).toHaveBeenCalledWith({ enableTimeToInitialDisplay: false });
  });

  it("scrubs errors, transactions, breadcrumbs and logs before they leave", async () => {
    const { options } = await load({ SENTRY_DSN: null, SENTRY_ENVIRONMENT: "preview" });

    expect(
      options.beforeSend?.(
        { type: undefined, message: "a@b.co", user: { id: "u1", email: "a@b.co" } },
        {},
      ),
    ).toEqual({ type: undefined, message: "[email]", user: { id: "u1" } });

    expect(
      options.beforeSendTransaction?.(
        { type: "transaction", transaction: "GET https://x.test/p?code=abc" },
        {},
      ),
    ).toEqual({ type: "transaction", transaction: "GET https://x.test/p?code=[redacted]" });

    expect(options.beforeBreadcrumb?.({ message: "opened /record?q=ana" })).toEqual({
      message: "opened /record?q=[redacted]",
    });

    expect(
      options.beforeSendLog?.({
        level: "warn",
        message: "for a@b.co",
        attributes: { "user.id": "u1", "user.email": "a@b.co" },
      }),
    ).toEqual({ level: "warn", message: "for [email]", attributes: { "user.id": "u1" } });
  });
});

describe("Sentry adapter", () => {
  it("tags the signed-in account by opaque id only, and clears it on sign-out", async () => {
    const { adapter } = await load({ SENTRY_DSN: null, SENTRY_ENVIRONMENT: null });
    const session = { user: { id: "u9", email: "ana@example.com", phone: "09171234567" } };
    adapter.setSentryUser(session);
    expect(sdk.setUser).toHaveBeenLastCalledWith({ id: "u9" });
    adapter.setSentryUser(null);
    expect(sdk.setUser).toHaveBeenLastCalledWith(null);
  });

  it("logs one screen-opened line naming the route template", async () => {
    const { adapter } = await load({ SENTRY_DSN: null, SENTRY_ENVIRONMENT: null });
    adapter.logScreenOpened("(app)/today");
    expect(sdk.logger.info).toHaveBeenCalledWith("Screen opened", {
      "linara.route": "(app)/today",
    });
  });

  it("wraps the root layout without reading on-screen text into tap breadcrumbs", async () => {
    const { adapter } = await load({ SENTRY_DSN: null, SENTRY_ENVIRONMENT: null });
    function Root() {
      return null;
    }
    expect(adapter.wrapRootLayout(Root)).toBe(Root);
    expect(sdk.wrap).toHaveBeenCalledWith(Root, {
      touchEventBoundaryProps: { extractTextFromChildren: false },
    });
  });
});

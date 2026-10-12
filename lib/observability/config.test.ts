import { describe, expect, it } from "vitest";

import { DEFAULT_SENTRY_DSN, isUsableDsn, resolveSentrySettings, routeTemplate } from "./config";

describe("isUsableDsn", () => {
  it("accepts a DSN with scheme, public key, host and numeric project id", () => {
    for (const wellFormed of [
      DEFAULT_SENTRY_DSN,
      "https://abc123@o4505.ingest.sentry.io/4505",
      "http://abc123@127.0.0.1:9000/7",
      "  https://abc123@o4505.ingest.sentry.io/4505  ",
    ]) {
      expect(isUsableDsn(wellFormed)).toBe(true);
    }
  });

  it("rejects anything the SDK could not deliver to", () => {
    for (const malformed of [
      null,
      undefined,
      "",
      "   ",
      "https://o4505.ingest.sentry.io/4505",
      "https://abc123@o4505.ingest.sentry.io",
      "https://abc123@o4505.ingest.sentry.io/not-a-number",
      "https://abc123@",
      "o4505.ingest.sentry.io/4505",
      "not-a-url",
    ]) {
      expect(isUsableDsn(malformed)).toBe(false);
    }
  });
});

describe("resolveSentrySettings", () => {
  it("stays off without an environment, so dev, Expo Go and tests never report", () => {
    expect(resolveSentrySettings({ dsn: null, environment: null })).toEqual({ enabled: false });
    expect(resolveSentrySettings({ dsn: null, environment: "  " })).toEqual({ enabled: false });
  });

  it("uses the committed DSN once an EAS profile names the environment", () => {
    expect(resolveSentrySettings({ dsn: null, environment: "preview" })).toEqual({
      enabled: true,
      dsn: DEFAULT_SENTRY_DSN,
      environment: "preview",
    });
  });

  it("lets EXPO_PUBLIC_SENTRY_DSN override the committed DSN", () => {
    expect(
      resolveSentrySettings({
        dsn: " https://abc123@o1.ingest.sentry.io/2 ",
        environment: "production",
      }),
    ).toEqual({
      enabled: true,
      dsn: "https://abc123@o1.ingest.sentry.io/2",
      environment: "production",
    });
  });

  it("stays off for a malformed override instead of reporting through a broken DSN", () => {
    expect(
      resolveSentrySettings({ dsn: "https://o1.ingest.sentry.io/2", environment: "production" }),
    ).toEqual({ enabled: false });
  });
});

describe("routeTemplate", () => {
  it("joins file segments, so dynamic routes stay templates", () => {
    expect(routeTemplate(["(app)", "today"])).toBe("(app)/today");
    expect(routeTemplate(["(app)", "task", "[id]"])).toBe("(app)/task/[id]");
  });

  it("names the root route", () => {
    expect(routeTemplate([])).toBe("/");
  });
});

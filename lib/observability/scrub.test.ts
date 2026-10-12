import { describe, expect, it } from "vitest";

import { scrubSentryEvent, scrubSentryLog, scrubText } from "./scrub";

describe("scrubText", () => {
  it("masks email addresses", () => {
    expect(scrubText("failed for ana.cruz+x@example.com today")).toBe("failed for [email] today");
  });

  it("masks Philippine mobile numbers however they are typed", () => {
    expect(scrubText("Key (gcash)=(09171234567) exists")).toBe("Key (gcash)=([phone]) exists");
    expect(scrubText("call +63 917 123 4567 now")).toBe("call [phone] now");
    expect(scrubText("or 0917-123-4567.")).toBe("or [phone].");
  });

  it("leaves dates, amounts and counts alone", () => {
    expect(scrubText("cutoff 2026-10-12, paid 12500.00 for 31 days")).toBe(
      "cutoff 2026-10-12, paid 12500.00 for 31 days",
    );
  });

  it("masks JWTs and bearer tokens", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.c2lnbmF0dXJl";
    expect(scrubText(`token ${jwt} end`)).toBe("token [jwt] end");
    expect(scrubText("Authorization: Bearer abc.def-123")).toBe("Authorization: Bearer [token]");
  });

  it("masks data URIs and long base64 runs", () => {
    expect(scrubText("img data:image/png;base64,AAAA/BBBB== done")).toBe("img [data-uri] done");
    expect(scrubText(`blob ${"A".repeat(200)}`)).toBe("blob [base64]");
  });

  it("redacts query values and drops fragments in URLs inside text", () => {
    expect(
      scrubText("GET https://x.test/cb?code=abc&page=2&access_token=zzz#refresh_token=q failed"),
    ).toBe("GET https://x.test/cb?code=[redacted]&page=[redacted]&access_token=[redacted] failed");
  });

  it("drops the session from a recovery deep link", () => {
    expect(scrubText("opened linaramobile://reset-password#access_token=abc&type=recovery")).toBe(
      "opened linaramobile://reset-password",
    );
  });

  it("sanitizes bare paths with no scheme", () => {
    expect(scrubText("failed at /record?month=2026-10&q=ana")).toBe(
      "failed at /record?month=[redacted]&q=[redacted]",
    );
    expect(scrubText("url=/auth/callback?code=abc#access_token=z")).toBe("url=/auth/callback");
  });

  it.each([
    ["double-encoded name", "https://x.test/p?%2563ode=SECRET"],
    ["semicolon separator", "https://x.test/p?a=1;code=SECRET"],
    ["bare key without =", "https://x.test/p?SECRET"],
    ["token nested in a value", "https://x.test/p?page=%2Fauth%3Fcode%3DSECRET"],
    ["encoded # inside the path", "https://x.test/callback%23access_token=SECRET"],
    ["token in a path segment", "https://x.test/auth/confirm/SECRETSECRETSECRETSECRET1234"],
    ["token in a custom-scheme host", "linaramobile://SECRETSECRETSECRETSECRET1234"],
    ["bare path, token segment", "/auth/confirm/SECRETSECRETSECRETSECRET1234"],
  ])("does not leak a token: %s", (_name, url) => {
    expect(scrubText(`GET ${url} failed`)).not.toContain("SECRET");
  });

  it("leaves ordinary text alone", () => {
    expect(scrubText("Couldn't save the task (500)")).toBe("Couldn't save the task (500)");
  });
});

describe("scrubSentryEvent", () => {
  it("keeps only the user id and scrubs nested strings", () => {
    const event = scrubSentryEvent({
      user: { id: "u1", email: "a@b.co", ip_address: "1.2.3.4", username: "ana" },
      message: "hi a@b.co",
      exception: { values: [{ value: "bad token a@b.co" }] },
      breadcrumbs: [{ message: "nav", data: { url: "linaramobile://today?code=1" } }],
      request: { url: "https://x.test/?token=abc", cookies: { s: "1" }, headers: { a: "b" } },
    });
    expect(event?.user).toEqual({ id: "u1" });
    expect(event?.message).toBe("hi [email]");
    expect(event?.exception?.values?.[0]?.value).toBe("bad token [email]");
    expect(event?.breadcrumbs?.[0]?.data?.url).toBe("linaramobile://today?code=[redacted]");
    expect(event?.request?.url).toBe("https://x.test/?token=[redacted]");
    expect(event?.request?.cookies).toBeUndefined();
    expect(event?.request?.headers).toBeUndefined();
  });

  it("drops a user that has no string id", () => {
    expect(scrubSentryEvent({ user: { email: "a@b.co" } })?.user).toBeUndefined();
  });

  it("redacts split-out query strings and fragments on spans and breadcrumbs", () => {
    const event = scrubSentryEvent({
      spans: [
        {
          description: "GET https://abc.supabase.co/rest/v1/pay?select=*&helper_id=eq.42",
          data: { "http.query": "?select=*&helper_id=eq.42", "http.fragment": "#x" },
        },
      ],
    });
    expect(event?.spans?.[0]?.description).toBe(
      "GET https://abc.supabase.co/rest/v1/pay?select=[redacted]&helper_id=[redacted]",
    );
    expect(event?.spans?.[0]?.data).toEqual({
      "http.query": "[redacted]",
      "http.fragment": "[redacted]",
    });
  });

  it("drops the event rather than sending it unscrubbed when scrubbing throws", () => {
    const hostile = {} as Record<string, unknown>;
    Object.defineProperty(hostile, "message", {
      enumerable: true,
      get() {
        throw new Error("boom");
      },
    });
    expect(scrubSentryEvent(hostile)).toBeNull();
  });

  it("fails closed past the depth limit: never passes the raw object through", () => {
    let deep: Record<string, unknown> = { secret: "a@b.co" };
    for (let i = 0; i < 12; i += 1) deep = { n: deep };
    const out = JSON.stringify(scrubSentryEvent(deep));
    expect(out).toContain("[truncated]");
    expect(out).not.toContain("a@b.co");
  });

  it("passes the SDK's processing metadata through untouched instead of walking live scopes", () => {
    class Scope {
      get client(): never {
        throw new Error("walked into a live scope");
      }
    }
    const metadata = { capturedSpanScope: new Scope(), dynamicSamplingContext: { trace_id: "t" } };
    const event = scrubSentryEvent({ type: "transaction", sdkProcessingMetadata: metadata });
    expect(event).not.toBeNull();
    expect(event?.sdkProcessingMetadata).toBe(metadata);
  });

  it("does not walk class instances, and reduces an Error to its scrubbed text", () => {
    class Session {
      email = "a@b.co";
    }
    const event = scrubSentryEvent({
      data: { arguments: [new Session(), new Error("failed for a@b.co")] },
    });
    expect(event?.data.arguments).toEqual(["[Session]", "Error: failed for [email]"]);
  });
});

describe("touch breadcrumbs", () => {
  const touch = {
    category: "touch",
    type: "user",
    level: "info",
    message: "Touch event within element: Pangalan: Ana Cruz",
    data: {
      path: [
        { name: "Text", label: "Pangalan: Ana Cruz" },
        { name: "PayoutAccountCard", element: "RCTView", label: "my private note" },
      ],
    },
  };

  it("keeps only component names: no on-screen text, labels or test ids", () => {
    expect(scrubSentryEvent(touch)).toEqual({
      category: "touch",
      type: "user",
      level: "info",
      message: "Touch event within element: Text",
      data: { path: [{ name: "Text" }, { name: "PayoutAccountCard", element: "RCTView" }] },
    });
  });

  it("strips rage-tap text from the message, path and node", () => {
    const rage = scrubSentryEvent({
      category: "ui.multiClick",
      type: "default",
      message: "my private note",
      data: {
        clickCount: 3,
        route: "(app)/today",
        node: {
          id: 0,
          tagName: "RCTView",
          textContent: "",
          attributes: { "data-sentry-component": "Scratchpad", "sentry-label": "my private note" },
        },
        path: [{ name: "Scratchpad", label: "my private note" }],
      },
    });
    expect(rage).toEqual({
      category: "ui.multiClick",
      type: "default",
      message: "Scratchpad",
      data: {
        clickCount: 3,
        route: "(app)/today",
        node: {
          id: 0,
          tagName: "RCTView",
          textContent: "",
          attributes: { "data-sentry-component": "Scratchpad" },
        },
        path: [{ name: "Scratchpad" }],
      },
    });
  });

  it("strips them from the breadcrumbs an error event carries too", () => {
    const event = scrubSentryEvent({
      breadcrumbs: [touch, { category: "console", message: "hi" }],
    });
    expect(JSON.stringify(event)).not.toContain("Ana Cruz");
    expect(JSON.stringify(event)).not.toContain("private note");
    expect(event?.breadcrumbs[1]).toEqual({ category: "console", message: "hi" });
  });
});

describe("scrubSentryLog", () => {
  it("scrubs the message and every attribute", () => {
    const log = scrubSentryLog({
      level: "warn",
      message: "[session] Couldn't read the saved session: a@b.co",
      attributes: {
        "sentry.message.parameter.0": "https://x.test/p?code=abc",
        "linara.route": "(app)/today",
      },
    });
    expect(log?.message).toBe("[session] Couldn't read the saved session: [email]");
    expect(log?.attributes).toEqual({
      "sentry.message.parameter.0": "https://x.test/p?code=[redacted]",
      "linara.route": "(app)/today",
    });
  });

  it("keeps user.id but drops every other user attribute", () => {
    const log = scrubSentryLog({
      level: "info",
      message: "Screen opened",
      attributes: { "user.id": "u1", "user.email": "a@b.co", "user.name": "Ana" },
    });
    expect(log?.attributes).toEqual({ "user.id": "u1" });
  });

  it("scrubs a parameterized (String object) message as text", () => {
    const message = Object.assign(new String("for a@b.co"), {
      __sentry_template_string__: "for %s",
    });
    const log = scrubSentryLog({ level: "info", message });
    expect(String(log?.message)).toBe("for [email]");
  });
});

/**
 * No pattern recognises a name, a government ID or a wage, so the places the
 * SDK copies app objects into are removed by structure. Payload shapes follow
 * @sentry/browser 10.76 eventbuilder.js (eventFromPlainObject), breadcrumbs.js
 * (console handler) and @sentry/core 10.76 logs/console-integration.js.
 */
describe("structural privacy: what patterns cannot recognise", () => {
  const SECRETS = ["Rosa Reyes", "34-7654321-0", "Maria Santos", "34-1234567-8", "12500"];

  function expectNoSecrets(value: unknown) {
    const text = JSON.stringify(value);
    for (const secret of SECRETS) expect(text).not.toContain(secret);
  }

  it("drops the serialized copy of a thrown plain object (a Supabase error)", () => {
    const event = scrubSentryEvent({
      exception: {
        values: [
          {
            type: "Error",
            value: "Object captured as exception with keys: code, details, hint, message",
            mechanism: { type: "generic", handled: true, synthetic: true },
          },
        ],
      },
      extra: {
        __serialized__: {
          code: "23514",
          details: "Failing row contains (Rosa Reyes, 34-7654321-0).",
          hint: null,
          message: 'new row for relation "helpers" violates check constraint',
        },
      },
    });
    expect(event?.extra).toBeUndefined();
    expect(event?.exception.values[0]?.value).toBe(
      "Object captured as exception with keys: code, details, hint, message",
    );
    expectNoSecrets(event);
  });

  it('keeps only the app\'s own first string from console.error("[x]:", { details })', () => {
    const crumb = scrubSentryEvent({
      category: "console",
      level: "error",
      message: "[x]: [object Object]",
      data: {
        arguments: ["[x]:", { details: "Failing row contains (Maria Santos, 34-1234567-8)." }],
        logger: "console",
      },
    });
    expect(crumb).toEqual({
      category: "console",
      level: "error",
      message: "[x]:",
      data: { logger: "console" },
    });
  });

  it("keeps no message at all from console.warn({ helperName, wage })", () => {
    const crumb = scrubSentryEvent({
      category: "console",
      level: "warning",
      message: "[object Object]",
      data: { arguments: [{ helperName: "Rosa Reyes", wage: 12500 }], logger: "console" },
    });
    expect(crumb).toEqual({ category: "console", level: "warning", data: { logger: "console" } });
  });

  it("rebuilds a console log's message from its template and drops the parameters", () => {
    const log = scrubSentryLog({
      level: "error",
      message: '[x]: {"details":"Failing row contains (Maria Santos, 34-1234567-8)."}',
      attributes: {
        "sentry.origin": "auto.log.console",
        "sentry.message.template": "[x]: {}",
        "sentry.message.parameter.0": {
          details: "Failing row contains (Maria Santos, 34-1234567-8).",
        },
        "sentry.environment": "preview",
        "user.id": "u1",
        "device.model": "SM-A125F",
        "os.name": "Android",
      },
    });
    expect(log).toEqual({
      level: "error",
      message: "[x]: {}",
      attributes: {
        "sentry.origin": "auto.log.console",
        "sentry.message.template": "[x]: {}",
        "sentry.environment": "preview",
        "user.id": "u1",
        "device.model": "SM-A125F",
        "os.name": "Android",
      },
    });
  });

  it("withholds a console log whose first argument was an object, and its copied keys", () => {
    const log = scrubSentryLog({
      level: "warn",
      message: '{"helperName":"Rosa Reyes","wage":12500}',
      attributes: { "sentry.origin": "auto.log.console", helperName: "Rosa Reyes", wage: 12500 },
    });
    expect(log).toEqual({
      level: "warn",
      message: "[console payload removed]",
      attributes: { "sentry.origin": "auto.log.console" },
    });
  });

  it.each([
    ["a substitution", "%s failed Rosa Reyes"],
    [
      "a lone Error",
      '{"message":"Failing row contains (Rosa Reyes, 34-7654321-0).","name":"Error"}',
    ],
    ["an array", '["Rosa Reyes",12500]'],
    ["a number first", "12500 Rosa Reyes"],
  ])("withholds a console log built from %s", (_name, message) => {
    const log = scrubSentryLog({
      level: "warn",
      message,
      attributes: { "sentry.origin": "auto.log.console" },
    });
    expect(log?.message).toBe("[console payload removed]");
    expectNoSecrets(log);
  });

  it("keeps a console log that was one plain string, scrubbed", () => {
    const log = scrubSentryLog({
      level: "warn",
      message: "[push] Not registered for a@b.co",
      attributes: { "sentry.origin": "auto.log.console" },
    });
    expect(log?.message).toBe("[push] Not registered for [email]");
  });

  it("leaves the app's own logs and their attributes alone", () => {
    const log = scrubSentryLog({
      level: "info",
      message: "Screen opened",
      attributes: { "linara.route": "(app)/today", "user.id": "u1", "sentry.release": "1.0.0" },
    });
    expect(log).toEqual({
      level: "info",
      message: "Screen opened",
      attributes: { "linara.route": "(app)/today", "user.id": "u1", "sentry.release": "1.0.0" },
    });
  });
});

import { describe, expect, it } from "vitest";

import { maskEmails, sanitizeUrl } from "./url-sanitize";

describe("sanitizeUrl", () => {
  it("always drops the fragment, where recovery links carry the session", () => {
    expect(
      sanitizeUrl("https://linara.test/reset-password#access_token=abc&refresh_token=def"),
    ).toBe("https://linara.test/reset-password");
    expect(sanitizeUrl("linaramobile://today#access_token=abc")).toBe("linaramobile://today");
  });

  it("keeps query names but never their values", () => {
    expect(
      sanitizeUrl(
        "https://abc.supabase.co/rest/v1/tasks?select=*&household_id=eq.550e8400-e29b-41d4-a716-446655440000",
      ),
    ).toBe("https://abc.supabase.co/rest/v1/tasks?select=[redacted]&household_id=[redacted]");
  });

  it("drops the whole query on auth paths and auth deep links", () => {
    expect(sanitizeUrl("https://abc.supabase.co/auth/v1/token?grant_type=password")).toBe(
      "https://abc.supabase.co/auth/v1/token",
    );
    expect(sanitizeUrl("https://linara.test/reset-password?code=abc")).toBe(
      "https://linara.test/reset-password",
    );
    expect(sanitizeUrl("https://linara.test/email-confirmed?for=helper")).toBe(
      "https://linara.test/email-confirmed",
    );
    expect(sanitizeUrl("linaramobile://sign-in?code=abc")).toBe("linaramobile://sign-in");
    expect(sanitizeUrl("/auth/callback?code=abc")).toBe("/auth/callback");
  });

  it("drops bare keys and names that are not plain identifiers", () => {
    expect(sanitizeUrl("https://x.test/p?SECRET")).toBe("https://x.test/p");
    expect(sanitizeUrl("https://x.test/p?code%20=1&ok=2")).toBe("https://x.test/p?ok=[redacted]");
    expect(sanitizeUrl("https://x.test/p?abcdefghijklmnopqrstuvwxyz0123=1")).toBe(
      "https://x.test/p",
    );
  });

  it("replaces credential-looking path segments with a placeholder", () => {
    expect(sanitizeUrl("https://x.test/files/abcdefghijklmnopqrstuvwxyz0123")).toBe(
      "https://x.test/files/:token",
    );
    expect(sanitizeUrl("/task/550e8400-e29b-41d4-a716-446655440000")).toBe("/task/:token");
    expect(sanitizeUrl("https://x.test/callback%23access_token=abc")).toBe("https://x.test/:token");
  });

  it("masks an email in a path, encoded or not", () => {
    expect(sanitizeUrl("/u/ana@example.com")).toBe("/u/[email]");
    expect(sanitizeUrl("https://x.test/u/ana%40example.com/pay")).toBe(
      "https://x.test/u/[email]/pay",
    );
  });

  it("drops credentials embedded before the host", () => {
    expect(sanitizeUrl("https://user:pass@x.test/p")).toBe("https://x.test/p");
  });

  it("treats a token-shaped custom-scheme host like a path segment", () => {
    expect(sanitizeUrl("linaramobile://SECRETSECRETSECRETSECRET1234")).toBe(
      "linaramobile://:token",
    );
  });

  it("returns a fixed placeholder for what it cannot parse", () => {
    expect(sanitizeUrl("mailto:ana@example.com")).toBe("[unparseable-url]");
    expect(sanitizeUrl("not a url")).toBe("[unparseable-url]");
  });

  it("is idempotent, so scrubbing twice changes nothing", () => {
    const once = sanitizeUrl("https://x.test/u/ana@example.com/abcdefghijklmnopqrstuvwxyz?a=1");
    expect(sanitizeUrl(once)).toBe(once);
  });
});

describe("maskEmails", () => {
  it("replaces every email address in free text", () => {
    expect(maskEmails("from ana@example.com to b.cruz+x@mail.ph")).toBe("from [email] to [email]");
  });
});

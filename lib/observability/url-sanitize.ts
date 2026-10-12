/**
 * Reduces a URL to what may leave the phone in an error report or log.
 *
 * Ported from Mila mobile's url-sanitize.ts and made stricter for Linara,
 * which holds wages, government IDs and helpers' data: no query value is ever
 * kept, only the parameter names. Pure string work on purpose: Hermes' built-in
 * `URL` does not implement `search`/`searchParams`.
 */

/** What `sanitizeUrl` returns for input it cannot parse: never the raw string. */
const UNPARSEABLE_URL = "[unparseable-url]";
const REDACTED_VALUE = "[redacted]";
const PLACEHOLDER_SEGMENT = ":token";

const MAX_DECODE_ROUNDS = 5;

// Percent-decodes (and turns `+` into a space) until the text stops changing,
// so `%2563ode` cannot hide as `%63ode`. Returns null when it cannot settle or
// is malformed: the caller drops what it cannot read.
function decodeToFixedPoint(raw: string): string | null {
  let current = raw;
  for (let round = 0; round < MAX_DECODE_ROUNDS; round += 1) {
    let next: string;
    try {
      next = decodeURIComponent(current.replace(/\+/g, " "));
    } catch {
      return null;
    }
    if (next === current) return current;
    current = next;
  }
  return null;
}

// A run of 20+ letters/digits (hex, base64url body) or a JWT shape.
const TOKEN_RUN = /[A-Za-z0-9]{20,}/;
const JWT_SHAPE = /[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*/;
const TOKEN_SEGMENT = /^[A-Za-z0-9_-]{20,}$/;
// A parameter name worth keeping reads like a column or option name.
const PLAIN_NAME = /^[A-Za-z_][A-Za-z0-9_.-]{0,39}$/;

// `query` is the raw text after `?` (no fragment). Bare keys go: with no `=`
// there is no name/value split, so the key itself may be the secret.
function sanitizeQuery(query: string): string {
  const kept: string[] = [];
  for (const pair of query.split(/[&;]/)) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    const name = decodeToFixedPoint(pair.slice(0, eq));
    if (name === null || !PLAIN_NAME.test(name) || TOKEN_RUN.test(name)) continue;
    kept.push(`${name}=${REDACTED_VALUE}`);
  }
  return kept.length > 0 ? `?${kept.join("&")}` : "";
}

const EMAIL_IN_TEXT = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/** Replaces every email address in free text with `[email]`. */
export function maskEmails(text: string): string {
  return text.replace(EMAIL_IN_TEXT, "[email]");
}

// A segment that looks like a credential (base64url/hex of 20+, a uuid, a JWT)
// or hides query/fragment syntax behind percent-encoding becomes `:token`.
function sanitizeSegment(segment: string): string {
  if (segment === "") return segment;
  const decoded = decodeToFixedPoint(segment);
  if (decoded === null || /[#?=&;]/.test(decoded)) return PLACEHOLDER_SEGMENT;
  // An email in a path is personal data: mask it (decoded, so %40 is caught).
  const masked = maskEmails(decoded);
  if (masked !== decoded) return masked;
  if (TOKEN_SEGMENT.test(decoded) || JWT_SHAPE.test(decoded)) return PLACEHOLDER_SEGMENT;
  return segment;
}

function sanitizePath(path: string): string {
  return path.split("/").map(sanitizeSegment).join("/");
}

// First segments whose query is dropped whole: Supabase's /auth/v1/*, and the
// web app's pages that recovery and confirmation emails open.
const AUTH_SEGMENTS: ReadonlySet<string> = new Set([
  "auth",
  "reset-password",
  "email-confirmed",
  "sign-in",
]);

function isAuthSegment(segment: string): boolean {
  return AUTH_SEGMENTS.has((decodeToFixedPoint(segment) ?? segment).trim().toLowerCase());
}

// scheme://authority/path — the shape of every deep link and web URL.
const HIERARCHICAL_URL = /^([a-z][a-z0-9+.-]*:\/\/)([^/]*)(.*)$/i;

/**
 * Keeps scheme://host and the path (credential-looking segments become
 * `:token`, emails `[email]`), then each query name with its value replaced by
 * `[redacted]`. The fragment always goes, and so does the whole query on auth
 * paths and auth deep links (`linaramobile://sign-in`). Embedded credentials
 * (userinfo) are dropped. Anything that is neither `scheme://...` nor a bare
 * path, `mailto:` included, becomes a fixed placeholder.
 */
export function sanitizeUrl(url: string): string {
  const hashAt = url.indexOf("#");
  const withoutFragment = hashAt === -1 ? url : url.slice(0, hashAt);
  const queryAt = withoutFragment.indexOf("?");
  const head = queryAt === -1 ? withoutFragment : withoutFragment.slice(0, queryAt);
  const query = queryAt === -1 ? "" : withoutFragment.slice(queryAt + 1);

  if (head.startsWith("/") && !head.startsWith("//")) {
    const keep = isAuthSegment(head.split("/")[1] ?? "") ? "" : sanitizeQuery(query);
    return `${sanitizePath(head)}${keep}`;
  }

  const match = HIERARCHICAL_URL.exec(head);
  if (!match) return UNPARSEABLE_URL;
  const scheme = match[1] ?? "";
  const host = (match[2] ?? "").replace(/^.*@/, "");
  const path = match[3] ?? "";
  if (host === "" && path === "") return UNPARSEABLE_URL;
  const isWeb = /^https?:\/\/$/i.test(scheme);
  // In a custom-scheme deep link the "host" is the first route segment.
  const auth = (!isWeb && isAuthSegment(host)) || isAuthSegment(path.split("/")[1] ?? "");
  const keep = auth ? "" : sanitizeQuery(query);
  // A web host is a name, never a token; a custom-scheme host can be one.
  const safeHost = isWeb ? host : sanitizeSegment(host);
  return `${scheme}${safeHost}${sanitizePath(path)}${keep}`;
}

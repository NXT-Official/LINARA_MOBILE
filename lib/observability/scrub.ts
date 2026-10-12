import { sanitizeUrl } from "./url-sanitize";

/**
 * Scrubbing for everything that leaves the phone through Sentry: emails, phone
 * numbers, JWTs, bearer tokens, data URIs, base64 blobs, and query values and
 * fragments in URLs. Ported from Mila mobile's scrub.ts. Fail closed: an event
 * this cannot read is dropped, never sent raw.
 */

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// A Philippine mobile number as people type it: 09…, 63 9… or +63 9…, with
// optional spaces or dashes. Bounded by non-digits so dates and amounts stay.
const PH_MOBILE = /(^|[^\d+])((?:\+?63|0)\s?9\d{2}[\s-]?\d{3}[\s-]?\d{4})(?!\d)/g;
const JWT = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g;
const BEARER = /(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi;
const DATA_URI = /data:[a-z]+\/[a-z0-9.+-]+(?:;[a-z0-9=.+-]+)*,[A-Za-z0-9+/=%_-]*/gi;
const LONG_BASE64 = /[A-Za-z0-9+/_-]{120,}={0,2}/g;
// URLs and bare paths in text both go through url-sanitize.ts; a URL runs to
// whitespace or a closing delimiter.
const URL_TOKEN = /[a-z][a-z0-9+.-]*:\/\/[^\s"'<>)]+/gi;
const BARE_PATH = /(^|[\s"'(=])(\/[^\s"'<>)]*)/g;

// Longer text is cut before any pattern runs: the email and URL patterns
// backtrack quadratically on long runs (50,000 letters took 5 s on the JS thread).
const MAX_TEXT_LENGTH = 2_000;
// A double-quoted literal, or one the cap left open at the end. Postgres and
// PostgREST quote the value they reject: `invalid input syntax for type uuid:
// "Lorna Bautista"`. Only plain identifiers (a table, a constraint) stay.
const QUOTED_LITERAL = /"((?:[^"\\\n]|\\.)*)(?:"|$)/g;
const PLAIN_IDENTIFIER = /^[A-Za-z0-9_.]{0,63}$/;

function filterQuoted(literal: string, inner: string): string {
  return PLAIN_IDENTIFIER.test(inner) ? literal : '"[Filtered]"';
}

/**
 * `text` cut to MAX_TEXT_LENGTH characters. When the cut lands inside a word,
 * the whole word goes: half an email address, phone number or token no longer
 * matches the pattern that would mask it, and its first half would go out as
 * it is.
 */
function capForScrubbing(text: string): string {
  if (text.length <= MAX_TEXT_LENGTH) return text;
  let end = MAX_TEXT_LENGTH;
  if (!/\s/.test(text.charAt(end))) {
    while (end > 0 && !/\s/.test(text.charAt(end - 1))) end -= 1;
  }
  return `${text.slice(0, end)}…`;
}

/** Removes secrets and personal data from one string. */
export function scrubText(text: string): string {
  return capForScrubbing(text)
    .replace(QUOTED_LITERAL, filterQuoted)
    .replace(DATA_URI, "[data-uri]")
    .replace(JWT, "[jwt]")
    .replace(BEARER, "$1[token]")
    .replace(URL_TOKEN, sanitizeUrl)
    .replace(BARE_PATH, (_m, lead: string, path: string) => lead + sanitizeUrl(path))
    .replace(EMAIL, "[email]")
    .replace(PH_MOBILE, "$1[phone]")
    .replace(LONG_BASE64, "[base64]");
}

// Span and breadcrumb data that holds a URL's query or fragment on its own,
// already split off the URL, so the URL sanitizer never sees it.
const REDACTED_KEYS: ReadonlySet<string> = new Set([
  "http.query",
  "http.fragment",
  "url.query",
  "url.fragment",
  "query_string",
]);

const MAX_DEPTH = 8;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPlainObject(value: object): boolean {
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function scrubValue(value: unknown, depth: number): unknown {
  if (typeof value === "string") return scrubText(value);
  // A parameterized log message is a String object; read it as the text it is.
  if (value instanceof String) return scrubText(value.toString());
  if (typeof value !== "object" || value === null) return value;
  // Fail closed: past the limit nothing unscrubbed is passed through.
  if (depth >= MAX_DEPTH) return "[truncated]";
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, depth + 1));
  // Raw console arguments reach breadcrumbs unnormalised. An Error keeps its
  // text; any other class instance (a scope, a client, a session) is named,
  // never walked, so neither its graph nor what it holds goes out.
  if (value instanceof Error) return scrubText(`${value.name}: ${value.message}`);
  if (!isPlainObject(value)) return `[${value.constructor?.name || "object"}]`;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = REDACTED_KEYS.has(k) ? "[redacted]" : scrubValue(v, depth + 1);
  }
  return out;
}

// Taps produce these. The SDK labels them with the text under the finger, an
// accessibilityLabel or a testID (a private note, "Pangalan: <name>"), so only
// component names are kept.
// src: @sentry/react-native dist/js/touchevents.js + ragetap.js · 8.30.0 · 2026-10-12
const TOUCH_CATEGORIES: ReadonlySet<string> = new Set(["touch", "ui.multiClick"]);

function withoutLabel(entry: Record<string, unknown>): Record<string, unknown> {
  const { label: _label, ...rest } = entry;
  return rest;
}

function withoutNodeText(node: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...node };
  if ("textContent" in out) out.textContent = "";
  if (isRecord(out.attributes)) {
    const { "sentry-label": _label, ...attributes } = out.attributes;
    out.attributes = attributes;
  }
  return out;
}

function withoutTouchText(crumb: Record<string, unknown>): Record<string, unknown> {
  if (typeof crumb.category !== "string" || !TOUCH_CATEGORIES.has(crumb.category)) return crumb;
  const data = isRecord(crumb.data) ? { ...crumb.data } : undefined;
  const path = Array.isArray(data?.path) ? data.path.filter(isRecord).map(withoutLabel) : [];
  const root = typeof path[0]?.name === "string" ? path[0].name : "unknown";
  const out: Record<string, unknown> = {
    ...crumb,
    message: crumb.category === "touch" ? `Touch event within element: ${root}` : root,
  };
  if (data) {
    if ("path" in data) data.path = path;
    if (isRecord(data.node)) data.node = withoutNodeText(data.node);
    out.data = data;
  }
  return out;
}

// No pattern recognises a name, a government ID or a wage, so wherever the SDK
// copies an app object (a console argument, a thrown Supabase error) the copy
// is removed by structure rather than scrubbed.

// A console breadcrumb keeps the raw arguments in `data.arguments` and their
// joined text in `message`. Only a first argument the app wrote as a plain
// string survives, as the message.
// src: @sentry/browser build/npm/esm/dev/integrations/breadcrumbs.js · 10.76.0 · 2026-10-12
function withoutConsolePayload(
  original: unknown,
  crumb: Record<string, unknown>,
): Record<string, unknown> {
  if (crumb.category !== "console" || !isRecord(original) || !isRecord(original.data)) {
    return crumb;
  }
  const args = original.data.arguments;
  if (!Array.isArray(args)) return crumb;
  const { message: _message, ...out } = crumb;
  const { arguments: _arguments, ...data } = isRecord(crumb.data) ? crumb.data : {};
  const first: unknown = args[0];
  return { ...out, ...(typeof first === "string" ? { message: scrubText(first) } : {}), data };
}

function withoutStructuralText(
  original: unknown,
  scrubbed: Record<string, unknown>,
): Record<string, unknown> {
  return withoutConsolePayload(original, withoutTouchText(scrubbed));
}

// Request pieces that can carry credentials wholesale.
const DROPPED_REQUEST_KEYS = ["cookies", "headers", "data", "query_string"] as const;

/**
 * Sentry `beforeSend` / `beforeSendTransaction` / `beforeBreadcrumb` body.
 * Generic over the shape so one function serves all three. Keeps the Supabase
 * user id and nothing else on `user`, component names only on taps, and no
 * console arguments.
 */
export function scrubSentryEvent<T extends object>(event: T): T | null {
  try {
    // sdkProcessingMetadata is the SDK's bookkeeping on transactions: live
    // scope objects, deleted before the envelope is built, so never sent.
    // Walking it would copy the scope and client graph on every navigation.
    // src: @sentry/core build/esm/envelope.js (createEventEnvelope) · 10.76.0 · 2026-10-12
    // extra is dropped whole: a thrown non-Error object (a Supabase error with
    // the failing row in `details`) is serialized there as `__serialized__`.
    // src: @sentry/browser build/npm/esm/dev/eventbuilder.js (eventFromPlainObject) · 10.76.0 · 2026-10-12
    const { sdkProcessingMetadata, extra: _extra, ...rest } = event as Record<string, unknown>;
    const next = withoutStructuralText(event, scrubValue(rest, 0) as Record<string, unknown>);
    if (sdkProcessingMetadata !== undefined) next.sdkProcessingMetadata = sdkProcessingMetadata;
    if (Array.isArray(next.breadcrumbs)) {
      const originals = Array.isArray(rest.breadcrumbs) ? rest.breadcrumbs : [];
      next.breadcrumbs = next.breadcrumbs.map((c, i) =>
        isRecord(c) ? withoutStructuralText(originals[i], c) : c,
      );
    }
    const user = (event as { user?: { id?: unknown } }).user;
    if (user) {
      next.user = typeof user.id === "string" ? { id: user.id } : undefined;
    }
    const request = next.request;
    if (request && typeof request === "object") {
      for (const key of DROPPED_REQUEST_KEYS) delete (request as Record<string, unknown>)[key];
    }
    return next as T;
  } catch {
    return null;
  }
}

// The SDK copies the scope's user onto every log; only the id may go.
const DROPPED_LOG_ATTRIBUTES = ["user.email", "user.name", "user.ip_address"] as const;

// A log the console integration made from a console.warn/error call. It copies
// a first-argument object's keys into the attributes, the other arguments into
// `sentry.message.parameter.*`, and every argument into the message.
// src: @sentry/core build/esm/logs/console-integration.js + logs/utils.js · 10.76.0 · 2026-10-12
const CONSOLE_ORIGIN = "auto.log.console";
const WITHHELD_MESSAGE = "[console payload removed]";
// What the React Native log enricher adds about the phone itself.
// src: @sentry/react-native dist/js/integrations/logEnricherIntegration.js · 8.30.0 · 2026-10-12
const DEVICE_ATTRIBUTES: ReadonlySet<string> = new Set([
  "device.brand",
  "device.model",
  "device.family",
  "os.name",
  "os.version",
]);
const PARAMETER_PREFIX = "sentry.message.parameter.";
// The console's own substitutions (%s, %o, ...), which splice arguments in.
const CONSOLE_SUBSTITUTION = /%[sdifocO]/;
// A message that starts with a serialized value: the first argument was not a string.
const SERIALIZED_START =
  /^\s*(?:\{|\[\s*(?:["{[\]\d-]|null\b|true\b|false\b)|-?\d|null\b|undefined\b|true\b|false\b|NaN\b)/;

function isSdkLogAttribute(key: string): boolean {
  return (
    key.startsWith("sentry.") ||
    key.startsWith("user.") ||
    key.startsWith("linara.") ||
    DEVICE_ATTRIBUTES.has(key)
  );
}

function isKeptConsoleAttribute(key: string): boolean {
  if (key === "user.id" || key.startsWith("linara.") || DEVICE_ATTRIBUTES.has(key)) return true;
  return key.startsWith("sentry.") && !key.startsWith(PARAMETER_PREFIX);
}

// The template ("[tag] text: {}") is the app's own first string; without one,
// the message stands only if it was a single plain string.
function consoleMessage(message: string, attributes: Record<string, unknown>): string {
  const template = attributes["sentry.message.template"];
  if (typeof template === "string") return scrubText(template);
  const fromObject = Object.keys(attributes).some(
    (key) => key.startsWith(PARAMETER_PREFIX) || !isSdkLogAttribute(key),
  );
  if (fromObject || CONSOLE_SUBSTITUTION.test(message) || SERIALIZED_START.test(message)) {
    return WITHHELD_MESSAGE;
  }
  return scrubText(message);
}

/**
 * Sentry `beforeSendLog` body: scrubs the message and attributes and keeps
 * `user.id` only. A console log keeps an allowlist of attributes and a message
 * rebuilt from what the app wrote, never from its arguments; the app's own
 * `Sentry.logger` logs keep their attributes.
 */
export function scrubSentryLog<T extends object>(log: T): T | null {
  const next = scrubSentryEvent(log) as Record<string, unknown> | null;
  if (!next) return null;
  const original = log as { message?: unknown; attributes?: unknown };
  const originalAttributes = isRecord(original.attributes) ? original.attributes : {};
  const attributes = isRecord(next.attributes) ? next.attributes : {};
  for (const key of DROPPED_LOG_ATTRIBUTES) delete attributes[key];
  if (originalAttributes["sentry.origin"] === CONSOLE_ORIGIN) {
    next.message = consoleMessage(String(original.message ?? ""), originalAttributes);
    for (const key of Object.keys(attributes)) {
      if (!isKeptConsoleAttribute(key)) delete attributes[key];
    }
  }
  return next as T;
}

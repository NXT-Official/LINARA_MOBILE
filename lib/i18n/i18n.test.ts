import { describe, expect, it } from "vitest";

import { DEFAULT_LOCALE, LOCALES, localeFromDevice, localeLabel, parseLocale } from "./locales";
import { RESOURCES } from "./resources";
import { textParts, translate } from "./translate";

/** "area.key" -> text, for every leaf of a nested catalog. */
function flatten(node: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out[key] = v;
    else Object.assign(out, flatten(v, key));
  }
  return out;
}
const MESSAGES = Object.fromEntries(
  LOCALES.map((l) => [l.code, flatten(RESOURCES[l.code].translation)]),
) as Record<(typeof LOCALES)[number]["code"], Record<string, string>>;
type MessageKey = string;

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("locales", () => {
  it("Taglish is the default, so nothing changes until she picks", () => {
    expect(DEFAULT_LOCALE).toBe("tl");
    expect(parseLocale(null)).toBe("tl");
    expect(parseLocale("")).toBe("tl");
    expect(parseLocale("fr")).toBe("tl");
  });

  it("keeps a stored choice", () => {
    for (const l of LOCALES) expect(parseLocale(l.code)).toBe(l.code);
  });

  it("the console's set, with Taglish for Filipino, each named in its own language", () => {
    expect(LOCALES.map((l) => l.label)).toEqual([
      "Taglish",
      "English",
      "Español",
      "简体中文",
      "日本語",
    ]);
    expect(localeLabel("ja")).toBe("日本語");
  });
});

describe("messages", () => {
  const keys = Object.keys(MESSAGES.tl) as MessageKey[];
  const PLURAL = /_(zero|one|two|few|many|other)$/;
  // A language may split a key into plural forms (key_one, key_other): it
  // still counts as that one key.
  const base = (k: string) => k.replace(PLURAL, "");
  const forms = (code: string, k: string) =>
    Object.keys(MESSAGES[code as keyof typeof MESSAGES]).filter((x) => base(x) === k);
  const withoutCount = (text: string) => placeholders(text).filter((p) => p !== "count");

  it("every language has every key, none empty", () => {
    for (const l of LOCALES) {
      const own = [...new Set(Object.keys(MESSAGES[l.code]).map(base))].sort();
      expect([l.code, own]).toEqual([l.code, [...keys].sort()]);
      for (const [k, v] of Object.entries(MESSAGES[l.code]))
        expect([l.code, k, v.trim() === ""]).toEqual([l.code, k, false]);
    }
  });

  it("a key split into plural forms has every form the language needs", () => {
    for (const l of LOCALES) {
      const needed = new Intl.PluralRules(l.code).resolvedOptions().pluralCategories;
      for (const k of keys) {
        const f = forms(l.code, k);
        if (f.length === 1 && f[0] === k) continue;
        expect([l.code, k, f.map((x) => x.slice(k.length + 1)).sort()]).toEqual([
          l.code,
          k,
          [...needed].sort(),
        ]);
      }
    }
  });

  it("every language keeps the same placeholders, so no value is dropped", () => {
    for (const l of LOCALES) {
      for (const k of keys) {
        for (const f of forms(l.code, k)) {
          expect([l.code, f, withoutCount(MESSAGES[l.code][f])]).toEqual([
            l.code,
            f,
            withoutCount(MESSAGES.tl[k]),
          ]);
        }
      }
    }
  });

  it("no language is just a copy of the Taglish", () => {
    for (const l of LOCALES.filter((x) => x.code !== "tl")) {
      const same = keys.filter((k) => MESSAGES[l.code][k] === MESSAGES.tl[k]).length;
      expect([l.code, same / keys.length < 0.2]).toEqual([l.code, true]);
    }
  });
});

describe("first language from the phone", () => {
  it("Spanish, Chinese and Japanese phones start in their language", () => {
    expect(localeFromDevice(["es-ES"])).toBe("es");
    expect(localeFromDevice(["zh-Hans-CN"])).toBe("zh-CN");
    expect(localeFromDevice(["ja-JP"])).toBe("ja");
  });

  it("English, Filipino and anything unknown start in Taglish, as the app always did", () => {
    expect(localeFromDevice(["en-PH"])).toBe("tl");
    expect(localeFromDevice(["fil-PH"])).toBe("tl");
    expect(localeFromDevice(["fr-FR"])).toBe("tl");
    expect(localeFromDevice([])).toBe("tl");
  });

  it("the first tag it knows wins", () => {
    expect(localeFromDevice(["fr-FR", "ja-JP", "es-ES"])).toBe("ja");
  });
});

describe("translate", () => {
  it("is the app's own Taglish by default", () => {
    expect(translate("tl", "tabs.pay")).toBe("Sahod ko");
    expect(translate("en", "tabs.pay")).toBe("My pay");
  });

  it("fills placeholders, and leaves a missing one showing", () => {
    expect(translate("tl", "welcome.codeLength", { count: 6 })).toBe(
      "Kailangan 6 characters ang invite code, po.",
    );
    expect(translate("en", "language.current", {})).toBe("Language: {language}");
  });
});

describe("textParts", () => {
  it("splits around placeholders in any order", () => {
    expect(textParts("a {terms} b {privacy}.")).toEqual([
      "a ",
      { name: "terms" },
      " b ",
      { name: "privacy" },
      ".",
    ]);
    expect(textParts("{mine}のアカウント")).toEqual([{ name: "mine" }, "のアカウント"]);
    expect(textParts("plain")).toEqual(["plain"]);
  });
});

import { describe, expect, it } from "vitest";

import { DEFAULT_LOCALE, LOCALES, localeLabel, parseLocale } from "./locales";
import { MESSAGES, textParts, translate, type MessageKey } from "./translate";

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

  it("every language has every key, none empty", () => {
    for (const l of LOCALES) {
      expect(Object.keys(MESSAGES[l.code]).sort()).toEqual([...keys].sort());
      for (const k of keys) expect(MESSAGES[l.code][k].trim()).not.toBe("");
    }
  });

  it("every language keeps the same placeholders, so no value is dropped", () => {
    for (const l of LOCALES) {
      for (const k of keys) {
        expect([l.code, k, placeholders(MESSAGES[l.code][k])]).toEqual([
          l.code,
          k,
          placeholders(MESSAGES.tl[k]),
        ]);
      }
    }
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

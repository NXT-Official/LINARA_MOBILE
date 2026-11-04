import { afterEach, describe, expect, it } from "vitest";

import { formatClockTime, formatDateFil, formatShiftTime, formatTimeSpan } from "./format";
import { i18n } from "./i18n/instance";

describe("formatShiftTime in her language (QA staging-1103 F2)", () => {
  afterEach(async () => {
    await i18n.changeLanguage("tl");
  });

  it.each([
    ["tl", "06:00:00", "6:00 AM"],
    ["tl", "19:30:00", "7:30 PM"],
    ["en", "00:00:00", "12:00 AM"],
    ["en", "12:05:00", "12:05 PM"],
    ["es", "06:00:00", "6:00 a. m."],
    ["es", "19:30:00", "7:30 p. m."],
    ["zh-CN", "06:00:00", "上午6:00"],
    ["zh-CN", "19:30:00", "下午7:30"],
    ["ja", "06:00:00", "午前6:00"],
    ["ja", "19:30:00", "午後7:30"],
  ])("%s %s -> %s", async (lang, time, expected) => {
    await i18n.changeLanguage(lang);
    expect(formatShiftTime(time)).toBe(expected);
  });

  it("a task's clock time follows the language too", async () => {
    await i18n.changeLanguage("ja");
    expect(formatClockTime(new Date(2026, 9, 6, 14, 0).toISOString())).toBe("午後2:00");
  });
});

describe("formatTimeSpan", () => {
  // Built from local parts, so the test reads the same in any time zone.
  const at = new Date(2026, 9, 6, 14, 0).toISOString();

  it("is just the time when the task has no length", () => {
    expect(formatTimeSpan(at, null)).toBe(formatClockTime(at));
  });

  it("adds the end when it has one", () => {
    const end = new Date(2026, 9, 6, 15, 30).toISOString();
    expect(formatTimeSpan(at, 90)).toBe(`${formatClockTime(at)} – ${formatClockTime(end)}`);
  });
});

describe("formatDateFil (QA LM-14)", () => {
  it("writes the month in Filipino, as Okt 8 elsewhere in the app", () => {
    expect(formatDateFil(new Date(2026, 9, 8))).toBe("Okt 8, 2026");
    expect(formatDateFil(new Date(2026, 0, 1))).toBe("Ene 1, 2026");
    expect(formatDateFil(new Date(2025, 11, 31))).toBe("Dis 31, 2025");
  });
});

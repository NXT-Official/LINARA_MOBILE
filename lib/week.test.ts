import { describe, expect, it } from "vitest";

import { buildDays, buildWeek, monthRange } from "./week";

// Local-time instants so this holds in any time zone.
const at = (d: number, h: number) => new Date(2026, 8, d, h, 0).toISOString();
const now = new Date(2026, 8, 30, 22, 0); // Wed 30 Sep 2026, 10 PM

const t = (id: string, scheduledStart: string) => ({
  id,
  title: id,
  status: "todo" as const,
  scheduledStart,
});

describe("buildWeek", () => {
  const week = buildWeek(now, 0, [
    t("pack", at(32, 20)), // Fri 2 Oct, 8 PM
    t("bottle", at(30, 18)), // today, earlier this evening
    t("laundry", at(32, 8)), // Fri 2 Oct, 8 AM
    t("far", at(37, 9)), // Wed 7 Oct: outside the 7 days
  ]);

  it("covers seven days starting today, labelled in Filipino", () => {
    expect(week).toHaveLength(7);
    expect(week[0]).toMatchObject({ label: "Miyerkules, Set 30", isToday: true });
    expect(week[1].label).toBe("Huwebes, Okt 1");
    expect(week[6].label).toBe("Martes, Okt 6");
  });

  it("marks the rest day", () => {
    expect(week.filter((d) => d.isRestDay).map((d) => d.label)).toEqual(["Linggo, Okt 4"]);
  });

  it("puts each ticket on its day, in time order, and drops ones past the week", () => {
    expect(week[0].tickets.map((x) => x.id)).toEqual(["bottle"]);
    expect(week[2].tickets.map((x) => x.id)).toEqual(["laundry", "pack"]);
    expect(week.flatMap((d) => d.tickets).map((x) => x.id)).not.toContain("far");
  });
});

describe("buildDays", () => {
  const off = (id: string, restDate: string, status: "approved" | "pending" | "declined") => ({
    id,
    restDate,
    startTime: "13:00:00",
    endTime: "17:00:00",
    status,
  });

  it("puts approved and waiting days off on their day, never declined ones", () => {
    const week = buildWeek(
      now,
      0,
      [],
      [
        off("a", "2026-10-02", "approved"),
        off("p", "2026-10-02", "pending"),
        off("d", "2026-10-03", "declined"),
      ],
    );
    expect(week[2].timeOff.map((o) => o.id)).toEqual(["a", "p"]);
    expect(week[3].timeOff).toEqual([]);
  });

  it("pages to any start and marks days already gone", () => {
    const days = buildDays(new Date(2026, 8, 28), 7, now, 0, []);
    expect(days[0].label).toBe("Lunes, Set 28");
    expect(days.map((d) => d.isPast)).toEqual([true, true, false, false, false, false, false]);
    expect(days[2].isToday).toBe(true);
  });
});

describe("monthRange", () => {
  it("runs Sunday before the 1st to Saturday after the last day", () => {
    const { start, count } = monthRange(2026, 9); // October 2026: Thu 1 to Sat 31
    expect(start.toDateString()).toBe(new Date(2026, 8, 27).toDateString());
    expect(count).toBe(35);
  });
});

import { describe, expect, it } from "vitest";

import { buildWeek } from "./week";

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

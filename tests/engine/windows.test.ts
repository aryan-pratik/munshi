import { describe, expect, it } from "vitest";
import { addDays, dayOf, daysBetween, defaultWindows, now, weekday, windowEnding, windowLength } from "@/engine/windows";
import type { World } from "@/types";

const world = { meta: { day0: "2026-07-11", days: 90 } } as World;

describe("windows", () => {
  it("ends the world on day0 + 89, the demo date", () => {
    expect(now(world)).toBe("2026-10-08");
    expect(weekday(now(world))).toBe(4); // Thursday
    expect(dayOf(world, 77)).toBe("2026-09-26");
    expect(dayOf(world, 79)).toBe("2026-09-28");
    expect(dayOf(world, 74)).toBe("2026-09-23");
    expect(dayOf(world, 60)).toBe("2026-09-09");
  });
  it("builds the default 14-day windows: days 76 to 89 and 62 to 75", () => {
    const { current, previous } = defaultWindows(world);
    expect(current).toEqual({ from: dayOf(world, 76), to: dayOf(world, 89) });
    expect(previous).toEqual({ from: dayOf(world, 62), to: dayOf(world, 75) });
    expect(windowLength(current)).toBe(14);
  });
  it("does day maths on the date part only", () => {
    expect(addDays("2026-10-08T23:30:00+05:30", 1)).toBe("2026-10-09");
    expect(daysBetween("2026-07-11", "2026-10-08")).toBe(89);
    expect(windowEnding("2026-10-08", 28).from).toBe("2026-09-11");
  });
});

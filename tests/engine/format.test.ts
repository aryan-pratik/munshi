import { describe, expect, it } from "vitest";
import { count, days, inr, inrCompact, longDate, pct, relDate, shortDate } from "@/lib/format";

describe("format", () => {
  it("formats rupees with Indian grouping", () => {
    expect(inr(110400)).toBe("₹1,10,400");
    expect(inr(1674000)).toBe("₹16,74,000");
    expect(inr(820)).toBe("₹820");
    expect(inr(-1200)).toBe("-₹1,200");
    expect(inr(401400.4)).toBe("₹4,01,400");
  });
  it("compacts to lakh and crore", () => {
    expect(inrCompact(110400)).toBe("₹1.1 lakh");
    expect(inrCompact(1674000)).toBe("₹16.7 lakh");
    expect(inrCompact(5400000)).toBe("₹54 lakh");
    expect(inrCompact(5425000)).toBe("₹54.3 lakh");
    expect(inrCompact(12000000)).toBe("₹1.2 crore");
    expect(inrCompact(82400)).toBe("₹82,400");
  });
  it("formats percentages", () => {
    expect(pct(14)).toBe("+14%");
    expect(pct(-6.4)).toBe("-6%");
    expect(pct(0)).toBe("0%");
    expect(pct(2.64, { signed: false, decimals: 2 })).toBe("2.64%");
  });
  it("formats relative dates", () => {
    const today = "2026-10-08";
    expect(relDate("2026-10-08", today)).toBe("today");
    expect(relDate("2026-10-07", today)).toBe("yesterday");
    expect(relDate("2026-10-05", today)).toBe("3 days ago");
    expect(relDate("2026-10-20", today)).toBe("in 12 days");
    expect(relDate("2026-09-09", today)).toBe("4 weeks ago");
    expect(relDate("2026-07-16", today)).toBe("3 months ago");
  });
  it("formats dates and counts", () => {
    expect(shortDate("2026-09-26")).toBe("26 Sep");
    expect(shortDate("2026-10-08T10:00:00+05:30", true)).toBe("8 Oct 2026");
    expect(longDate("2026-10-08")).toBe("Thursday 8 October 2026");
    expect(count(1800)).toBe("1,800");
    expect(days(1.24)).toBe("1.2 days");
    expect(days(1)).toBe("1 day");
  });
});

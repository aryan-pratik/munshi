// Every detector threshold in one place (docs/DATA-MODEL.md, section 5), with why.
export const THRESHOLDS = {
  /** A quoted lead worth this much or more is worth a personal follow-up. */
  leadMinValueINR: 10_000,
  /** Two working days without a reply is where wholesale buyers start quoting elsewhere. */
  leadStaleHours: 48,
  /** Share of quoted leads that close, used only when the world has too few decided leads to measure. */
  leadWinRateFallback: 0.6,
  /** A conversion drop under 15% is within week-to-week noise on ~135 landing sessions a day. */
  conversionDropPct: -15,
  /** Lead conversion is judged only when both windows hold this many decided quotes; fewer is noise. */
  leadCvrMinDecided: 15,
  /** Complaints must rise by a quarter and by at least five tickets; small counts swing wildly. */
  complaintRisePct: 25,
  complaintMinAbsRise: 5,
  /** A recurring bill a tenth above its three-month median is a plan change, not a usage blip. */
  costCreepPct: 10,
  /** Sixty days unused covers a quarter-end lull; longer means nobody owns the tool. */
  zombieDays: 60,
  /** One account above a quarter of revenue can sink a quarter by paying late. */
  concentrationShare: 0.25,
  /** Cash below this buffer cannot absorb one missed wholesale payment. */
  cashBufferINR: 2_00_000,
  horizonDays: 30,
  /** Renewals and filings inside three weeks need the money set aside now. */
  renewalWithinDays: 21,
  /** Customer acquisition cost up a fifth over a month means paid growth is getting expensive. */
  cacRisePct: 20,
  /** A courier averaging more than 1.5 days past promise is breaching its SLA. */
  slaDelayDays: 1.5,
  /** A delivery more than two days past promise is the one customers write in about. */
  lateDeliveryDays: 2,
} as const;

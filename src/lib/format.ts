// Every rupee, percentage and relative date shown in the UI comes through here (CLAUDE.md).
// Rupees use Indian grouping: ₹1,10,400. Compact form uses lakh and crore.

const inrFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** ₹1,10,400. Negative values carry the real minus sign before the symbol: −₹1,200. */
export function inr(value: number): string {
  const n = Math.round(Math.abs(value));
  return `${value < 0 ? "\u2212" : ""}₹${inrFormatter.format(n)}`;
}

/** ₹1.1 lakh, ₹16.7 lakh, ₹1.2 crore; below a lakh falls back to `inr`. */
export function inrCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "\u2212" : "";
  if (abs >= 1_00_00_000) return `${sign}₹${trim(abs / 1_00_00_000)} crore`;
  if (abs >= 1_00_000) return `${sign}₹${trim(abs / 1_00_000)} lakh`;
  return inr(value);
}

function trim(n: number): string {
  const s = n.toFixed(n >= 100 ? 0 : 1);
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

/** +14%, -6%, 0%. One decimal only below 10 when asked. */
export function pct(value: number, opts: { signed?: boolean; decimals?: number } = {}): string {
  const { signed = true, decimals = 0 } = opts;
  const rounded = Number(value.toFixed(decimals));
  const sign = signed && rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(decimals)}%`;
}

/** "today", "yesterday", "3 days ago", "in 12 days", "2 weeks ago", "6 weeks ago". */
export function relDate(iso: string, today: string): string {
  const diff = daysBetweenISO(today, iso);
  if (diff === 0) return "today";
  if (diff === -1) return "yesterday";
  if (diff === 1) return "tomorrow";
  const abs = Math.abs(diff);
  const unit = abs < 14 ? `${abs} days` : abs < 60 ? `${Math.round(abs / 7)} weeks` : `${Math.round(abs / 30)} months`;
  return diff < 0 ? `${unit} ago` : `in ${unit}`;
}

/** "26 Sep", "8 Oct 2026" when `withYear`. */
export function shortDate(iso: string, withYear = false): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[m - 1]}${withYear ? ` ${y}` : ""}`;
}

/** "Thursday 8 October 2026". */
export function longDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${days[dt.getUTCDay()]} ${d} ${months[m - 1]} ${y}`;
}

/** 1,800 with Indian grouping. */
export function count(value: number): string {
  return inrFormatter.format(Math.round(value));
}

/** "1.2 days", "3 days". */
export function days(value: number): string {
  const r = Math.round(value * 10) / 10;
  return `${r} ${r === 1 ? "day" : "days"}`;
}

function daysBetweenISO(a: string, b: string): number {
  const toUtc = (s: string) => {
    const [y, m, d] = s.slice(0, 10).split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

/** "Thursday, 8 October": the Today brief's opening. */
export function briefDate(iso: string): string {
  const [, weekday, rest] = /^(\w+) (\d+ \w+) \d+$/.exec(longDate(iso)) ?? [];
  return weekday && rest ? `${weekday}, ${rest}` : longDate(iso);
}

/** "2:00 pm" from an ISO datetime, in the offset the record carries (seed records carry +05:30). */
export function timeOf(iso: string): string {
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return "";
  const h = Number(m[1]);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m[2]} ${h < 12 ? "am" : "pm"}`;
}

/** "6 Oct, 2:00 pm". */
export function dateTime(iso: string): string {
  const t = timeOf(iso);
  return t ? `${shortDate(iso)}, ${t}` : shortDate(iso);
}

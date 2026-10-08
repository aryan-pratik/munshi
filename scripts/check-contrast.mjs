// WCAG 2.x contrast check for the token pairs in DESIGN.md (Contrast, verified).
// Run: node scripts/check-contrast.mjs
const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (h) => {
  const n = parseInt(h.slice(1), 16);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
};
export const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const light = {
  chalk: "#F6F7FB", surface: "#FFFFFF", wash: "#ECEEF6", "rule-strong": "#8187A3",
  ink: "#151A2D", "ink-2": "#4A5068", "ink-3": "#646A82", "neel-deep": "#1B2559", neel: "#3246C8",
  "neel-hover": "#2838A8", "neel-soft": "#EAECFC", "rail-active": "#2A3676", "rail-text-2": "#B9C0E6",
  "rail-active-text": "#FFFFFF",
  haldi: "#B67D0A", "haldi-ink": "#8A5A00", "haldi-soft": "#FDF1D6", debit: "#B4231A", "debit-soft": "#FBE6E3",
  credit: "#1F7A4D", "credit-soft": "#E1F2E8", "on-fill": "#FFFFFF",
};
const dark = {
  chalk: "#0F1220", surface: "#161A2C", wash: "#1D2238", "rule-strong": "#6B7294",
  ink: "#E8EAF4", "ink-2": "#A9AEC6", "ink-3": "#898FA8", "neel-deep": "#0B0E1A", neel: "#8C9BFF",
  "neel-hover": "#A3AFFF", "neel-soft": "#1E2550", "rail-active": "#1D2238", "rail-text-2": "#A9AEC6",
  "rail-active-text": "#E8EAF4",
  haldi: "#F5B83D", "haldi-ink": "#F5B83D", "haldi-soft": "#3A2C0C", debit: "#FF8A80", "debit-soft": "#3A1512",
  credit: "#6FD3A0", "credit-soft": "#10301F", "on-fill": "#0F1220",
};

const pairs = [
  ["ink", ["chalk", "surface", "wash", "neel-soft"], 4.5],
  ["ink-2", ["chalk", "surface", "wash", "neel-soft"], 4.5],
  ["ink-3", ["chalk", "surface", "wash", "neel-soft"], 4.5],
  ["neel", ["chalk", "surface", "wash", "neel-soft"], 4.5],
  ["on-fill", ["neel", "neel-hover"], 4.5],
  ["on-fill", ["debit", "credit"], 4.5],
  ["rail-text-2", ["neel-deep", "rail-active"], 4.5],
  ["rail-active-text", ["neel-deep", "rail-active"], 4.5],
  ["haldi-ink", ["surface", "chalk", "wash", "haldi-soft"], 4.5],
  ["debit", ["surface", "chalk", "wash", "neel-soft", "debit-soft"], 4.5],
  ["credit", ["surface", "chalk", "wash", "neel-soft", "credit-soft"], 4.5],
  ["ink", ["haldi-soft", "debit-soft", "credit-soft"], 4.5],
  ["haldi", ["surface", "chalk", "wash", "neel-soft"], 3],
  ["rule-strong", ["surface", "chalk", "wash"], 3],
  ["neel", ["surface", "chalk"], 3],
];

let failed = 0;
for (const [theme, t] of [["light", light], ["dark", dark]]) {
  for (const [fg, bgs, need] of pairs) {
    const worst = Math.min(...bgs.map((bg) => contrast(t[fg], t[bg])));
    const ok = worst >= need;
    if (!ok) failed++;
    console.log(`${ok ? "ok  " : "FAIL"} ${theme.padEnd(5)} ${fg.padEnd(16)} on ${bgs.join(", ").padEnd(48)} ${worst.toFixed(2)} (needs ${need})`);
  }
}
if (failed) {
  console.error(`${failed} pair(s) below threshold`);
  process.exit(1);
}

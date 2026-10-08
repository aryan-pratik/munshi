// pnpm seed: writes src/data/seed/world.json and prints a story report computed from records only.
// MUNSHI_DEMO_NOW (default 2026-10-08) is read here and nowhere else: meta.day0 = date - 89.
import { mkdirSync, writeFileSync } from "node:fs";
import { generateWorld } from "../src/data/seed/generate";
import { STORIES } from "../src/data/seed/stories";
import { analyze, dayIndex, defaultWindows, metricOnset, optimize, simulateBase, walkCausalGraph } from "../src/engine";
import { addDays, now } from "../src/engine/windows";
import { PLANT } from "../src/data/seed/stories";

const demoNow = process.env.MUNSHI_DEMO_NOW ?? "2026-10-08";
if (!/^\d{4}-\d{2}-\d{2}$/.test(demoNow)) throw new Error(`MUNSHI_DEMO_NOW must be YYYY-MM-DD, got ${demoNow}`);
const seed = Number(process.env.MUNSHI_SEED ?? 20261008);

const world = generateWorld({ seed, day0: addDays(demoNow, -89) });
const json = JSON.stringify(world);
mkdirSync("src/data/seed", { recursive: true });
writeFileSync("src/data/seed/world.json", json);

const kb = (json.length / 1024).toFixed(0);
console.log(`world.json: ${kb} KB (limit 1536), now = ${now(world)}, day0 = ${world.meta.day0}, seed ${seed}`);
const counts = Object.entries(world)
  .filter(([k, v]) => k !== "meta" && Array.isArray(v))
  .map(([k, v]) => `${k} ${(v as unknown[]).length}`)
  .join(", ");
console.log(counts);

let failed = 0;
for (const story of STORIES) {
  console.log(`\n${story.id}  ${story.title}`);
  for (const r of story.report(world)) {
    if (!r.ok) failed++;
    console.log(`  ${r.ok ? "ok  " : "FAIL"} ${r.label.padEnd(44)} ${r.value}`);
  }
}
// ---- engine columns: what the Phase 2 engine makes of the records ------------------------------
console.log("\nEngine");
const findings = analyze(world);
const chain = walkCausalGraph(world, "revenueD2C");
const base = simulateBase(world);
const top = optimize(world).top3[0];
for (const story of STORIES) {
  const e = story.expect;
  let value: string;
  let ok: boolean;
  if ("detector" in e) {
    const f = findings.find((x) => x.detector === e.detector);
    ok = !!f && f.impactINR >= e.minImpact;
    value = f ? `${f.detector} ${f.severity} ₹${f.impactINR.toLocaleString("en-IN")}${f.exposureINR ? ` (exposure ₹${f.exposureINR.toLocaleString("en-IN")})` : ""}` : `${e.detector} did not fire`;
  } else if ("chain" in e) {
    const nodes = chain.nodes.map((n) => n.metric);
    ok = JSON.stringify(nodes) === JSON.stringify(e.chain.nodes) && chain.branches.some((b) => b.nodes[0]?.metric === e.chain.branch);
    value = `${nodes.join(" → ")} | branch ${chain.branches.map((b) => b.nodes[0]?.metric).join(", ") || "none"}`;
  } else {
    ok = top.levers.hires === e.simulator.hires;
    value = `base profit ₹${Math.round(base.outcome.profit).toLocaleString("en-IN")}; top ${JSON.stringify(top.levers)} profit ₹${Math.round(top.profit).toLocaleString("en-IN")} (+${Math.round((top.profit / base.outcome.profit - 1) * 100)}%)`;
  }
  if (!ok) failed++;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${story.id.padEnd(4)} ${value}`);
}
// Planted day against the onset the engine detects, for the four stories with a day.
const { current } = defaultWindows(world);
const day = (iso: string | null) => (iso ? dayIndex(world, iso) : null);
const node = (m: string) => chain.nodes.find((n) => n.metric === m) ?? chain.branches.flatMap((b) => b.nodes).find((n) => n.metric === m);
const onsets: [string, number, number | null][] = [
  ["S2 adSpend", PLANT.s2.pauseDay, day(node("adSpend")?.onset ?? null)],
  ["S3 landingCvr", PLANT.s3.day, day(node("landingCvr")?.onset ?? null)],
  ["S5 deliveryDelayAvg", PLANT.s5.day, day(metricOnset(world, "deliveryDelayAvg", current).onset)],
  ["S7 costCreep", PLANT.s7.days[2], day(findings.find((f) => f.detector === "costCreep")?.onset ?? null)],
];
console.log("\nOnset: planted vs detected");
for (const [label, planted, detected] of onsets) {
  const ok = detected !== null && Math.abs(detected - planted) <= 1;
  if (!ok) failed++;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label.padEnd(22)} planted day ${planted}, detected ${detected === null ? "none" : `day ${detected}`}`);
}

if (json.length > 1.5 * 1024 * 1024) {
  console.error(`\nworld.json is over 1.5 MB`);
  process.exitCode = 1;
}
if (failed) {
  console.error(`\n${failed} story check(s) off target`);
  process.exitCode = 1;
}

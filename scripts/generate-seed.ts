// pnpm seed: writes src/data/seed/world.json and prints a story report computed from records only.
// MUNSHI_DEMO_NOW (default 2026-10-08) is read here and nowhere else: meta.day0 = date - 89.
import { mkdirSync, writeFileSync } from "node:fs";
import { generateWorld } from "../src/data/seed/generate";
import { STORIES } from "../src/data/seed/stories";
import { addDays, now } from "../src/engine/windows";

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
if (json.length > 1.5 * 1024 * 1024) {
  console.error(`\nworld.json is over 1.5 MB`);
  process.exitCode = 1;
}
if (failed) {
  console.error(`\n${failed} story check(s) off target`);
  process.exitCode = 1;
}

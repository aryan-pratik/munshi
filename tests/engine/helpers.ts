import { readFileSync } from "node:fs";
import { World } from "@/types";

let cached: World | null = null;
/** The committed seed, parsed once per test file. */
export function seed(): World {
  if (!cached) cached = World.parse(JSON.parse(readFileSync("src/data/seed/world.json", "utf8")));
  return cached;
}

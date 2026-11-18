// Works around a Next.js 16.4 static-export bug on Windows.
// Prefetch payloads should be flat files like `about/__next.about.__PAGE__.txt`, but on Windows the
// exporter builds the name from a backslash path, so it writes `about/__next.about/__PAGE__.txt`.
// The client then gets 404s while prefetching. This flattens those folders. No-op on Linux/macOS builds.
import { readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const out = "out";
let moved = 0;

function filesUnder(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? filesUnder(p) : [p];
  });
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (!statSync(p).isDirectory()) continue;
    if (name.startsWith("__next.")) {
      for (const file of filesUnder(p)) {
        renameSync(file, join(dir, `${name}.${relative(p, file).split(sep).join(".")}`));
        moved++;
      }
      rmSync(p, { recursive: true });
    } else if (name !== "_next") {
      walk(p);
    }
  }
}

walk(out);
if (moved) console.log(`fix-segment-files: flattened ${moved} prefetch payload(s) in ${out}/`);

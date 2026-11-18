// Copies the in-browser document tools into public/vendor/ so they are served from our own origin.
// Nothing is fetched from a CDN at runtime, so visitors' browsers only ever talk to this site.
// public/vendor/ is git-ignored and rebuilt from node_modules before dev and build.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkgDir = (name) => dirname(require.resolve(`${name}/package.json`));
const dest = join("public", "vendor");

const files = [
  // PDF.js: worker, plus character maps and standard fonts for PDFs that don't embed them.
  [join(pkgDir("pdfjs-dist"), "build", "pdf.worker.min.mjs"), join(dest, "pdfjs", "pdf.worker.min.mjs")],
  [join(pkgDir("pdfjs-dist"), "cmaps"), join(dest, "pdfjs", "cmaps")],
  [join(pkgDir("pdfjs-dist"), "standard_fonts"), join(dest, "pdfjs", "standard_fonts")],
  // WebAssembly image decoders (JBIG2, JPEG 2000: common in scanned PDFs) and colour profiles.
  [join(pkgDir("pdfjs-dist"), "wasm"), join(dest, "pdfjs", "wasm")],
  [join(pkgDir("pdfjs-dist"), "iccs"), join(dest, "pdfjs", "iccs")],
  // Tesseract.js: worker, LSTM-only cores (the device picks plain / SIMD / relaxed SIMD), English model.
  [join(pkgDir("tesseract.js"), "dist", "worker.min.js"), join(dest, "tesseract", "worker.min.js")],
  ...["tesseract-core-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js", "tesseract-core-relaxedsimd-lstm.wasm.js"].map(
    (f) => [join(pkgDir("tesseract.js-core"), f), join(dest, "tesseract", "core", f)],
  ),
  [join(pkgDir("@tesseract.js-data/eng"), "4.0.0_best_int", "eng.traineddata.gz"), join(dest, "tesseract", "lang", "eng.traineddata.gz")],
];

rmSync(dest, { recursive: true, force: true });
for (const [from, to] of files) {
  if (!existsSync(from)) throw new Error(`copy-vendor: missing ${from}`);
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true });
}
console.log(`copy-vendor: ${files.length} assets → ${dest}/`);

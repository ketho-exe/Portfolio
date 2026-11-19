// Minimal static server for the exported site (`out/`), used by Playwright.
// Mimics a static host: index.html for directories, trailing-slash redirects, 404.html with status 404,
// gzip for text, long caching for hashed assets (so Lighthouse numbers resemble production), and the
// security headers from vercel.json (so e2e tests run under the production CSP).
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { createGzip } from "node:zlib";

const root = resolve("out");
const port = Number(process.env.PORT ?? 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".wasm": "application/wasm",
  ".css": "text/css",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
};

// vercel.json `source` patterns here are simple enough to use as regular expressions.
const hostHeaders = JSON.parse(readFileSync("vercel.json", "utf8")).headers.map((rule) => ({
  test: new RegExp(`^${rule.source}$`),
  headers: Object.fromEntries(rule.headers.map((h) => [h.key.toLowerCase(), h.value])),
}));

const compressible = new Set([".html", ".js", ".mjs", ".css", ".json", ".txt", ".xml", ".svg", ".wasm"]);

function send(res, status, file, req) {
  const path = new URL(req?.url ?? "/", "http://localhost").pathname;
  const headers = { "content-type": types[extname(file)] ?? "application/octet-stream" };
  for (const rule of hostHeaders) if (rule.test.test(path)) Object.assign(headers, rule.headers);
  if (req?.url?.startsWith("/_next/static/")) headers["cache-control"] = "public, max-age=31536000, immutable";
  const gzip = compressible.has(extname(file)) && /gzip/.test(req?.headers["accept-encoding"] ?? "");
  if (gzip) headers["content-encoding"] = "gzip";
  res.writeHead(status, headers);
  const stream = createReadStream(file);
  (gzip ? stream.pipe(createGzip()) : stream).pipe(res);
}

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  let decoded;
  try {
    decoded = decodeURIComponent(url.pathname);
  } catch {
    return send(res, 404, join(root, "404.html"), req); // malformed escape, e.g. /%E0%A4%A/
  }
  const path = normalize(join(root, decoded));
  if (!path.startsWith(root)) return send(res, 404, join(root, "404.html"), req);

  if (existsSync(path) && statSync(path).isDirectory()) {
    if (!url.pathname.endsWith("/")) {
      res.writeHead(308, { location: `${url.pathname}/${url.search}` });
      return res.end();
    }
    const index = join(path, "index.html");
    return existsSync(index) ? send(res, 200, index, req) : send(res, 404, join(root, "404.html"), req);
  }
  if (existsSync(path)) return send(res, 200, path, req);
  send(res, 404, join(root, "404.html"), req);
}).listen(port, () => console.log(`Serving out/ on http://localhost:${port}`));

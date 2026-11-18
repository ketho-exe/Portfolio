// Minimal static server for the exported site (`out/`), used by Playwright.
// Mimics a static host: index.html for directories, trailing-slash redirects, 404.html with status 404,
// gzip for text, and long caching for hashed assets (so Lighthouse numbers resemble production).
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { createGzip } from "node:zlib";

const root = resolve("out");
const port = Number(process.env.PORT ?? 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
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

const compressible = new Set([".html", ".js", ".css", ".json", ".txt", ".xml", ".svg"]);

function send(res, status, file, req) {
  const headers = { "content-type": types[extname(file)] ?? "application/octet-stream" };
  if (req?.url?.startsWith("/_next/static/")) headers["cache-control"] = "public, max-age=31536000, immutable";
  const gzip = compressible.has(extname(file)) && /gzip/.test(req?.headers["accept-encoding"] ?? "");
  if (gzip) headers["content-encoding"] = "gzip";
  res.writeHead(status, headers);
  const stream = createReadStream(file);
  (gzip ? stream.pipe(createGzip()) : stream).pipe(res);
}

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const path = normalize(join(root, decodeURIComponent(url.pathname)));
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

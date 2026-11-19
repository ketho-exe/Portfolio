/**
 * Content-Security-Policy for the <meta> tag in layout.tsx (production only; dev needs eval and websockets).
 * connect-src 'self' means page scripts can only make requests to this site, so a visitor's document
 * can't be sent anywhere else. Inline scripts/styles are needed by Next's static export and React Flow.
 * vercel.json sends the same policy as a header, plus frame-ancestors (ignored in <meta>) and
 * 'wasm-unsafe-eval' for the OCR worker. csp.test.ts checks the two stay in step.
 */
export const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

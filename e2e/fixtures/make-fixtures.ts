import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Browser } from "@playwright/test";

/** Synthetic invoice, rendered by the browser into real files (no binaries in the repo). */
export const invoiceHtml = `<!doctype html><html><body style="font: 22px/1.5 Arial, sans-serif; padding: 48px; color: #111; background: #fff; width: 760px">
<h1 style="font-size: 34px; margin: 0 0 18px">INVOICE</h1>
<div>Supplier: Harbourline Stationery Ltd</div>
<div>Invoice number: INV-77120</div>
<div>Invoice date: 2026-04-14</div>
<div>Due date: 2026-05-14</div>
<br>
<div>Notebooks (20)      £64.00</div>
<div>Pens (5 boxes)      £31.50</div>
<div>Subtotal: £95.50</div>
<div>VAT (20%): £19.10</div>
<div>Total due: £114.60</div>
</body></html>`;

export const leakEml = [
  'From: "Jo Patel" <jo.patel@example.com>',
  "Subject: =?UTF-8?Q?Water_leak_=E2=80=93_kitchen?=",
  "Content-Type: text/plain; charset=utf-8",
  "",
  "Water is coming through the ceiling above the sink. Please send someone urgently.",
].join("\r\n");

/** Writes invoice.pdf (text layer), invoice.png, scan.pdf (image only) and leak.eml into `dir`. */
export async function makeFixtures(browser: Browser, dir: string) {
  mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 860, height: 640 } });
  await page.setContent(invoiceHtml);
  writeFileSync(join(dir, "invoice.pdf"), await page.pdf({ format: "A4" }));
  const png = await page.screenshot({ fullPage: true });
  writeFileSync(join(dir, "invoice.png"), png);
  await page.setContent(`<body style="margin:0"><img style="width:100%" src="data:image/png;base64,${png.toString("base64")}"></body>`);
  writeFileSync(join(dir, "scan.pdf"), await page.pdf({ format: "A4" }));
  await page.close();
  writeFileSync(join(dir, "leak.eml"), leakEml);
}

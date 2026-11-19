import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { csp } from "./csp";

const parse = (policy: string) =>
  new Map(
    policy
      .split(";")
      .map((d) => d.trim().split(/\s+/))
      .filter((d) => d[0])
      .map(([name, ...values]) => [name, values.sort()] as const),
  );

const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as { headers: { headers: { key: string; value: string }[] }[] };
const header = vercel.headers.flatMap((r) => r.headers).find((h) => h.key === "Content-Security-Policy")!.value;

describe("Content-Security-Policy", () => {
  it("the vercel.json header matches the <meta> policy, apart from its two allowed additions", () => {
    const meta = parse(csp);
    const host = parse(header);
    // Allowed: frame-ancestors (not valid in <meta>) and 'wasm-unsafe-eval' for the PDF.js/Tesseract workers.
    expect(host.get("frame-ancestors")).toEqual(["'none'"]);
    host.delete("frame-ancestors");
    host.set("script-src", host.get("script-src")!.filter((v) => v !== "'wasm-unsafe-eval'"));
    expect(Object.fromEntries(host)).toEqual(Object.fromEntries(meta));
  });

  it("only allows this site for requests", () => {
    expect(parse(csp).get("connect-src")).toEqual(["'self'"]);
  });
});

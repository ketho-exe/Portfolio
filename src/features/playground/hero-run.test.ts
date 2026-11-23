import { describe, expect, it } from "vitest";
import { formatDate, formatMoney, heroRun } from "./hero-run";

describe("home hero run card", () => {
  it("shows the real result of the Clear invoice sample", async () => {
    const run = await heroRun();
    expect(run.workflow).toBe("Invoice extraction");
    expect(run.fileName).toBe("brightline-inv-20431.pdf");
    expect(run.status).toBe("Ready for approval");
    expect(run.fields.map((f) => [f.label, f.value])).toEqual([
      ["Supplier", "Brightline Office Supplies Ltd"],
      ["Invoice no.", "INV-20431"],
      ["Invoice date", "4 Mar 2026"],
      ["Due date", "3 Apr 2026"],
      ["Net", "£281.40"],
      ["VAT", "£56.28"],
      ["Total", "£337.68"],
    ]);
    expect(run.fields[run.keyField].label).toBe("Total");
    for (const f of run.fields) expect(f.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("lists every step in run order, with the skipped review and the simulated text extraction labelled", async () => {
    const run = await heroRun();
    expect(run.steps.map((s) => s.id)).toEqual([
      "receive",
      "check-file",
      "extract-text",
      "extract-fields",
      "confident",
      "review",
      "schema",
      "queue",
      "result",
    ]);
    expect(run.steps.find((s) => s.id === "review")!.status).toBe("skipped");
    expect(run.steps.filter((s) => s.simulated).map((s) => s.id)).toEqual(["extract-text"]);
  });

  it("formats dates and money one way", () => {
    expect(formatDate("2026-12-01")).toBe("1 Dec 2026");
    expect(formatMoney(1234.5, "GBP")).toBe("£1,234.50");
    expect(formatMoney(9, "CHF")).toBe("CHF 9.00");
  });
});

import type { Adapter, Data } from "../engine";

/**
 * Simulated finance adapters for the expense approval demo.
 * Deterministic, offline, synthetic. They never contact Xero or any other service.
 */

const num = (v: unknown, fallback: number) => (typeof v === "number" ? v : fallback);

/** Stable short reference from a string (djb2). Same input → same reference, every run. */
export function simulatedReference(prefix: string, seed: string): string {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0;
  // Low bits: the high bits of djb2 barely change between similar seeds like TX-1 / TX-2.
  return `${prefix}-${h.toString(16).toUpperCase().padStart(8, "0").slice(-6)}`;
}

/**
 * A manager reviewing a transaction that fell outside the auto-approval policy.
 * Rules (params): receipts are required above `receiptRequiredOver`; amounts above
 * `approverLimit` must go to finance instead.
 */
export const approvalAdapter: Adapter = {
  id: "approval.request",
  label: "Manager approval (simulated)",
  simulated: true,
  run(input: Data, params: Data) {
    const amount = num(input.amount, 0);
    const limit = num(params.approverLimit, 1000);
    const receiptOver = num(params.receiptRequiredOver, 25);

    const reject = (reason: string) => ({
      ok: true as const,
      output: { ...input, approval: { status: "rejected", by: "Manager (simulated)", reason } },
      note: `Rejected: ${reason}`,
    });

    if (input.receiptAttached !== true && amount > receiptOver) return reject(`Receipt required above £${receiptOver}`);
    if (amount > limit) return reject(`Exceeds the £${limit} approver limit; needs finance sign-off`);

    return {
      ok: true,
      output: { ...input, approval: { status: "approved", by: "Manager (simulated)", reason: "Within approver limit" } },
      note: "Approved by manager",
    };
  },
};

/**
 * Posts an approved card transaction as a spend transaction, shaped like an accounting API response.
 * Rejects dates inside a locked period, the most common real-world failure for this kind of sync.
 */
export const accountingAdapter: Adapter = {
  id: "accounting.createSpendTransaction",
  label: "Accounting sync (simulated)",
  simulated: true,
  run(input: Data, params: Data) {
    const lockDate = typeof params.lockDate === "string" ? params.lockDate : "2026-01-01";
    const date = typeof input.date === "string" ? input.date : "";

    if (date < lockDate) {
      return {
        ok: false,
        error: `Accounting system rejected the transaction: ${date} is before the period lock date (${lockDate}).`,
      };
    }

    const reference = simulatedReference("SIM-SPEND", String(input.id));
    return {
      ok: true,
      output: {
        ...input,
        accounting: { reference, status: "AUTHORISED", accountCode: input.accountCode ?? null },
      },
      note: `Created ${reference}`,
    };
  },
};

export const financeAdapters = {
  [approvalAdapter.id]: approvalAdapter,
  [accountingAdapter.id]: accountingAdapter,
};

import type { Adapter, Data } from "../engine";
import { simulatedReference } from "./reference";

/**
 * Simulated helpdesk for the email routing demo. Deterministic and offline: it never sends
 * or receives email and never contacts a real ticketing system.
 */
export const helpdeskAdapter: Adapter = {
  id: "helpdesk.createTicket",
  label: "Helpdesk (simulated)",
  simulated: true,
  run(input: Data, params: Data) {
    const from = typeof input.from === "string" ? input.from : "";
    const domain = from.split("@")[1]?.toLowerCase() ?? "";
    const blocked = Array.isArray(params.blockedDomains) ? params.blockedDomains : [];

    if (blocked.includes(domain)) {
      return { ok: false, error: `Helpdesk rejected the message: ${domain} is on the blocked senders list.` };
    }

    const reference = simulatedReference("SIM-TKT", `${from}|${String(input.subject)}`);
    const ticket = typeof input.ticket === "object" && input.ticket !== null && !Array.isArray(input.ticket) ? input.ticket : {};
    return {
      ok: true,
      output: { ...input, ticket: { ...ticket, reference, queue: input.department ?? null, status: "Open" } },
      note: `Opened ${reference} in ${String(input.department)}`,
    };
  },
};

export const helpdeskAdapters = { [helpdeskAdapter.id]: helpdeskAdapter };

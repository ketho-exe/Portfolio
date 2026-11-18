import { expenseApproval } from "./expense-approval";
import type { PlaygroundWorkflow } from "./types";

export type { PlaygroundWorkflow, SampleInput } from "./types";

/** Workflows shown in the playground, in display order. */
export const workflows: PlaygroundWorkflow[] = [expenseApproval];

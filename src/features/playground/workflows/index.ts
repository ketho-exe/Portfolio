import { documentProcessing } from "./document-processing";
import { emailRouting } from "./email-routing";
import { expenseApproval } from "./expense-approval";
import type { PlaygroundWorkflow } from "./types";

export type { PlaygroundWorkflow, SampleInput } from "./types";

/** Workflows shown in the playground, in display order. */
export const workflows: PlaygroundWorkflow[] = [expenseApproval, emailRouting, documentProcessing];

import type { AdapterRegistry, Data, RunResult, WorkflowInput } from "../engine";

export type SampleInput = {
  id: string;
  label: string;
  description: string;
  input: Data;
  /** What this sample is meant to demonstrate. Asserted in tests so labels stay truthful. */
  expected: {
    status: RunResult["status"];
    /** Node that fails, when status is "failed". */
    failsAt?: string;
    /** Subset of the final output. */
    output?: Data;
  };
};

export type PlaygroundWorkflow = {
  definition: WorkflowInput;
  adapters: AdapterRegistry;
  samples: SampleInput[];
};

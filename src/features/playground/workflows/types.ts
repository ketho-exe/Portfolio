import type { AdapterRegistry, Data, RunResult, WorkflowInput } from "../engine";
import type { DocumentKind } from "../intake/limits";
import type { ReadProgress } from "../intake/read-document";

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

/** Lets visitors run the workflow on their own file. Everything happens on their device. */
export type UploadSupport = {
  kinds: DocumentKind[];
  /** Short prompt next to the file picker. */
  hint: string;
  /** Builds the run input from the file (read locally). Throws an Error with a visitor-facing message. */
  toInput(file: File): Promise<Data>;
  /** Adapters for runs on a real file, replacing the sample ones where needed. */
  adapters?(file: File, onProgress: ReadProgress): AdapterRegistry;
};

export type PlaygroundWorkflow = {
  definition: WorkflowInput;
  adapters: AdapterRegistry;
  samples: SampleInput[];
  upload?: UploadSupport;
};

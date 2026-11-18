import type { CSSProperties } from "react";

// Decorative hero motif hinting at the automation focus. Pure CSS animation (globals.css),
// disabled under prefers-reduced-motion. Hidden from assistive tech.
const steps = ["trigger", "validate", "decide", "sync", "done"];

export function PipelineMotif() {
  return (
    <div aria-hidden="true" className="flex items-center">
      {steps.map((step, i) => (
        <div key={step} className="flex flex-1 items-center last:flex-none">
          <span
            style={{ "--i": i } as CSSProperties}
            className="motif-node rounded-md border border-border bg-surface px-1.5 py-1 font-mono text-[10px] text-muted sm:px-3 sm:py-1.5 sm:text-xs"
          >
            {step}
          </span>
          {i < steps.length - 1 && (
            <span
              style={{ "--i": i } as CSSProperties}
              className="motif-wire relative mx-0.5 h-px min-w-2 flex-1 overflow-hidden bg-border sm:mx-2"
            />
          )}
        </div>
      ))}
    </div>
  );
}

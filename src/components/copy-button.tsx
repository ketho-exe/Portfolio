"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";

/** Copies `text` to the clipboard and announces the result. */
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      // Clipboard can be blocked; the message tells the visitor to select the text instead.
    }
    setState(ok ? "copied" : "failed");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2500);
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border-strong px-4 text-sm font-semibold transition-colors hover:bg-surface-2"
      >
        <Icon name={state === "copied" ? "check" : "copy"} size={16} />
        {state === "copied" ? "Copied" : label}
      </button>
      <span role="status" className="min-w-px font-mono text-xs text-ok">
        {state === "copied" ? "Address copied to clipboard" : state === "failed" ? "Couldn't copy. Select the address instead." : ""}
      </span>
    </>
  );
}

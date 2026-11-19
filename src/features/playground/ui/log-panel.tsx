"use client";

import { useEffect, useRef } from "react";
import type { RunResult } from "../engine";

/** Execution log, newest entry kept in view. */
export function LogPanel({ events }: { events: RunResult["events"] }) {
  const list = useRef<HTMLOListElement>(null);
  // Keep the newest entry visible by scrolling the panel itself, never the page.
  useEffect(() => {
    const box = list.current?.parentElement;
    if (box) box.scrollTop = box.scrollHeight;
  }, [events.length]);

  if (!events.length) return <p className="text-xs text-muted">Run the workflow to see the execution log.</p>;
  const tone = { info: "text-soft", success: "text-ok", error: "text-danger", skip: "text-muted", wait: "text-accent" };
  return (
    <ol ref={list} className="space-y-1.5 font-mono text-xs">
      {events.map((e) => (
        <li key={e.seq} className={`flex gap-3 ${tone[e.level]}`}>
          <span className="w-6 shrink-0 text-right opacity-60">{e.seq + 1}</span>
          <span className="text-pretty">{e.message}</span>
        </li>
      ))}
    </ol>
  );
}

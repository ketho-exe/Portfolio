"use client";

import { useId, useState } from "react";
import { Icon } from "./icons";

const SHOW = 4;

/** A role's bullet points: the first four, with a toggle for the rest. */
export function RolePoints({ points }: { points: string[] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const more = points.length - SHOW;
  return (
    <>
      <ul id={id} className="mt-[22px] flex flex-col gap-3 text-[15px] leading-normal text-soft">
        {(open ? points : points.slice(0, SHOW)).map((p) => (
          <li key={p} className="grid grid-cols-[14px_1fr] gap-2.5">
            <span aria-hidden="true" className="mt-[9px] size-1.5 rounded-full bg-accent" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      {more > 0 && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(!open)}
          className="mt-5 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border-strong px-[18px] text-[15px] font-semibold transition-colors hover:bg-surface-2"
        >
          {open ? "Show fewer" : `Show ${more} more`}
          <Icon name="chevronDown" size={16} className={`transition-transform duration-250 ${open ? "rotate-180" : ""}`} />
        </button>
      )}
    </>
  );
}

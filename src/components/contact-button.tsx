"use client";

import { useEffect, useRef, useState } from "react";
import { site } from "@/content/site";
import { Icon, type IconName } from "./icons";

type Item = { label: string; href: string; icon: IconName; external: boolean };
/** "hover": a mouse is over it (preview). "pinned": opened by click, tap or keyboard; stays until closed. */
type Mode = "hover" | "pinned" | null;

/**
 * Floating contact button with a small menu of email, LinkedIn and GitHub. Desktop only: below 768px the tab bar
 * already has Contact, and the button would cover content.
 * Open state lives in React, not CSS :hover/:focus-within, because touch browsers keep those
 * "stuck" after a tap, which made the menu impossible to close on phones.
 */
export function ContactButton() {
  const [mode, setMode] = useState<Mode>(null);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const open = mode !== null;

  // Tap or click anywhere else closes it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Element;
      if (!root.current?.contains(target) || !target.closest("a, button")) setMode(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const items = [
    site.email && { label: "Email", href: `mailto:${site.email}`, icon: "mail", external: false },
    site.linkedin && { label: "LinkedIn", href: site.linkedin, icon: "linkedin", external: true },
    site.github && { label: "GitHub", href: site.github, icon: "github", external: true },
  ].filter(Boolean) as Item[];

  if (!items.length) return null;
  return (
    <div
      ref={root}
      className={`fab fixed right-8 bottom-8 z-30 hidden md:block ${open ? "open" : ""}`}
      onPointerEnter={(e) => e.pointerType === "mouse" && !mode && setMode("hover")}
      onPointerLeave={(e) => e.pointerType === "mouse" && mode === "hover" && setMode(null)}
      onBlur={(e) => {
        if (!root.current?.contains(e.relatedTarget as Node | null)) setMode((m) => (m === "pinned" ? null : m));
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setMode(null);
          button.current?.focus();
        }
      }}
    >
      {/* The padding below the list belongs to the menu, so the pointer can cross from button to links. */}
      <div className="fab-menu absolute right-0 bottom-full pb-2">
        {/* inert while closed, so the hidden links can't be tabbed to or tapped. */}
        <ul id="contact-links" aria-label="Contact links" inert={!open} className="chrome w-44 rounded-panel p-1">
          {items.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                onClick={() => setMode(null)}
                className="flex min-h-11 items-center gap-3 rounded-chip px-3 text-sm text-soft transition-colors hover:bg-white/8 hover:text-fg focus-visible:bg-white/8 focus-visible:text-fg"
                {...(item.external && { target: "_blank", rel: "noopener noreferrer" })}
              >
                <Icon name={item.icon} size={16} strokeWidth={1.5} />
                {item.label}
                {item.external && <span className="sr-only"> (opens in a new tab)</span>}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <button
        ref={button}
        type="button"
        aria-label="Contact me"
        aria-expanded={open}
        aria-controls="contact-links"
        onClick={() => setMode(mode === "pinned" ? null : "pinned")}
        className="tap flex size-14 cursor-pointer items-center justify-center rounded-panel border border-border-strong bg-surface-solid text-fg hover:bg-[#1c1d21]"
      >
        <Icon name={mode === "pinned" ? "close" : "chat"} size={20} strokeWidth={1.5} />
      </button>
    </div>
  );
}

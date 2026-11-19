"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { site } from "@/content/site";
import { Icon, type IconName } from "./icons";

type Item = { label: string; href: string; icon: IconName; external: boolean };
/** "hover": a mouse is over it (preview). "pinned": opened by click, tap or keyboard; stays until closed. */
type Mode = "hover" | "pinned" | null;

/**
 * Floating contact button that fans out email, LinkedIn and GitHub. Desktop only: below 768px the tab bar
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
    site.github && { label: "GitHub", href: site.github, icon: "github", external: true },
    site.linkedin && { label: "LinkedIn", href: site.linkedin, icon: "linkedin", external: true },
    site.email && { label: "Email", href: `mailto:${site.email}`, icon: "mail", external: false },
  ].filter(Boolean) as Item[];
  // Positions along a quarter circle, up and to the left of the button.
  const spots = [
    ["-96px", "0px"],
    ["-68px", "-68px"],
    ["0px", "-96px"],
  ];

  if (!items.length) return null;
  return (
    <div
      ref={root}
      className={`fab fixed right-8 bottom-8 z-30 hidden size-16 md:block ${open ? "open" : ""} ${mode === "pinned" ? "pinned" : ""}`}
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
      <span className="fab-hit" aria-hidden="true" />
      <span className="fab-ring" aria-hidden="true">
        <span className="loop" />
      </span>
      <button
        ref={button}
        type="button"
        aria-label="Contact me"
        aria-expanded={open}
        aria-controls="contact-links"
        onClick={() => setMode(mode === "pinned" ? null : "pinned")}
        className="relative z-[2] size-16 cursor-pointer rounded-full border border-white/35 bg-accent text-accent-fg shadow-[0_12px_32px_rgb(255_210_63/0.3)] transition-transform duration-300 ease-(--spring) hover:scale-[1.07]"
      >
        <Icon name="chat" size={26} className="fab-icon-swap fab-chat" />
        <Icon name="close" size={24} strokeWidth={2.4} className="fab-icon-swap fab-close" />
      </button>
      {/* inert while closed, so the hidden links can't be tabbed to or tapped. */}
      <ul id="contact-links" aria-label="Contact links" inert={!open}>
        {items.map((item, i) => (
          <li key={item.label} className="fab-item" style={{ "--i": i, "--x": spots[i][0], "--y": spots[i][1] } as CSSProperties}>
            <span className="fab-float loop" style={{ "--i": i } as CSSProperties}>
              <a
                href={item.href}
                aria-label={item.external ? `${item.label} (opens in a new tab)` : item.label}
                onClick={() => setMode(null)}
                className="fab-link glass relative flex size-[52px] items-center justify-center rounded-full"
                {...(item.external && { target: "_blank", rel: "noopener noreferrer" })}
              >
                <Icon name={item.icon} size={22} />
                <span className="fab-tip" aria-hidden="true">
                  {item.label}
                </span>
              </a>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

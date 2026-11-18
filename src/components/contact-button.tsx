"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { site } from "@/content/site";
import { Icon, type IconName } from "./icons";

type Item = { label: string; href: string; icon: IconName; external: boolean };

/** Floating contact button. Hover, focus or tap fans out email, LinkedIn and GitHub. Escape closes it. */
export function ContactButton() {
  const [open, setOpen] = useState(false);
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
      className={`fab fixed right-5 bottom-[100px] z-30 size-16 min-[900px]:right-8 min-[900px]:bottom-8 ${open ? "open" : ""}`}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) setOpen(false);
      }}
    >
      <span className="fab-hit" aria-hidden="true" />
      <span className="fab-ring" aria-hidden="true">
        <span className="loop" />
      </span>
      <button
        type="button"
        aria-label="Contact me"
        aria-expanded={open}
        aria-controls="contact-links"
        onClick={() => setOpen(!open)}
        className="relative z-[2] size-16 cursor-pointer rounded-full border border-white/35 bg-accent text-accent-fg shadow-[0_12px_32px_rgb(255_210_63/0.3)] transition-transform duration-300 ease-(--spring) hover:scale-[1.07]"
      >
        <Icon name="chat" size={26} className="fab-icon-swap fab-chat" />
        <Icon name="close" size={24} strokeWidth={2.4} className="fab-icon-swap fab-close" />
      </button>
      <ul id="contact-links" aria-label="Contact links">
        {items.map((item, i) => (
          <li key={item.label} className="fab-item" style={{ "--i": i, "--x": spots[i][0], "--y": spots[i][1] } as CSSProperties}>
            <span className="fab-float loop" style={{ "--i": i } as CSSProperties}>
              <a
                href={item.href}
                aria-label={item.external ? `${item.label} (opens in a new tab)` : item.label}
                className="fab-link glass relative flex size-[52px] items-center justify-center rounded-full transition hover:scale-[1.12] hover:bg-accent hover:text-accent-fg focus-visible:bg-accent focus-visible:text-accent-fg"
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

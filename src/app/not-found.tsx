import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { MissingPath } from "@/components/missing-path";

export const metadata: Metadata = { title: "Page not found" };

const routes = [
  ["Home", "/", "Start here: what I do and recent work"],
  ["Work", "/projects/", "Every project, labelled honestly"],
  ["Playground", "/playground/", "Run a workflow in your browser"],
  ["About", "/about/", "Experience, skills and approach"],
  ["Contact", "/contact/", "Email, LinkedIn, GitHub and CV"],
];

const row = "grid grid-cols-[64px_minmax(0,1fr)] items-center gap-x-4 gap-y-1 border-t border-border px-[18px] py-3 sm:min-h-16 sm:grid-cols-[96px_minmax(0,1fr)_140px] sm:px-6 sm:py-0";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[1080px] px-4 pt-16 pb-24 sm:px-6 sm:pt-[72px]">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
        <div>
          <p className="font-mono text-xs tracking-[0.08em] text-danger">ERROR 404</p>
          <h1 className="mt-3 font-serif text-display-1 leading-[0.92]">
            This page has been cancelled.
          </h1>
        </div>
        <p className="max-w-[360px] text-[17px] leading-normal text-soft">
          The link may be old or mistyped. Every other route is running on time.
        </p>
      </div>

      <nav
        aria-label="Pages on this site"
        className="mt-11 overflow-hidden rounded-card board border border-border"
      >
        <div aria-hidden="true" className={`${row} min-h-12 border-t-0 font-mono text-[11px] tracking-[0.08em] text-muted max-sm:hidden`}>
          <span>PLATFORM</span>
          <span>DESTINATION</span>
          <span>STATUS</span>
        </div>
        <div className={`${row} bg-danger-soft`}>
          <span className="font-mono">
            <span className="flap">404</span>
          </span>
          <span className="text-xl font-semibold text-soft line-through decoration-danger [overflow-wrap:anywhere]">
            <MissingPath />
          </span>
          <span className="col-start-2 font-mono text-[13px] font-bold text-danger sm:col-start-auto">CANCELLED</span>
        </div>
        {routes.map(([label, href, desc], i) => (
          <Link
            key={href}
            href={href}
            prefetch={href === "/playground/" ? false : undefined}
            className={`${row} group hover:bg-accent-wash`}
          >
            <span aria-hidden="true" className="font-mono">
              <span className="flap" style={{ "--d": i + 1 } as CSSProperties}>
                {String(i + 1).padStart(2, "0")}
              </span>
            </span>
            <span>
              <span className="text-xl font-semibold transition-colors group-hover:text-accent">
                {label === "Home" ? "Back to home" : label}
              </span>
              <span className="mt-0.5 block text-sm text-soft">{desc}</span>
            </span>
            <span aria-hidden="true" className="col-start-2 font-mono text-[13px] font-bold text-ok sm:col-start-auto">
              ON TIME →
            </span>
          </Link>
        ))}
      </nav>
      <p className="mx-1 mt-4 font-mono text-xs text-muted">
        Think this link should work?{" "}
        <Link href="/contact/" className="text-accent underline underline-offset-4">
          Let me know
        </Link>
        .
      </p>
    </div>
  );
}

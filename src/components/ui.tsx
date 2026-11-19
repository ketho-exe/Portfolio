import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/** Page width: 1200px content (wide = 1320px for the playground and contact), 24px gutters. */
export function Container({ className = "", wide = false, ...props }: ComponentProps<"div"> & { wide?: boolean }) {
  return <div className={`mx-auto w-full ${wide ? "max-w-[1320px]" : "max-w-[1200px]"} px-4 sm:px-6 ${className}`} {...props} />;
}

type Variant = "primary" | "glass" | "ghost";

export function buttonClass(variant: Variant = "primary", className = "") {
  const styles = {
    primary: "bg-accent text-accent-fg font-bold",
    glass: "glass text-fg font-semibold",
    ghost: "border border-border-strong text-fg font-semibold hover:bg-surface-2",
  }[variant];
  return `tap inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-base ${styles} ${className}`;
}

/** For in-site routes. */
export function ButtonLink({ variant = "primary", className = "", ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

/** For files, mailto: and external URLs, which shouldn't go through client-side routing. */
export function ButtonAnchor({ variant = "primary", className = "", ...props }: ComponentProps<"a"> & { variant?: Variant }) {
  return <a className={buttonClass(variant, className)} {...props} />;
}

/** Small mono pill. */
export function Tag({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full bg-surface-2 px-2.5 py-1 font-mono text-[11px] text-soft ${className}`}>
      {children}
    </span>
  );
}

/** Mono label above headings. */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`font-mono text-xs tracking-[0.08em] text-accent uppercase ${className}`}>{children}</p>;
}

export function SectionHeading({
  eyebrow,
  title,
  id,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  id?: string;
  children?: ReactNode;
}) {
  return (
    <div className="max-w-3xl">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 id={id} className="mt-2.5 font-serif text-display-3 leading-none text-balance">
        {title}
      </h2>
      {children && <p className="mt-4 text-base leading-relaxed text-soft text-pretty">{children}</p>}
    </div>
  );
}

/** Note with an icon, for honesty labels ("simulated", "confidential", ...). */
export function Note({ icon, children, className = "" }: { icon: ReactNode; children: ReactNode; className?: string }) {
  return (
    <p role="note" className={`glass flex items-start gap-3.5 rounded-panel px-5 py-4 text-[15px] leading-relaxed text-soft ${className}`}>
      <span className="mt-0.5 shrink-0 text-accent">{icon}</span>
      <span>{children}</span>
    </p>
  );
}

/**
 * Visible marker for content the owner has not supplied yet.
 * Search the codebase for <Placeholder to find every gap before launch.
 */
export function Placeholder({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-panel border-2 border-dashed border-border-strong px-4 py-3 font-mono text-xs text-muted">
      <span className="text-accent">placeholder</span> · {children}
    </div>
  );
}

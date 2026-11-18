import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function Container({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`mx-auto w-full max-w-5xl px-4 sm:px-6 ${className}`} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: "primary" | "secondary" };

export function ButtonLink({ variant = "primary", className = "", ...props }: ButtonLinkProps) {
  const styles =
    variant === "primary"
      ? "bg-accent text-accent-fg hover:opacity-90"
      : "border border-border text-fg hover:border-muted hover:bg-surface";
  return (
    <Link
      className={`inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium transition ${styles} ${className}`}
      {...props}
    />
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border px-2 py-0.5 font-mono text-xs text-muted">
      {children}
    </span>
  );
}

/** Small mono label used above headings. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-mono text-xs tracking-wider text-accent uppercase">{children}</p>;
}

export function SectionHeading({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="max-w-2xl">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{title}</h2>
      {children && <p className="mt-3 text-muted text-pretty">{children}</p>}
    </div>
  );
}

/**
 * Visible marker for content the owner has not supplied yet.
 * Search the codebase for <Placeholder to find every gap before launch.
 */
export function Placeholder({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-muted/60 px-4 py-3 font-mono text-xs text-muted">
      <span className="text-accent">placeholder</span> · {children}
    </div>
  );
}

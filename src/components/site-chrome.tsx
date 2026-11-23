import Link from "next/link";
import { nav, site } from "@/content/site";
import { MotionSwitch } from "./motion-switch";
import { NavLinks, TabLinks } from "./nav-links";

const initials = site.name
  .split(" ")
  .map((w) => w[0])
  .join("");

export function SiteHeader() {
  return (
    <header id="top" className="sticky top-0 z-20 px-4 pt-3 sm:px-6">
      <div className="chrome relative mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-3 rounded-card pr-2 pl-3">
        {/* Accessible name "Szymon Klejny, home" contains the visible name (WCAG 2.5.3). */}
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-control border border-border-strong font-serif text-xl text-fg"
          >
            {initials}
          </span>
          <span className="truncate font-medium">{site.name}</span>
          <span className="sr-only">, home</span>
        </Link>
        <nav aria-label="Main" className="hidden md:block">
          <NavLinks />
        </nav>
        <MotionSwitch />
      </div>
    </header>
  );
}

/** Below 768px the header nav is replaced by this bottom tab bar. */
export function TabBar() {
  return (
    <nav aria-label="Sections" className="sticky bottom-4 z-20 flex justify-center px-2 pb-4 min-[360px]:px-3 md:hidden">
      <TabLinks />
    </nav>
  );
}

export function SiteFooter() {
  const external = [
    site.email && { label: "Email", href: `mailto:${site.email}`, external: false },
    site.linkedin && { label: "LinkedIn", href: site.linkedin, external: true },
    site.github && { label: "GitHub", href: site.github, external: true },
  ].filter((x): x is { label: string; href: string; external: boolean } => Boolean(x));

  // Build-time year: every deploy rebuilds the site, and a client-side year would cost a hydration
  // workaround for a footer detail.
  const year = new Date().getFullYear();

  return (
    <footer className="relative mx-auto mt-8 w-full max-w-[1200px] px-4 pb-12 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-6 border-t border-border pt-8">
        <div>
          <p className="font-serif text-display-6 leading-tight">{site.name}</p>
          <p className="mt-2 font-mono text-xs text-muted">Static site · no tracking · © {year}</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-1 text-base text-soft">
          <Link href="/" className="inline-flex min-h-11 items-center hover:text-fg">
            Home
          </Link>
          {nav.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              prefetch={href === "/playground/" ? false : undefined}
              className="inline-flex min-h-11 items-center hover:text-fg"
            >
              {label}
            </Link>
          ))}
          {external.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="inline-flex min-h-11 items-center hover:text-fg"
              {...(l.external && { target: "_blank", rel: "noopener noreferrer" })}
            >
              {l.label}
              {l.external && <span className="sr-only"> (opens in a new tab)</span>}
            </a>
          ))}
        </nav>
        <a href="#top" className="inline-flex min-h-11 items-center font-mono text-sm text-muted hover:text-fg">
          Back to top ↑
        </a>
      </div>
    </footer>
  );
}

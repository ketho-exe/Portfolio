import Link from "next/link";
import { site } from "@/content/site";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";
import { Container } from "./ui";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-bg/80 backdrop-blur">
      <Container className="flex h-14 items-center justify-between gap-2">
        <Link
          href="/"
          aria-label={`${site.name}, home`}
          className="flex shrink-0 items-center gap-2 font-medium tracking-tight whitespace-nowrap"
        >
          <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
          {/* Monogram on phones so four nav links fit at 375px. */}
          <span aria-hidden="true" className="sm:hidden">
            {site.name
              .split(" ")
              .map((w) => w[0])
              .join("")}
          </span>
          <span aria-hidden="true" className="hidden sm:inline">
            {site.name}
          </span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1">
          <NavLinks />
          <ThemeToggle />
        </nav>
      </Container>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60">
      <Container className="flex flex-col gap-2 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          {site.name} · {site.role}
        </p>
        <p className="font-mono text-xs">Built with Next.js · statically rendered</p>
      </Container>
    </footer>
  );
}

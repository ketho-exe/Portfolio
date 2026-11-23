"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { nav } from "@/content/site";
import { Icon, type IconName } from "./icons";

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(href);

/** Desktop navigation (768px and up). */
export function NavLinks() {
  const pathname = usePathname();
  return (
    <ul className="flex items-center gap-1 text-base">
      {nav.map(({ href, label }) => {
        const active = isActive(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              // The playground bundle (React Flow, Zod) is large; don't prefetch it from every page.
              prefetch={href === "/playground/" ? false : undefined}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-10 items-center rounded-control px-4 transition-colors ${
                active ? "bg-white/8 text-fg shadow-[inset_0_0_0_1px_var(--border)]" : "text-soft hover:bg-surface-2 hover:text-fg"
              }`}
            >
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

const tabs: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Home", icon: "home" },
  ...nav.map(({ href, label }) => ({
    href,
    label,
    icon: ({ Work: "work", Playground: "play", About: "about", Contact: "contact" } as const)[label],
  })),
];

/** Phone navigation (below 768px): a floating tab bar. */
export function TabLinks() {
  const pathname = usePathname();
  return (
    <ul className="chrome flex gap-0.5 rounded-card p-1.5 min-[360px]:[&_a]:min-w-15">
      {tabs.map(({ href, label, icon }) => {
        const active = href === "/" ? pathname === "/" : isActive(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              prefetch={href === "/playground/" ? false : undefined}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-12 min-w-14 flex-col items-center justify-center gap-1 rounded-panel text-xs font-medium ${
                active ? "bg-white/8 text-fg" : "text-muted"
              }`}
            >
              <Icon name={icon} size={18} strokeWidth={1.5} />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

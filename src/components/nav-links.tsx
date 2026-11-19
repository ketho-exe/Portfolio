"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { nav } from "@/content/site";
import { Icon, type IconName } from "./icons";

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(href);

/** Desktop navigation (900px and up). */
export function NavLinks() {
  const pathname = usePathname();
  return (
    <ul className="flex items-center gap-0.5 text-[15px] font-medium">
      {nav.map(({ href, label }) => {
        const active = isActive(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              // The playground bundle (React Flow, Zod) is large; don't prefetch it from every page.
              prefetch={href === "/playground/" ? false : undefined}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full px-4 transition-colors ${
                active ? "bg-accent text-accent-fg" : "text-soft hover:bg-surface-2 hover:text-fg"
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

/** Phone and tablet navigation (below 900px): a floating tab bar. */
export function TabLinks() {
  const pathname = usePathname();
  return (
    <ul className="glass flex gap-0.5 rounded-full p-1.5 min-[360px]:[&_a]:min-w-[62px]">
      {tabs.map(({ href, label, icon }) => {
        const active = href === "/" ? pathname === "/" : isActive(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              prefetch={href === "/playground/" ? false : undefined}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[52px] min-w-14 flex-col items-center justify-center gap-[3px] rounded-full text-[11px] font-semibold ${
                active ? "bg-[rgb(255_210_63/0.18)] text-accent" : "text-soft"
              }`}
            >
              <Icon name={icon} size={22} />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

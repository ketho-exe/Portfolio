"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { nav } from "@/content/site";

export function NavLinks() {
  const pathname = usePathname();
  return (
    <ul className="flex items-center text-sm sm:gap-1">
      {nav.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(href);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-2 py-1.5 sm:px-3 transition hover:text-fg ${active ? "text-fg" : "text-muted"}`}
            >
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

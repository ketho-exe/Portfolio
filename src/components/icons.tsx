import type { SVGProps } from "react";

// Stroke icons (24px grid). Decorative: always aria-hidden.
const paths = {
  home: "M3 11 12 4l9 7M5 10v10h14V10",
  work: "M4 8h16v12H4zM9 8V5h6v3",
  play: "M7 4.5v15l13-7.5z",
  about: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  contact: "M3 6h18v12H3zM3 7l9 6 9-6",
  mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm18 3-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7",
  linkedin: "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4z",
  github:
    "M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4M9 18c-4.51 2-5-2-7-2",
  download: "M12 4v12M7 11l5 5 5-5M5 20h14",
  arrowRight: "M5 12h14m-6-6 6 6-6 6",
  arrowUpRight: "M7 17 17 7M8 7h9v9",
  chevronRight: "m9 5 7 7-7 7",
  chevronDown: "m6 9 6 6 6-6",
  chat: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z",
  close: "M6 6l12 12M18 6 6 18",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1",
  check: "M5 12l5 5L20 7",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7z",
  lock: "M6 10h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zm2 0V7a4 4 0 0 1 8 0v3",
  info: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zm0 5v5m0 3.5v.5",
  upload: "M12 16V4M7 9l5-5 5 5M5 20h14",
  building: "M3 21h18M5 21V8l7-5 7 5v13M10 21v-6h4v6",
  scan: "M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3M8 12h8",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  invoice: "M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7",
  flow: "M5 6h4v4H5zM15 14h4v4h-4zM9 8h3a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2",
  chart: "M4 20V10M10 20V4M16 20v-7M2 20h20",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
} as const;

export type IconName = keyof typeof paths;

export function Icon({
  name,
  size = 20,
  strokeWidth = 2,
  ...props
}: { name: IconName; size?: number; strokeWidth?: number } & Omit<SVGProps<SVGSVGElement>, "name">) {
  const filled = name === "play";
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}

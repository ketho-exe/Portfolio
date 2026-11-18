import type { Project } from "@/content/projects";

/** Delivered = yellow, in progress / live = green, planned = hollow ring. */
export function StatusDot({ status }: { status: Project["status"] }) {
  const style =
    status === "Delivered"
      ? "bg-accent"
      : status === "Planned"
        ? "border-[1.5px] border-[rgb(235_235_245/0.7)]"
        : "bg-ok";
  return <span aria-hidden="true" className={`inline-block size-[9px] shrink-0 rounded-full ${style}`} />;
}

export const statusMeaning: [Project["status"], string][] = [
  ["Delivered", "in use at an employer, anonymised"],
  ["In progress", "live and still growing"],
  ["Planned", "describes intent only"],
];

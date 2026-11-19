import type { Project } from "@/content/projects";

/** Delivered = yellow, live / in progress = green. */
export function StatusDot({ status }: { status: Project["status"] }) {
  const style = status === "Delivered" ? "bg-accent" : "bg-ok";
  return <span aria-hidden="true" className={`inline-block size-[9px] shrink-0 rounded-full ${style}`} />;
}

export const statusMeaning: [Project["status"], string][] = [
  ["Delivered", "in use at an employer, anonymised"],
  ["Live", "public and running on this site"],
];

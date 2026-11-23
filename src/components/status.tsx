import type { Project } from "@/content/projects";

/** Delivered = neutral, live / in progress = green (it is running). */
export function StatusDot({ status }: { status: Project["status"] }) {
  const style = status === "Delivered" ? "bg-soft" : "bg-ok";
  return <span aria-hidden="true" className={`inline-block size-2 shrink-0 rounded-full ${style}`} />;
}

export const statusMeaning: [Project["status"], string][] = [
  ["Delivered", "in use at an employer, anonymised"],
  ["Live", "public and running on this site"],
];

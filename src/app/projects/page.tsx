import type { Metadata } from "next";
import { ProjectCard } from "@/components/project-card";
import { Container, Eyebrow } from "@/components/ui";
import { projects } from "@/content/projects";

export const metadata: Metadata = {
  title: "Projects",
  description: "Web applications, automation workflows and integrations, each with a case study.",
};

export default function ProjectsPage() {
  return (
    <Container className="pt-16 sm:pt-24">
      <Eyebrow>Work</Eyebrow>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Projects</h1>
      <p className="mt-4 max-w-2xl text-muted text-pretty">
        Each project is labelled as professional work, a personal project or a recreated demonstration, and shows its
        current status. Demonstrations use synthetic data only.
      </p>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <ProjectCard key={p.slug} project={p} />
        ))}
      </div>
    </Container>
  );
}

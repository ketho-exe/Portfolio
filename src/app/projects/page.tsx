import type { Metadata } from "next";
import { ProjectCard } from "@/components/project-card";
import { Container, Eyebrow, SectionHeading } from "@/components/ui";
import { projects } from "@/content/projects";

export const metadata: Metadata = {
  title: "Projects",
  description: "Professional automation, integration and web application work, plus personal projects in development.",
};

export default function ProjectsPage() {
  const professional = projects.filter((p) => p.kind === "Professional work");
  const personal = projects.filter((p) => p.kind !== "Professional work");

  return (
    <Container className="pt-16 sm:pt-24">
      <Eyebrow>Work</Eyebrow>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Projects</h1>
      <p className="mt-4 max-w-2xl text-muted text-pretty">
        Professional work is described with confidential details removed. Personal projects and recreations use
        synthetic data only.
      </p>

      <section className="mt-14">
        <SectionHeading eyebrow="Professional work" title="Delivered for employers" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {professional.map((p) => (
            <ProjectCard key={p.slug} project={p} />
          ))}
        </div>
      </section>

      <section className="mt-20">
        <SectionHeading eyebrow="Personal projects" title="In development">
          Planned public demonstrations, including anonymised recreations of professional workflows.
        </SectionHeading>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {personal.map((p) => (
            <ProjectCard key={p.slug} project={p} />
          ))}
        </div>
      </section>
    </Container>
  );
}

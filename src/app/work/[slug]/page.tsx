import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Lock, Play } from "lucide-react";
import { getNextProject, getProject, otherWork, projects } from "@/data/projects";
import { CaseStudyDemo } from "@/components/work/CaseStudyDemo";
import { MediaReveal } from "@/components/work/MediaReveal";
import { NextProject } from "@/components/work/NextProject";
import { ProjectImage } from "@/components/work/ProjectImage";
import { Reveal, SplitReveal } from "@/components/animations/Reveal";
import { TransitionLink } from "@/components/transition/TransitionLink";
import { GitHubIcon } from "@/components/ui/BrandIcons";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};
  return {
    title: `${project.title} case study`,
    description: `${project.kind}. ${project.tagline}`,
    alternates: { canonical: `/work/${project.slug}` },
    openGraph: { title: `${project.title} — case study`, description: project.tagline, url: `/work/${project.slug}` },
  };
}

/** A numbered content block: Sora heading on the left, glass card body on the right (desktop). */
function Block({ index, title, children }: { index: string; title: string; children: ReactNode }) {
  return (
    <section className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-12 md:gap-10">
      <div className="md:col-span-4 lg:col-span-3">
        <p className="kicker text-lilac!">{index}</p>
        <SplitReveal as="h2" className="mt-2 font-display text-2xl font-bold tracking-tight text-ink md:text-[1.75rem]">
          {title}
        </SplitReveal>
      </div>
      <Reveal className="md:col-span-8 lg:col-span-9">{children}</Reveal>
    </section>
  );
}

/**
 * `params` is read inside a Suspense boundary so a navigation can paint the page shell
 * immediately (Cache Components "instant" navigation) instead of blocking on URL data.
 */
export default function CaseStudyPage({ params }: PageProps<"/work/[slug]">) {
  return (
    <Suspense fallback={<div aria-hidden className="night-sky min-h-svh" />}>
      <CaseStudy params={params} />
    </Suspense>
  );
}

async function CaseStudy({ params }: { params: PageProps<"/work/[slug]">["params"] }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();
  const next = getNextProject(project.slug);
  const number = projects.findIndex((p) => p.slug === project.slug) + 1;

  return (
    <article data-route-ready className="night-sky relative overflow-hidden pb-24">
      <div aria-hidden className="stars pointer-events-none absolute inset-0 opacity-60" />

      <header className="shell relative pt-28 md:pt-36">
        <TransitionLink
          href="/#work"
          transitionLabel="Projects"
          className="group inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft aria-hidden className="size-4 transition-transform duration-300 group-hover:-translate-x-1" /> All projects
        </TransitionLink>

        <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-14">
          <div className="lg:col-span-6">
            <p className="kicker flex items-center gap-2">
              <span className="text-muted">{String(number).padStart(2, "0")}.</span>
              <span aria-hidden className="h-3 w-px rotate-[20deg] bg-sky/70" />
              <span>Case study</span>
              <span className="text-dim">/ {project.kind}</span>
            </p>
            <SplitReveal
              as="h1"
              by="chars"
              immediate
              className="mt-5 font-display text-[clamp(2.4rem,5.6vw,4.5rem)] font-bold leading-[1.04] tracking-tight text-ink"
            >
              {project.title}
            </SplitReveal>
            <Reveal delay={0.35}>
              <p className="mt-6 max-w-[48ch] text-lg leading-relaxed text-soft">{project.tagline}</p>
              <ul className="mt-6 flex flex-wrap gap-2" aria-label="Technologies">
                {project.stack.map((s) => (
                  <li key={s} className="pill">
                    {s}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#demo" className="btn-primary">
                  <Play aria-hidden className="size-4" /> Try the demo
                </a>
                {project.links.live && (
                  <a href={project.links.live} target="_blank" rel="noreferrer" className="btn-outline">
                    {project.links.liveLabel ?? "Live site"} <ArrowUpRight aria-hidden className="size-4" />
                  </a>
                )}
              </div>
            </Reveal>
          </div>

          <figure className="lg:col-span-6">
            <MediaReveal immediate delay={0.25} className="glass aspect-[16/10] rounded-2xl">
              <ProjectImage project={project} priority sizes="(min-width: 1024px) 620px, 100vw" />
            </MediaReveal>
            {project.image.illustration && (
              <figcaption className="mt-3 text-xs text-dim">Original illustration — not a screenshot of the production system.</figcaption>
            )}
          </figure>
        </div>

        <Reveal stagger={0.06} className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <dl data-reveal-item className="glass rounded-2xl p-5">
            <dt className="text-xs uppercase tracking-[0.12em] text-dim">Type</dt>
            <dd className="mt-2 text-ink">{project.kind}</dd>
          </dl>
          <dl data-reveal-item className="glass rounded-2xl p-5">
            <dt className="text-xs uppercase tracking-[0.12em] text-dim">Client</dt>
            <dd className="mt-2 text-ink">{project.client ?? "Client system"}</dd>
          </dl>
          <dl data-reveal-item className="glass rounded-2xl p-5">
            <dt className="text-xs uppercase tracking-[0.12em] text-dim">Stack</dt>
            <dd className="mt-2 text-ink">{project.stack.join(", ")}</dd>
          </dl>
          <dl data-reveal-item className="glass rounded-2xl p-5">
            <dt className="text-xs uppercase tracking-[0.12em] text-dim">Links</dt>
            <dd className="mt-2 flex flex-col gap-1 text-ink">
              {project.links.live && (
                <a href={project.links.live} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sky underline-offset-4 hover:underline">
                  {project.links.liveLabel ?? "Live site"} <ArrowUpRight aria-hidden className="size-4" />
                </a>
              )}
              {project.links.repo && (
                <a href={project.links.repo} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sky underline-offset-4 hover:underline">
                  <GitHubIcon className="size-4" /> Source code
                </a>
              )}
              {!project.links.live && !project.links.repo && (
                <span className="inline-flex items-center gap-2 text-soft">
                  <Lock aria-hidden className="size-4" /> Private client system
                </span>
              )}
            </dd>
          </dl>
        </Reveal>
      </header>

      <div className="shell relative mt-20 grid grid-cols-[minmax(0,1fr)] gap-16 md:mt-28 md:gap-20">
        <Block index="01" title="The problem">
          <div className="glass rounded-2xl p-6 md:p-8">
            <p className="max-w-[62ch] text-lg leading-relaxed text-soft md:text-xl">{project.problem}</p>
          </div>
        </Block>

        <Block index="02" title="What I built">
          <ul className="glass grid gap-3 rounded-2xl p-6 text-soft md:p-8 md:text-lg">
            {project.contribution.map((c) => (
              <li key={c} className="flex gap-3 leading-relaxed">
                <span aria-hidden className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-gradient-to-br from-violet to-sky" />
                {c}
              </li>
            ))}
          </ul>
        </Block>

        <Block index="03" title="Main features">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {project.features.map((f) => (
              <li key={f} className="glass glass-hover rounded-xl p-5 text-ink">
                {f}
              </li>
            ))}
          </ul>
        </Block>

        <section id="demo" aria-labelledby="demo-heading" className="scroll-mt-24">
          <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="kicker text-lilac!">04</p>
              <SplitReveal as="h2" id="demo-heading" className="mt-2 font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-bold tracking-tight text-ink">
                How it works
              </SplitReveal>
            </div>
            <p className="max-w-[56ch] border-l-2 border-violet/60 pl-4 text-sm leading-relaxed text-muted">{project.ownership}</p>
          </div>
          <CaseStudyDemo demo={project.demo} />
        </section>

        <Block index="05" title="Engineering challenges">
          <ol className="grid gap-3">
            {project.challenges.map((c, i) => (
              <li key={c.title} className="glass grid gap-4 rounded-2xl p-6 md:grid-cols-[3rem_1fr_1fr] md:gap-8">
                <span className="font-display text-sm font-semibold tabular-nums text-lilac">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="font-display text-lg font-bold text-ink">{c.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted">{c.problem}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-dim">Approach</p>
                  <p className="mt-2 leading-relaxed text-soft">{c.approach}</p>
                </div>
              </li>
            ))}
          </ol>
        </Block>

        <Block index="06" title="Screens">
          {project.screenshots.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {project.screenshots.map((s) => (
                <MediaReveal key={s.src} parallax={0} className="glass rounded-2xl">
                  <Image src={s.src} alt={s.alt} width={s.width} height={s.height} sizes="(min-width: 768px) 50vw, 100vw" className="h-auto w-full" />
                </MediaReveal>
              ))}
            </div>
          ) : (
            <div className="glass rounded-2xl p-6 md:p-8">
              <p className="max-w-[62ch] leading-relaxed text-soft">
                Production screenshots aren&apos;t published here to protect the client&apos;s data. The cover image and the visuals on this page are original
                illustrations of the same workflows, built with mock data.
              </p>
            </div>
          )}
        </Block>

        {otherWork.length > 0 && (
          <aside aria-labelledby="also-built" className="glass rounded-2xl p-6 md:p-8">
            <p id="also-built" className="kicker">
              Also built
            </p>
            <ul className="mt-4 grid gap-5 md:grid-cols-2">
              {otherWork.map((w) => (
                <li key={w.title}>
                  <p className="font-display text-lg font-bold text-ink">{w.title}</p>
                  <p className="mt-1 text-sm text-dim">{w.context}</p>
                  <p className="mt-2 max-w-[56ch] leading-relaxed text-muted">{w.description}</p>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>

      <NextProject project={next} />
    </article>
  );
}

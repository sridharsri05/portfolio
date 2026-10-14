"use client";

import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Reveal, SplitReveal } from "@/components/animations/Reveal";
import { SectionKicker } from "@/components/ui/SectionKicker";
import { TransitionLink } from "@/components/transition/TransitionLink";
import { ProjectImage } from "@/components/work/ProjectImage";
import { projects, type Project } from "@/data/projects";
import { gsap, useGSAP } from "@/lib/gsap";

/** Faint blueprint / wireframe device drawn top-right of the section (decorative, as in the reference). */
function BlueprintDecor() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 520 260"
      className="pointer-events-none absolute right-[-4%] top-6 hidden w-[min(46vw,560px)] opacity-60 md:block"
      fill="none"
      stroke="rgba(110,130,220,0.22)"
      strokeWidth="1"
    >
      {/* Isometric slab (a tablet / terminal seen in perspective) */}
      <path d="M40 150 L250 40 L480 120 L270 236 Z" />
      <path d="M40 150 L40 160 L270 246 L480 130 L480 120" />
      <path d="M70 150 L250 56 L450 124 L270 220 Z" strokeDasharray="3 5" />
      {/* Screen grid */}
      {Array.from({ length: 6 }).map((_, i) => (
        <path key={`a${i}`} d={`M${100 + i * 30} ${134 - i * 15.6} L${300 + i * 30} ${204 - i * 15.6}`} stroke="rgba(110,130,220,0.12)" />
      ))}
      {/* Small device block with a glow edge */}
      <path d="M300 150 L350 124 L400 142 L350 168 Z" stroke="rgba(150,165,255,0.4)" />
      <path d="M300 150 L300 166 L350 184 L400 158 L400 142" stroke="rgba(150,165,255,0.3)" />
      {/* Leader lines */}
      <path d="M250 40 L250 4 M480 120 L516 104 M40 150 L4 166" strokeDasharray="2 4" />
      <circle cx="250" cy="40" r="2.5" fill="rgba(140,160,255,0.5)" stroke="none" />
      <circle cx="480" cy="120" r="2.5" fill="rgba(140,160,255,0.5)" stroke="none" />
    </svg>
  );
}

function ProjectCard({ project, orphan }: { project: Project; orphan: boolean }) {
  return (
    // On the 2-column tablet grid the third card is centred instead of hanging left.
    <li data-work-card className={`h-full ${orphan ? "md:col-span-2 md:mx-auto md:w-[calc(50%-0.75rem)] lg:col-span-1 lg:w-auto" : ""}`}>
      <TransitionLink
        href={`/work/${project.slug}`}
        transitionLabel={project.cardTitle}
        aria-label={`${project.cardTitle} — read the case study`}
        className="glass glass-hover group flex h-full flex-col overflow-hidden rounded-2xl"
      >
        {/* clip wrapper (GSAP wipe) → zoom wrapper (GSAP settle) → hover wrapper (CSS scale).
            Three layers so the scroll tween's inline transform never fights the hover transform. */}
        <div data-card-clip className="relative aspect-[2.1/1] overflow-hidden rounded-t-2xl border-b border-white/5">
          <div data-card-zoom className="size-full">
            <div className="size-full transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-105">
              <ProjectImage project={project} sizes="(min-width: 1024px) 400px, (min-width: 640px) 80vw, 100vw" />
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <h3 className="font-display text-[1.0625rem] font-semibold leading-snug text-ink">{project.cardTitle}</h3>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Technologies">
            {project.cardTags.map((t) => (
              <li
                key={t.label}
                className={`pill ${t.tint === "violet" ? "border-violet/50! bg-violet/20! text-lilac!" : ""}`}
              >
                {t.label}
              </li>
            ))}
          </ul>
          {/* Summary and arrow share the last row: the arrow sits bottom-right, level with the final line (as in the reference). */}
          <div className="mt-4 flex flex-1 items-end gap-4">
            <p className="flex-1 self-start text-sm leading-relaxed text-muted">{project.cardSummary}</p>
            <span aria-hidden className="shrink-0 pb-0.5 text-soft">
              <ArrowRight className="size-4 transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:translate-x-1 group-hover:text-ink" />
            </span>
          </div>
        </div>
      </TransitionLink>
    </li>
  );
}

export function Work() {
  const gridRef = useRef<HTMLUListElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const grid = gridRef.current;
        if (!grid) return;
        const cards = gsap.utils.toArray<HTMLElement>("[data-work-card]", grid);
        const tl = gsap.timeline({ scrollTrigger: { trigger: grid, start: "top 82%", once: true } });
        // Cards rise with a stagger; each image then wipes up from below while its contents settle from a zoom.
        tl.from(cards, { y: 56, opacity: 0, duration: 1.1, ease: "expo.out", stagger: 0.12 });
        cards.forEach((card, i) => {
          const clip = card.querySelector("[data-card-clip]");
          const zoom = card.querySelector("[data-card-zoom]");
          const at = 0.15 + i * 0.12;
          tl.fromTo(clip, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.3, ease: "power4.inOut" }, at);
          tl.fromTo(zoom, { scale: 1.2 }, { scale: 1, duration: 1.6, ease: "expo.out" }, at + 0.2);
        });
        // Leave no inline clip-path behind, so hover glow and focus rings render cleanly.
        tl.eventCallback("onComplete", () => {
          gsap.set(grid.querySelectorAll("[data-card-clip]"), { clearProps: "clipPath" });
        });
      });
    },
    { scope: gridRef },
  );

  const first = projects[0];

  return (
    <section id="work" aria-labelledby="work-heading" className="night-sky relative overflow-hidden py-24 md:py-32">
      <BlueprintDecor />
      <div className="shell relative">
        <div className="flex items-start justify-between gap-6">
          <div>
            <SectionKicker index="04" label="Projects" />
            <SplitReveal
              as="h2"
              id="work-heading"
              className="mt-5 font-display text-[clamp(2rem,4.2vw,3rem)] font-bold leading-[1.12] tracking-tight text-ink"
            >
              Real Solutions
              <br />
              for Business Needs
            </SplitReveal>
            <Reveal delay={0.15}>
              <p className="mt-5 max-w-[60ch] text-[0.9375rem] leading-relaxed text-soft">
                Here are some of the systems I&apos;ve built for real clients, focusing on performance, usability and practical business workflows.
              </p>
            </Reveal>
          </div>
          <TransitionLink
            href={`/work/${first.slug}`}
            transitionLabel={first.cardTitle}
            aria-label="Open first case study"
            className="group mt-24 hidden size-10 shrink-0 place-items-center rounded-full border border-sky/50 text-sky transition-[border-color,box-shadow,background-color] duration-300 hover:border-sky hover:bg-sky/10 hover:shadow-[0_0_24px_-4px_rgba(96,165,250,0.7)] sm:grid md:mt-28"
          >
            <ArrowRight aria-hidden className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </TransitionLink>
        </div>

        <ul ref={gridRef} className="mt-10 grid gap-6 md:mt-12 md:grid-cols-2 lg:grid-cols-3 lg:gap-7">
          {projects.map((p, i) => (
            <ProjectCard key={p.slug} project={p} orphan={projects.length % 2 === 1 && i === projects.length - 1} />
          ))}
        </ul>
      </div>
    </section>
  );
}

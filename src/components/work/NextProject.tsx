"use client";

import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { TransitionLink } from "@/components/transition/TransitionLink";
import { ProjectImage } from "@/components/work/ProjectImage";
import type { Project } from "@/data/projects";
import { gsap, useGSAP } from "@/lib/gsap";

/**
 * Case-study finale: "Next project" with a large title and the next project's art.
 * The hairline fill is scrubbed by scroll; navigation only happens on click / Enter
 * (never auto-advances — that would be scroll-jacking).
 */
export function NextProject({ project }: { project: Project }) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const el = ref.current;
        if (!el) return;
        gsap.fromTo(
          el.querySelector("[data-next-line]"),
          { scaleX: 0 },
          { scaleX: 1, ease: "none", scrollTrigger: { trigger: el, start: "top 90%", end: "bottom bottom", scrub: true } },
        );
        gsap.from(el.querySelectorAll("[data-next-rise]"), {
          yPercent: 40,
          opacity: 0,
          duration: 1.1,
          ease: "expo.out",
          stagger: 0.08,
          scrollTrigger: { trigger: el, start: "top 80%", once: true },
        });
      });
    },
    { scope: ref },
  );

  return (
    <section ref={ref} aria-label="Next project" className="shell mt-28 md:mt-36">
      <div className="relative h-px w-full bg-white/10">
        <span data-next-line className="absolute inset-0 origin-left bg-gradient-to-r from-indigo via-violet to-sky" />
      </div>
      <TransitionLink
        href={`/work/${project.slug}`}
        transitionLabel={project.title}
        className="glass glass-hover group mt-10 grid items-center gap-8 overflow-hidden rounded-2xl p-5 sm:p-8 md:grid-cols-[1.1fr_1fr] md:gap-12"
      >
        <div>
          <p data-next-rise className="kicker flex items-center gap-2">
            Next project <ArrowRight aria-hidden className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </p>
          <p data-next-rise className="mt-4 font-display text-[clamp(2rem,5.5vw,4.25rem)] font-bold leading-[1.05] tracking-tight text-ink">
            {project.title}
          </p>
          <p data-next-rise className="mt-4 max-w-[46ch] leading-relaxed text-muted">
            {project.cardSummary}
          </p>
          <span data-next-rise className="btn-outline mt-7">
            Read case study <ArrowRight aria-hidden className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </div>
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-white/10">
          {/* Starts dim and desaturated, "ignites" to full colour on hover/focus. */}
          <div className="size-full brightness-75 grayscale-[0.6] transition-[filter,transform] duration-700 ease-[var(--ease-out-expo)] group-hover:scale-105 group-hover:brightness-100 group-hover:grayscale-0 group-focus-visible:brightness-100 group-focus-visible:grayscale-0">
            <ProjectImage project={project} sizes="(min-width: 768px) 560px, 100vw" />
          </div>
        </div>
      </TransitionLink>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight, CircleDot, Hexagon } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { Reveal, SplitReveal } from "@/components/animations/Reveal";
import { SectionKicker } from "@/components/ui/SectionKicker";
import { roles } from "@/data/experience";
import { formatDuration, formatYearMonth, monthIndex, monthsBetween } from "@/lib/dates";
import { useCurrentMonthIndex } from "@/hooks/useClientEnv";

/**
 * Durations come from the dates in data/experience.ts and today's date — never a hardcoded total.
 * Past roles count both end months; an ongoing role counts completed months only
 * (the current month isn't over yet), which matches how the resume states experience.
 */
function useDurations() {
  const now = useCurrentMonthIndex();
  if (now === null) return null;
  return roles.map((r) => monthsBetween(r.start, r.end ? monthIndex(r.end) : now - 1));
}

export function Experience() {
  const root = useRef<HTMLElement>(null);
  const durations = useDurations();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Micro-moment (spec item 12, adapted to the reference's cards): the role icon
        // "ignites" — pops in with an overshoot and a brief glow — as its card enters.
        gsap.utils.toArray<HTMLElement>("[data-role-icon]").forEach((icon) => {
          gsap
            .timeline({ scrollTrigger: { trigger: icon, start: "top 85%", once: true } })
            .from(icon, { scale: 0.4, autoAlpha: 0, duration: 0.7, ease: "back.out(2)", delay: 0.25 })
            .fromTo(
              icon,
              { boxShadow: "0 0 0px 0px rgba(124,108,255,0)" },
              { boxShadow: "0 0 28px 6px rgba(124,108,255,0.55)", duration: 0.35, yoyo: true, repeat: 1, ease: "power2.out", clearProps: "boxShadow" },
              "-=0.3",
            );
        });
      });
    },
    { scope: root },
  );

  return (
    <section id="experience" ref={root} aria-labelledby="experience-heading" className="relative py-24 md:py-28">
      <div className="shell grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,2fr)] lg:gap-14">
        <div className="lg:pt-2">
          <SectionKicker index="03" label="Experience" />
          <SplitReveal id="experience-heading" className="mt-5 font-display text-[clamp(2.1rem,3.2vw,2.75rem)] font-bold leading-[1.15] tracking-tight text-ink">
            Professional
            <br />
            Experience
          </SplitReveal>
          <Reveal stagger={0.08}>
            <p data-reveal-item className="mt-6 max-w-[44ch] leading-[1.75] text-soft">
              Working on client projects, building full-stack applications, handling integrations, reporting, authentication and deployment.
            </p>
            <div data-reveal-item className="mt-9">
              <Link href="#work" className="btn-outline rounded-full! px-7! py-3! font-sans! text-sm! font-normal! normal-case! tracking-normal!">
                View all projects <ArrowRight aria-hidden className="size-4" strokeWidth={1.8} />
              </Link>
            </div>
          </Reveal>
        </div>

        <Reveal as="ol" stagger={0.14} y={36} className="grid gap-5">
          {roles.map((role, i) => {
            const current = role.end === null;
            const Icon = current ? CircleDot : Hexagon;
            return (
              // Reveal animates the <li>; the glass card inside owns the hover transition
              // (glass-hover transitions transform, which would smear GSAP's per-frame transform).
              <li key={role.company} data-reveal-item>
                <div className="glass glass-hover relative flex flex-col gap-4 rounded-2xl p-6 sm:flex-row sm:gap-5 sm:p-7">
                  <span
                    className={`absolute right-5 top-5 rounded-full border px-3.5 py-1 text-xs font-medium ${
                      current ? "border-blue/60 bg-blue/35 text-ink/90" : "border-blue/50 bg-blue/25 text-sky"
                    }`}
                  >
                    {current ? "Current" : "Internship"}
                  </span>

                  <span
                    aria-hidden
                    data-role-icon
                    className={`grid size-11 shrink-0 place-items-center rounded-full border ${
                      current
                        ? "border-violet/50 bg-violet/30 text-lilac shadow-[0_0_18px_-4px_rgba(139,92,246,0.8)]"
                        : "border-blue/50 bg-blue/30 text-sky shadow-[0_0_18px_-4px_rgba(59,130,246,0.8)]"
                    }`}
                  >
                    <Icon className="size-5" strokeWidth={1.8} />
                  </span>

                  <div className="min-w-0 flex-1">
                    {/* Header spans the card (as in the reference); location + bullets share the row below. */}
                    <div className="sm:pr-24">
                      <p className="text-sm tabular-nums text-sky/75">
                        {formatYearMonth(role.start)} – {role.end ? formatYearMonth(role.end) : "Present"}
                        {/* Computed client-side only (needs today's date); kept small since the reference doesn't show it. */}
                        {durations && <span className="text-dim"> · {formatDuration(durations[i])}</span>}
                      </p>
                      <h3 className="mt-1 font-display text-lg font-semibold leading-snug text-ink">{role.title}</h3>
                      <p className="mt-1.5 text-[0.95rem] text-sky">{role.company}</p>
                    </div>

                    <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,0.4fr)_minmax(0,1fr)] md:gap-5">
                      <p className="text-sm text-muted">{role.location}</p>
                      <ul className="space-y-1.5 text-[0.84rem] leading-relaxed text-soft">
                        {role.highlights.map((h) => (
                          <li key={h} className="flex gap-3">
                            <span aria-hidden className="mt-[0.6em] size-1 shrink-0 rounded-full bg-soft/80" />
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}

"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { journey } from "@/data/experience";

/*
 * "MY JOURNEY" vertical timeline. Motion (spec item 12): the indigo spine draws
 * downward with scroll and each dot ignites as the line reaches it.
 * Dots are lit by default in markup, so without JS / with reduced motion the
 * finished state is shown; GSAP only dims them once it is running.
 */
export function JourneyTimeline() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const list = root.current?.querySelector<HTMLElement>("[data-journey-list]");
        if (!list) return;
        const dots = gsap.utils.toArray<HTMLElement>("[data-journey-dot]", list);
        dots.forEach((d) => (d.dataset.lit = "false"));

        const tween = gsap.fromTo(
          "[data-journey-spine]",
          { scaleY: 0 },
          { scaleY: 1, ease: "none", scrollTrigger: { trigger: list, start: "top 75%", end: "bottom 55%", scrub: 0.5 } },
        );
        // Follow the tween (not the ScrollTrigger) so dots ignite in sync with the smoothed,
        // scrubbed line. Offsets are read per update (a handful of nodes, cheap) so they stay
        // correct after font loading / resize. Each dot sits in a relative <li>, hence li + dot.
        tween.eventCallback("onUpdate", () => {
          const p = tween.progress();
          const h = list.offsetHeight || 1;
          dots.forEach((d) => {
            const top = (d.parentElement?.offsetTop ?? 0) + d.offsetTop + d.offsetHeight / 2;
            const reached = p >= top / h;
            const lit = d.dataset.lit === "true";
            if (reached && !lit) {
              d.dataset.lit = "true";
              gsap.fromTo(d, { scale: 1 }, { scale: 1.6, duration: 0.25, ease: "back.out(2)", yoyo: true, repeat: 1 });
            } else if (!reached && lit) {
              d.dataset.lit = "false";
            }
          });
        });
        return () => dots.forEach((d) => delete d.dataset.lit);
      });
    },
    { scope: root },
  );

  return (
    <div ref={root}>
      <h3 className="kicker">My journey</h3>
      <ol data-journey-list className="relative mt-7 space-y-8 xl:space-y-10">
        {/* Track + drawn spine; both stop at the last dot's centre. */}
        <span aria-hidden className="absolute bottom-3 left-[5px] top-2 w-px bg-edge" />
        <span aria-hidden data-journey-spine className="absolute bottom-3 left-[5px] top-2 w-px origin-top bg-gradient-to-b from-indigo via-violet/80 to-sky" />
        {journey.map((item) => {
          const cert = item.kind === "certification";
          return (
            <li key={item.title} className="relative pl-10">
              <span
                aria-hidden
                data-journey-dot
                className={`absolute left-0 top-1 rounded-full transition-[opacity,box-shadow] duration-500 data-[lit=false]:opacity-35 data-[lit=false]:shadow-none ${
                  cert
                    ? "-left-[1px] size-[13px] bg-sky shadow-[0_0_14px_3px_rgba(96,165,250,0.6)]"
                    : "size-[11px] bg-indigo ring-2 ring-indigo/30 shadow-[0_0_12px_2px_rgba(99,102,241,0.7)]"
                }`}
              />
              <p className={`text-sm ${cert ? "font-display font-semibold text-sky" : "tabular-nums text-soft/80"}`}>{item.period}</p>
              {cert ? (
                <p className="mt-1.5 text-sm leading-relaxed text-soft">
                  {item.href ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-edge-strong underline-offset-4 transition-colors hover:text-ink hover:decoration-sky"
                    >
                      {item.title}
                    </a>
                  ) : (
                    item.title
                  )}{" "}
                  – {item.org}
                </p>
              ) : (
                <>
                  <p className="mt-1 font-display text-[0.98rem] font-semibold text-ink">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-sky/80">{item.org}</p>
                  {item.place && <p className="mt-0.5 text-sm text-sky/80">{item.place}</p>}
                </>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

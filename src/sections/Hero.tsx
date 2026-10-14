"use client";

import { useRef } from "react";
import { Mail } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { profile } from "@/data/profile";
import { CrystalCanvas } from "@/components/three/crystal/CrystalCanvas";
import { Magnetic } from "@/components/ui/Magnetic";
import { ResumeLink } from "@/components/ui/ResumeLink";
import { GitHubIcon, LinkedInIcon } from "@/components/ui/BrandIcons";
import { isSeamOpen, whenSeamOpened } from "@/components/transition/seam-controller";

/** Headline as in the reference: two white lines, then the violet and blue gradient lines. */
const HEADLINE = [
  { text: "I build digital", tone: "text-ink", split: true },
  { text: "systems that", tone: "text-ink", split: true },
  { text: "move business", tone: "text-gradient-violet", split: false },
  { text: "forward.", tone: "text-gradient-blue", split: false },
] as const;

const SENTENCE = "I build digital systems that move business forward.";

/** Fallback when no preloader announces itself (or it never fires `seam:opened`). */
const INTRO_FALLBACK_MS = 1200;
/** If a Seam preloader is mounted (it carries [data-seam]) wait up to its CSS failsafe instead. */
const SEAM_FAILSAFE_MS = 3200;

type Split = { chars: Element[]; words: Element[]; revert: () => void };

export function Hero({ resumeAvailable }: { resumeAvailable: boolean }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", (self) => {
        const el = root.current;
        if (!el) return;
        const q = gsap.utils.selector(el);
        // Full intro only while the first-visit preloader is still covering the page. Once the
        // Seam has opened (html[data-seam-open]), remounts such as browser Back take the quick path.
        const full = document.documentElement.dataset.intro === "play" && !isSeamOpen();
        const mobile = window.matchMedia("(max-width: 767px)").matches;

        const splitLines = q("[data-hero-split]") as HTMLElement[];
        const gradientLines = q("[data-hero-line]") as HTMLElement[];
        const kickerParts = q("[data-hero-kicker] [data-scramble]") as HTMLElement[];
        const rise = q("[data-hero-rise]");
        const cue = q("[data-hero-cue]");

        // First visit: hide everything up front so nothing flashes when the curtain lifts
        // before the timeline starts. Repeat visits skip this and animate ~0.1s after paint.
        if (full) gsap.set([...splitLines, ...gradientLines, ...rise, ...cue, ...q("[data-hero-kicker]")], { autoAlpha: 0 });

        const splits: Split[] = [];
        let cancelled = false;
        let timer = 0;
        let offSeam: (() => void) | undefined;

        const waitForStart = () =>
          new Promise<void>((resolve) => {
            if (!full) {
              timer = window.setTimeout(resolve, 100);
              return;
            }
            // whenSeamOpened resolves at once if the curtain already split before we subscribed.
            offSeam = whenSeamOpened(resolve);
            const hasSeam = !!document.querySelector("[data-seam]");
            timer = window.setTimeout(resolve, hasSeam ? SEAM_FAILSAFE_MS : INTRO_FALLBACK_MS);
          });

        (async () => {
          const [{ SplitText }, { ScrambleTextPlugin }] = await Promise.all([
            import("gsap/SplitText"),
            import("gsap/ScrambleTextPlugin"),
            // Split only with the real font loaded so char widths are measured correctly.
            document.fonts?.ready,
            waitForStart(),
          ]);
          if (cancelled) return;
          gsap.registerPlugin(SplitText, ScrambleTextPlugin);

          // context.add records the tweens so matchMedia reverts them on unmount / query change.
          self.add(() => {
            const by = full ? "chars" : "words";
            for (const line of splitLines) {
              const s = SplitText.create(line, { type: by, aria: "none" }) as unknown as Split;
              splits.push(s);
            }
            const pieces = splits.flatMap((s) => (by === "chars" ? s.chars : s.words));
            const ease = "expo.out";

            const tl = gsap.timeline({
              defaults: { ease },
              // Hand plain text back once settled (cleaner DOM, correct reflow on resize).
              onComplete: () => splits.splice(0).forEach((s) => s.revert()),
            });

            tl.set([...splitLines, ...gradientLines], { autoAlpha: 1 }, 0);
            tl.from(
              pieces,
              {
                yPercent: 110,
                rotate: full ? (mobile ? 4 : 7) : 0,
                transformOrigin: "0% 100%",
                duration: full ? 1.15 : 0.9,
                stagger: full ? 0.022 : 0.04,
              },
              0,
            );
            // Gradient lines rise as whole lines (char splitting breaks background-clip: text),
            // then "ignite" with a short brightness flare.
            tl.from(gradientLines, { yPercent: 110, duration: full ? 1.15 : 0.9, stagger: 0.12 }, full ? 0.24 : 0.1);
            if (full) {
              tl.from(gradientLines, { filter: "brightness(1.9)", duration: 0.9, ease: "power2.inOut", clearProps: "filter" }, "-=0.7");
              tl.set(q("[data-hero-kicker]"), { autoAlpha: 1 }, 0.1);
              for (const part of kickerParts) {
                tl.to(part, { duration: 0.7, scrambleText: { text: part.textContent ?? "", chars: "01/<>_", speed: 0.6 } }, 0.1);
              }
            }
            tl.fromTo(rise, { yPercent: 40, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1, stagger: 0.06 }, full ? "-=0.9" : 0.15);
            tl.fromTo(cue, { scaleY: 0, autoAlpha: 1, transformOrigin: "50% 0%" }, { scaleY: 1, duration: 0.8 }, "-=0.6");
          });
        })();

        // Copy drifts up and dims a little as the hero scrolls away (scrubbed, reversible).
        gsap.to(q("[data-hero-copy]"), {
          yPercent: -10,
          opacity: 0.3,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true },
        });

        return () => {
          cancelled = true;
          window.clearTimeout(timer);
          offSeam?.();
          splits.splice(0).forEach((s) => s.revert());
        };
      });
    },
    { scope: root },
  );

  return (
    <section id="home" ref={root} aria-labelledby="hero-heading" className="night-sky relative isolate flex min-h-[100svh] flex-col overflow-hidden">
      {/* Backdrop: stars + the soft blue light streak falling from top-centre. */}
      <div aria-hidden className="stars pointer-events-none absolute inset-0 -z-10 opacity-70" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 left-[22%] -z-10 h-[620px] w-[260px] rotate-[38deg] rounded-full bg-[radial-gradient(closest-side,rgba(96,140,255,0.38),rgba(80,90,230,0.12)_55%,transparent)] blur-2xl max-md:left-[40%] max-md:opacity-70"
      />
      <div aria-hidden className="pointer-events-none absolute left-[38%] top-[2%] -z-10 size-1.5 rounded-full bg-white shadow-[0_0_18px_6px_rgba(130,170,255,0.7)] max-md:hidden" />

      <CrystalCanvas preset="hero" />

      {/* Readability scrims: left-to-right on desktop; on mobile an overall dim so the
          crystal behind the right half never fights the headline or buttons. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(3,5,13,0.88)_0%,rgba(3,5,13,0.6)_34%,rgba(3,5,13,0)_58%)] max-md:bg-[linear-gradient(90deg,rgba(3,5,13,0.82)_0%,rgba(3,5,13,0.55)_62%,rgba(3,5,13,0.25)_100%)]"
      />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-night to-transparent" />

      <div data-hero-copy className="shell relative flex flex-1 flex-col pt-[clamp(7rem,19vh,13rem)]">
        <div className="md:max-w-[52%] lg:max-w-[48%]">
          <p data-hero-kicker className="font-display text-[0.72rem] font-medium uppercase tracking-[0.12em] text-soft md:text-[clamp(0.85rem,1.05vw,1.05rem)]">
            <span data-scramble>{profile.heroLabel}</span>
            <span aria-hidden className="mx-2.5 text-lilac">
              ·
            </span>
            <span data-scramble className="text-lilac">
              {profile.heroLabelAccent}
            </span>
          </p>

          <h1
            id="hero-heading"
            className="mt-4 font-display text-[clamp(1.85rem,9.2vw,2.6rem)] font-bold uppercase leading-[1.05] tracking-[0.005em] md:mt-5 md:w-max md:text-[clamp(2.3rem,4.7vw,4.1rem)]"
          >
            <span className="sr-only">{SENTENCE}</span>
            <span aria-hidden className="block">
              {HEADLINE.map((line) => (
                // Each line is its own mask; the inner span is what rises.
                <span key={line.text} className="block overflow-hidden pb-[0.04em]">
                  <span
                    {...(line.split ? { "data-hero-split": "" } : { "data-hero-line": "" })}
                    className={`block w-fit whitespace-nowrap ${line.tone}`}
                  >
                    {line.text}
                  </span>
                </span>
              ))}
            </span>
          </h1>

          <p data-hero-rise className="mt-5 max-w-[34ch] text-[0.95rem] leading-relaxed text-soft md:mt-7 md:max-w-[42ch] md:text-[clamp(1.06rem,1.3vw,1.2rem)]">
            React interfaces. Full-stack systems. Interactive experiences. Built for real-world problems.
          </p>

          <div data-hero-rise className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center md:mt-10">
            <Magnetic className="w-[62%] min-w-[13.5rem] sm:w-auto sm:min-w-0">
              <a href="#work" className="btn-primary w-full px-8 sm:min-w-[14rem]">
                Explore my work
              </a>
            </Magnetic>
            <ResumeLink available={resumeAvailable} className="btn-outline w-[58%] min-w-[12.5rem] whitespace-nowrap px-6 sm:px-7 sm:w-auto sm:min-w-[12.75rem] [&>svg]:hidden" />
          </div>

          <div data-hero-rise className="mt-10 md:mt-14">
            <p className="text-sm font-medium text-ink">{profile.name}</p>
            <p className="mt-1.5 text-[0.8rem] text-[#8794f0]">{profile.roleLine}</p>
          </div>
        </div>

        <div className="flex-1" />

        {/* Bottom bar: socials | scroll cue | availability (stacked on mobile per the reference). */}
        <div className="relative flex flex-col items-start gap-5 pb-6 pt-7 md:grid md:grid-cols-[1fr_auto_1fr] md:items-end md:gap-6 md:pb-8 md:pt-10">
          <ul data-hero-rise className="flex items-center gap-3" aria-label="Profiles and email">
            <li>
              <a href={profile.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn (opens in new tab)" className="grid size-9 place-items-center rounded-md text-soft transition-colors hover:text-ink">
                <LinkedInIcon className="size-[19px] md:size-[22px]" />
              </a>
            </li>
            <li>
              <a href={profile.github} target="_blank" rel="noreferrer" aria-label="GitHub (opens in new tab)" className="grid size-9 place-items-center rounded-md text-soft transition-colors hover:text-ink">
                <GitHubIcon className="size-[19px] md:size-[22px]" />
              </a>
            </li>
            <li>
              <a href={`mailto:${profile.email}`} aria-label={`Email ${profile.email}`} className="grid size-9 place-items-center rounded-md text-soft transition-colors hover:text-ink">
                <Mail aria-hidden className="size-[19px] md:size-[22px]" />
              </a>
            </li>
          </ul>

          {profile.availability.show && (
            <p data-hero-rise className="flex items-center gap-2.5 text-[0.8rem] text-soft md:order-3 md:justify-self-end">
              <span aria-hidden className="size-2 rounded-full bg-mint shadow-[0_0_10px_2px_rgba(52,211,153,0.55)]" />
              {profile.availability.label}
            </p>
          )}

          <a
            href="#about"
            data-hero-cue
            aria-label="Scroll to About"
            className="flex flex-col items-center gap-2 self-center text-[0.75rem] text-soft transition-colors hover:text-ink max-md:mt-4 md:order-2"
          >
            <span aria-hidden className="relative flex h-10 w-6 justify-center rounded-full border border-soft/70 pt-2">
              <span className="block h-2 w-[3px] rounded-full bg-ink [animation:scroll-wheel_1.8s_var(--ease-in-out-quart)_infinite]" />
            </span>
            Scroll
          </a>
        </div>
      </div>
    </section>
  );
}

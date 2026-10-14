import { Lightbulb, TrendingUp, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Reveal, SplitReveal } from "@/components/animations/Reveal";
import { SectionKicker } from "@/components/ui/SectionKicker";
import { AboutPortrait } from "@/components/about/AboutPortrait";
import { JourneyTimeline } from "@/components/about/JourneyTimeline";

/** Key phrases are highlighted in white, as in the reference. */
const Em = ({ children }: { children: ReactNode }) => <strong className="font-semibold text-ink">{children}</strong>;

const BIO: ReactNode[] = [
  <>
    I&apos;m a <Em>Full-Stack Developer</Em> who builds modern web applications using <Em>React, Laravel</Em> and <Em>related technologies</Em>. I
    enjoy working on <Em>real client systems</Em> for businesses in Malaysia and India — <Em>integrating backend services</Em>, creating clean
    UI, and solving practical business problems.
  </>,
  <>
    I use AI coding tools like <Em>Claude Code</Em> to speed up development, while always reviewing and understanding the code. I&apos;m passionate
    about interactive 3D, modern frontend engineering and building systems that make an impact.
  </>,
];

const TRAITS = [
  { icon: Lightbulb, title: "Problem solver", body: "Finds practical solutions" },
  { icon: Users, title: "Team player", body: "Works well in cross-functional teams" },
  { icon: TrendingUp, title: "Continuous learner", body: "Always exploring new tech" },
];

export function About() {
  return (
    <section id="about" aria-labelledby="about-heading" className="relative overflow-hidden py-24 md:py-32">
      <div className="shell grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.45fr)_minmax(0,0.95fr)] lg:gap-10 xl:gap-12">
        {/* Portrait sits first on mobile, as a compact framed visual above the copy. */}
        <Reveal className="lg:-ml-[clamp(1.25rem,4.5vw,4rem)] lg:-mt-6 lg:self-start" y={40}>
          <AboutPortrait />
        </Reveal>

        <div className="lg:pt-6">
          <SectionKicker index="02" label="About me" />
          <SplitReveal id="about-heading" className="mt-5 font-display text-[clamp(2.1rem,3.2vw,2.75rem)] font-bold leading-[1.15] tracking-tight text-ink">
            The person behind
            <br />
            the <span className="text-gradient-blue">code.</span>
          </SplitReveal>

          <Reveal stagger={0.08} className="mt-7 space-y-5">
            {BIO.map((p, i) => (
              <p key={i} data-reveal-item className="max-w-[50ch] text-[0.98rem] leading-[1.75] text-soft">
                {p}
              </p>
            ))}
          </Reveal>

          <Reveal as="ul" stagger={0.1} className="mt-9 space-y-5">
            {TRAITS.map(({ icon: Icon, title, body }) => (
              <li key={title} data-reveal-item className="flex items-center gap-4">
                <span
                  aria-hidden
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-sky/50 bg-[radial-gradient(circle_at_35%_30%,#2f6bff_0%,#1a3fc4_55%,#0f2470_100%)] text-cyan shadow-[0_0_22px_-2px_rgba(59,130,246,0.85),inset_0_1px_0_rgba(255,255,255,0.25)]"
                >
                  <Icon className="size-[19px] drop-shadow-[0_0_6px_rgba(56,189,248,0.9)]" strokeWidth={2.2} />
                </span>
                <span>
                  <span className="block font-display text-[0.95rem] font-semibold text-ink">{title}</span>
                  <span className="mt-0.5 block text-sm text-muted">{body}</span>
                </span>
              </li>
            ))}
          </Reveal>
        </div>

        <Reveal className="lg:pt-8" y={36} delay={0.1}>
          <JourneyTimeline />
        </Reveal>
      </div>
    </section>
  );
}

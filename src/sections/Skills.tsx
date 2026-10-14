import { Reveal, SplitReveal } from "@/components/animations/Reveal";
import { SectionKicker } from "@/components/ui/SectionKicker";
import { SkillsConstellation } from "@/components/skills/SkillsConstellation";

/** "05./ SKILLS — Technologies I Work With": heading top-left, crystal hub with five skill cards (ref/skills.png). */
export function Skills() {
  return (
    <section id="skills" aria-labelledby="skills-heading" className="night-sky relative overflow-hidden py-24 md:py-32">
      <div className="shell relative">
        <div className="relative z-[3] max-w-[30rem] lg:max-w-[52%]">
          <SectionKicker index="05" label="Skills" />
          <SplitReveal
            as="h2"
            id="skills-heading"
            className="mt-5 font-display text-[clamp(2rem,3.2vw,2.6rem)] font-bold leading-[1.12] lg:whitespace-nowrap tracking-tight text-ink"
          >
            Technologies I Work With
          </SplitReveal>
          <Reveal delay={0.15}>
            <p className="mt-4 max-w-[46ch] leading-relaxed text-soft">
              A combination of modern frameworks, backend systems, databases, tools and AI assistants.
            </p>
          </Reveal>
        </div>

        <SkillsConstellation />
      </div>
    </section>
  );
}

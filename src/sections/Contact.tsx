import type { ReactNode } from "react";
import { Mail } from "lucide-react";
import { Reveal, SplitReveal } from "@/components/animations/Reveal";
import { CrystalCanvas } from "@/components/three/crystal/CrystalCanvas";
import { CopyEmailButton } from "@/components/ui/CopyEmailButton";
import { GitHubIcon, LinkedInIcon } from "@/components/ui/BrandIcons";
import { Magnetic } from "@/components/ui/Magnetic";
import { ResumeLink } from "@/components/ui/ResumeLink";
import { SectionKicker } from "@/components/ui/SectionKicker";
import { profile } from "@/data/profile";

/** Display form of a profile URL: "https://linkedin.com/in/x/" → "linkedin.com/in/x". */
const display = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

const pill =
  "inline-flex shrink-0 items-center justify-center rounded-full border border-edge-strong px-3 py-1.5 text-[11px] font-medium sm:min-w-[6.5rem] sm:px-3.5 sm:text-xs text-soft transition-colors hover:border-sky/70 hover:text-ink";

/** One contact row from the reference: icon outside, glass bar with the address and a pill action. */
function ContactRow({ icon, text, action }: { icon: ReactNode; text: ReactNode; action: ReactNode }) {
  return (
    <li data-reveal-item className="flex items-center gap-2.5 sm:gap-4">
      <span aria-hidden className="grid w-5 shrink-0 place-items-center text-lilac sm:w-6">
        {icon}
      </span>
      <div className="glass glass-hover flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl py-2 pl-3 pr-2 sm:gap-3 sm:pl-4">
        <span className="min-w-0 text-[12px] text-soft [overflow-wrap:anywhere] sm:text-sm">{text}</span>
        {action}
      </div>
    </li>
  );
}

/** "06./ CONTACT" finale: text and actions left, the contact crystal over rocks filling the right (ref/contact.png). */
export function Contact({ resumeAvailable }: { resumeAvailable: boolean }) {
  const mailSubject = encodeURIComponent("Project enquiry from your portfolio");

  return (
    <section id="contact" aria-labelledby="contact-heading" className="night-sky relative flex flex-col overflow-hidden lg:block">
      {/* Crystal: below the text on mobile, the right ~56% of the section from lg. */}
      {/* A mask (not a coloured scrim) feathers the canvas edges, so it blends into the night-sky gradient without a seam. */}
      <div
        aria-hidden
        className="relative order-last h-[300px] [mask-image:linear-gradient(180deg,transparent_0%,#000_18%,#000_80%,transparent_100%)] sm:h-[380px] lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-[56%] lg:[mask-composite:intersect] lg:[mask-image:linear-gradient(90deg,transparent_0%,#000_32%),linear-gradient(180deg,transparent_0%,#000_12%,#000_90%,transparent_100%)]"
      >
        <CrystalCanvas preset="contact" />
      </div>

      <div className="shell relative z-[2] pb-4 pt-24 md:pt-32 lg:py-28">
        <div className="max-w-[37rem]">
          <SectionKicker index="06" label="Contact" />
          <SplitReveal
            as="h2"
            id="contact-heading"
            className="mt-5 font-display text-[clamp(1.6rem,3.6vw,2.6rem)] font-bold uppercase leading-[1.15] tracking-tight text-ink"
          >
            Have a challenging
            <br className="hidden sm:block" /> project? Let&rsquo;s build it.
          </SplitReveal>
          <Reveal delay={0.1}>
            <p className="mt-4 max-w-[40ch] leading-relaxed text-soft">
              Let&apos;s discuss your ideas, explore possibilities and build something great together.
            </p>
          </Reveal>

          <Reveal as="ul" stagger={0.08} y={18} className="mt-8 grid max-w-[36.5rem] gap-3">
            <ContactRow
              icon={<Mail className="size-5" />}
              text={
                <a href={`mailto:${profile.email}`} aria-label={`Email ${profile.email}`} className="hover:text-ink">
                  {/* <wbr> lets a narrow phone break after "@" instead of mid-word. */}
                  {profile.email.split("@")[0]}@<wbr />
                  {profile.email.split("@")[1]}
                </a>
              }
              action={<CopyEmailButton className="px-3! text-[11px]! sm:min-w-[6.5rem] sm:px-3.5! sm:text-xs!" />}
            />
            <ContactRow
              icon={<LinkedInIcon className="size-5" />}
              text={display(profile.linkedin)}
              action={
                <a href={profile.linkedin} target="_blank" rel="noreferrer" data-cursor="Open" className={pill} aria-label="View LinkedIn profile (opens in a new tab)">
                  View Profile
                </a>
              }
            />
            <ContactRow
              icon={<GitHubIcon className="size-5" />}
              text={display(profile.github)}
              action={
                <a href={profile.github} target="_blank" rel="noreferrer" data-cursor="Open" className={pill} aria-label="View GitHub profile (opens in a new tab)">
                  View Profile
                </a>
              }
            />
          </Reveal>

          <Reveal delay={0.2} className="mt-8 flex flex-wrap items-center gap-4">
            {/* Primary CTA is magnetic on fine pointers only (Magnetic handles the gating). */}
            <Magnetic strength={0.12}>
              <ResumeLink available={resumeAvailable} label="Download Resume" className="btn-primary min-w-[12rem] rounded-[1.15rem]! normal-case! tracking-normal!" />
            </Magnetic>
            <a href={`mailto:${profile.email}?subject=${mailSubject}`} className="btn-outline min-w-[12rem] sm:min-w-[11rem] rounded-[1.15rem]! normal-case! tracking-normal!">
              Get in Touch
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

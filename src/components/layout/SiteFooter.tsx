import { navItems, profile } from "@/data/profile";
import { TransitionLink } from "@/components/transition/TransitionLink";
import { Monogram } from "./SiteHeader";
import { BackToTop, Copyright } from "./BackToTop";

/** Compact single-row footer from the reference: brand | nav | copyright | back to top. */
export function SiteFooter() {
  return (
    <footer className="relative border-t border-edge/60 bg-night">
      <div className="shell flex flex-col items-center gap-6 py-8 text-center lg:flex-row lg:justify-between lg:gap-10 lg:py-5 lg:text-left">
        <div className="flex flex-col items-center gap-6 lg:flex-row lg:gap-16 xl:gap-24">
          <TransitionLink href="/" transitionLabel="Home" className="flex items-center gap-3" aria-label={`${profile.wordmark} — ${profile.name}, home`}>
            <Monogram className="h-5 w-auto" />
            <span className="font-display text-[0.75rem] font-bold uppercase tracking-[0.06em] text-ink">{profile.wordmark}</span>
          </TransitionLink>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[0.8rem] text-soft lg:gap-x-8">
              {navItems.map((item) => (
                <li key={item.id}>
                  <TransitionLink href={`/#${item.id}`} transitionLabel="Home" className="transition-colors hover:text-ink">
                    {item.label}
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-10 lg:gap-14">
          <Copyright className="text-[0.75rem] text-muted" />
          <BackToTop />
        </div>
      </div>
    </footer>
  );
}

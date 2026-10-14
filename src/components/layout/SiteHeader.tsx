"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useScroll, useSpring } from "motion/react";
import { Menu, X } from "lucide-react";
import { navItems, profile, type SectionId } from "@/data/profile";
import { TransitionLink } from "@/components/transition/TransitionLink";
import { usePrefersReducedMotion } from "@/hooks/useClientEnv";

/** Geometric light-blue "SG" monogram from the reference, drawn as strokes so it stays crisp at any size. */
export function Monogram({ className = "" }: { className?: string }) {
  const gid = useId();
  return (
    <svg viewBox="0 0 46 28" fill="none" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="46" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#bcd4ff" />
          <stop offset="1" stopColor="#6f8dff" />
        </linearGradient>
      </defs>
      <g stroke={`url(#${gid})`} strokeWidth="2.6" strokeLinecap="square" strokeLinejoin="miter">
        <path d="M18.5 3.5H8.5a5.25 5.25 0 0 0 0 10.5h5a5.25 5.25 0 0 1 0 10.5H2.5" />
        <path d="M42.5 3.5h-9a10.5 10.5 0 0 0 0 21h9v-9.5h-7" />
      </g>
    </svg>
  );
}

function useActiveSection(enabled: boolean) {
  const [active, setActive] = useState<SectionId>("home");
  useEffect(() => {
    if (!enabled) return;
    const sections = navItems
      .map((n) => document.getElementById(n.id))
      .filter((el): el is HTMLElement => !!el);
    // A thin band in the upper third of the viewport decides which section is "current".
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id as SectionId);
        }
      },
      { rootMargin: "-35% 0px -60% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [enabled]);
  return enabled ? active : null;
}

type NavLinkProps = {
  id: SectionId;
  onHome: boolean;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  "aria-current"?: "true";
  ref?: React.Ref<HTMLAnchorElement>;
};

/** Plain hash anchor on "/" (smooth in-page scroll); a TransitionLink from any other route. */
function NavLink({ id, onHome, children, ...rest }: NavLinkProps) {
  if (onHome) {
    return (
      <a href={`#${id}`} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <TransitionLink href={`/#${id}`} transitionLabel="Home" {...rest}>
      {children}
    </TransitionLink>
  );
}

/** Desktop hover "char roll": two stacked copies; chars slide up one after another (CSS only, no JS per hover). */
function RollLabel({ text }: { text: string }) {
  const chars = Array.from(text);
  const row = (copy: number) => (
    <span aria-hidden className={`flex ${copy ? "absolute inset-x-0 top-full" : ""}`}>
      {chars.map((c, i) => (
        <span
          key={i}
          className="inline-block transition-transform duration-[450ms] ease-[var(--ease-out-expo)] group-hover:-translate-y-full"
          style={{ transitionDelay: `${i * 15}ms` }}
        >
          {c === " " ? " " : c}
        </span>
      ))}
    </span>
  );
  return (
    <span className="relative block overflow-hidden">
      <span className="sr-only">{text}</span>
      {row(0)}
      {row(1)}
    </span>
  );
}

// Same vertex count in both states so the clip-path morphs: a faceted "seam" edge that drops open.
const MENU_CLOSED = "polygon(0% 0%, 100% 0%, 100% 0%, 78% 3%, 60% 1%, 41% 4%, 22% 1.5%, 0% 3%)";
const MENU_OPEN = "polygon(0% 0%, 100% 0%, 100% 100%, 78% 100%, 60% 100%, 41% 100%, 22% 100%, 0% 100%)";

export function SiteHeader() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const active = useActiveSection(onHome);
  const reduced = usePrefersReducedMotion();
  const [open, setOpen] = useState(false);
  // Close the mobile menu whenever the route changes (e.g. browser/Android Back while it is open).
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setOpen(false);
  }
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 26, restDelta: 0.001 });

  // Glass state + hide-on-scroll-down / show-on-scroll-up. setState only fires on changes,
  // so this doesn't re-render per scroll frame.
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      const focusInside = headerRef.current?.contains(document.activeElement) ?? false;
      if (reduced || focusInside || y < window.innerHeight * 0.3) setHidden(false);
      else if (Math.abs(y - lastY) > 6) setHidden(y > lastY);
      lastY = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [reduced]);

  // Mobile menu: lock scroll, Escape closes, Tab stays inside (toggle + menu links), focus restored on close.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstLink.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const items = [menuButton.current, ...Array.from(menuRef.current?.querySelectorAll<HTMLElement>("a[href]") ?? [])].filter(
        (n): n is HTMLElement => !!n,
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const trigger = menuButton.current;
    const menu = menuRef.current;
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      // Only restore focus if it is still in the menu (or lost to <body>); an in-page jump
      // from a menu link has already moved focus to the target section and must keep it.
      const ae = document.activeElement;
      if (!ae || ae === document.body || menu?.contains(ae)) trigger?.focus();
    };
  }, [open]);

  const seamEase = [0.86, 0, 0.07, 1] as const;

  return (
    <>
      <header
        ref={headerRef}
        onFocus={() => setHidden(false)}
        className={`fixed inset-x-0 top-0 z-50 border-b transition-[transform,background-color,border-color,backdrop-filter] duration-500 ease-[var(--ease-in-out-quart)] ${
          hidden && !open ? "-translate-y-full" : "translate-y-0"
        } ${scrolled || open ? "border-edge/70 bg-navy/75 backdrop-blur-md" : "border-transparent bg-transparent"}`}
      >
        <motion.div
          aria-hidden
          className="absolute inset-x-0 bottom-[-1px] h-px origin-left bg-gradient-to-r from-indigo via-violet to-sky"
          style={{ scaleX: progress, opacity: scrolled ? 1 : 0 }}
        />
        <div
          className={`shell flex h-16 items-center justify-between gap-6 transition-[height] duration-500 ease-[var(--ease-in-out-quart)] md:h-[4.5rem] ${
            scrolled || open ? "" : "lg:h-[5.75rem]"
          }`}
        >
          {onHome ? (
            <a href="#home" className="flex items-center gap-3" aria-label={`${profile.wordmark} — ${profile.name}, home`}>
              <Monogram className="h-6 w-auto md:h-[1.65rem]" />
              <span className="hidden font-display text-[0.82rem] font-bold uppercase tracking-[0.06em] text-ink sm:inline lg:text-[0.95rem]">{profile.wordmark}</span>
            </a>
          ) : (
            <TransitionLink href="/" transitionLabel="Home" className="flex items-center gap-3" aria-label={`${profile.wordmark} — ${profile.name}, home`}>
              <Monogram className="h-6 w-auto md:h-[1.65rem]" />
              <span className="hidden font-display text-[0.82rem] font-bold uppercase tracking-[0.06em] text-ink sm:inline lg:text-[0.95rem]">{profile.wordmark}</span>
            </TransitionLink>
          )}

          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex items-center gap-2 lg:gap-6">
              {navItems.map((item) => {
                const isActive = active === item.id;
                return (
                  <li key={item.id}>
                    <NavLink
                      id={item.id}
                      onHome={onHome}
                      aria-current={isActive ? "true" : undefined}
                      className={`group relative block px-3 py-2 text-sm font-medium lg:text-[0.95rem] transition-colors ${isActive ? "text-ink" : "text-soft hover:text-ink"}`}
                    >
                      <RollLabel text={item.label} />
                      {isActive && (
                        <motion.span
                          layoutId="nav-indicator"
                          aria-hidden
                          className="absolute inset-x-3 bottom-0.5 h-px bg-sky shadow-[0_0_8px_1px_rgba(96,165,250,0.8)]"
                          transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        />
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          <button
            ref={menuButton}
            type="button"
            className="-mr-2 grid size-11 place-items-center text-ink md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            data-lenis-prevent
            className="night-sky fixed inset-0 z-40 flex flex-col justify-between overflow-y-auto px-5 pb-10 pt-24 md:hidden"
            initial={reduced ? { opacity: 0 } : { clipPath: MENU_CLOSED }}
            animate={reduced ? { opacity: 1 } : { clipPath: MENU_OPEN }}
            exit={reduced ? { opacity: 0 } : { clipPath: MENU_CLOSED, transition: { duration: 0.45, ease: [0.55, 0, 1, 0.45] } }}
            transition={{ duration: 0.7, ease: seamEase }}
          >
            <div aria-hidden className="stars pointer-events-none absolute inset-0 opacity-60" />
            <nav aria-label="Mobile" className="relative">
              <ul>
                {navItems.map((item, i) => {
                  const isActive = active === item.id;
                  return (
                    <li key={item.id} className="overflow-hidden border-b border-edge/70">
                      <motion.div
                        initial={reduced ? false : { y: "100%" }}
                        animate={{ y: "0%" }}
                        exit={reduced ? undefined : { y: "-100%", transition: { duration: 0.35, delay: i * 0.015, ease: [0.55, 0, 1, 0.45] } }}
                        transition={{ delay: 0.25 + i * 0.05, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <NavLink
                          id={item.id}
                          onHome={onHome}
                          ref={i === 0 ? firstLink : undefined}
                          onClick={() => setOpen(false)}
                          aria-current={isActive ? "true" : undefined}
                          className="flex items-baseline gap-4 py-4 font-display text-[1.9rem] font-bold uppercase leading-none tracking-tight text-ink"
                        >
                          <span aria-hidden className="w-7 text-xs font-medium tracking-[0.14em] text-lilac">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className={isActive ? "text-gradient-blue" : undefined}>{item.label}</span>
                        </NavLink>
                      </motion.div>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="relative mt-10 flex flex-col gap-2 text-sm text-soft">
              <a href={`mailto:${profile.email}`} className="break-all underline-offset-4 hover:underline">
                {profile.email}
              </a>
              {profile.availability.show && (
                <p className="flex items-center gap-2.5 text-[0.8rem]">
                  <span aria-hidden className="size-2 rounded-full bg-mint shadow-[0_0_10px_2px_rgba(52,211,153,0.55)]" />
                  {profile.availability.label}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

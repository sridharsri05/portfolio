"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CodeXml, Database, Monitor, Server, Sparkles, Wrench, type LucideIcon } from "lucide-react";
import { CrystalCanvas } from "@/components/three/crystal/CrystalCanvas";
import { AI_ASSISTED_LABEL, skillGroups, type SkillGroupId } from "@/data/skills";
import { gsap, useGSAP } from "@/lib/gsap";

/* Per-card look + desktop placement, read from the reference (ref/skills.png). */
const CARD: Record<SkillGroupId, { icon: LucideIcon; tint: string; place: string }> = {
  frontend: {
    icon: Monitor,
    tint: "bg-blue/20 text-sky ring-blue/40",
    place: "lg:left-0 lg:top-[12.5%] lg:w-[33%]",
  },
  databases: {
    icon: Database,
    tint: "bg-cyan/15 text-cyan ring-cyan/40",
    place: "lg:left-0 lg:top-[52%] lg:w-[33%]",
  },
  tools: {
    icon: Wrench,
    tint: "bg-violet/20 text-lilac ring-violet/45",
    place: "lg:left-[35%] lg:top-[57%] lg:w-[32%]",
  },
  backend: {
    icon: Server,
    tint: "bg-violet/20 text-lilac ring-violet/45",
    place: "lg:right-[1.5%] lg:top-[1%] lg:w-[29.5%]",
  },
  ai: {
    icon: Sparkles,
    tint: "bg-indigo/25 text-lilac ring-indigo/45",
    place: "lg:right-0 lg:top-[44%] lg:w-[29.5%]",
  },
};

type Line = { id: SkillGroupId; d: string; x: number; y: number };
type ActiveSkill = { group: SkillGroupId; name: string } | null;

const LG = 1024;

/**
 * Centre crystal + five glass cards with SVG connectors (desktop). Below lg the
 * crystal sits on top and the cards stack; connectors are hidden there.
 * Every skill is a real button with a screen-reader description, so the notes
 * are reachable by keyboard and touch, not just hover.
 */
export function SkillsConstellation() {
  const stage = useRef<HTMLDivElement>(null);
  const hub = useRef<HTMLDivElement>(null);
  const cards = useRef(new Map<SkillGroupId, HTMLLIElement>());
  const titles = useRef(new Map<SkillGroupId, HTMLSpanElement>());
  const [lines, setLines] = useState<Line[]>([]);
  const [drawn, setDrawn] = useState(false);
  const [activeGroup, setActiveGroup] = useState<SkillGroupId | null>(null);
  const [activeSkill, setActiveSkill] = useState<ActiveSkill>(null);

  // Connectors are measured from the live layout so they follow fluid card sizes.
  const measure = useCallback(() => {
    const box = stage.current?.getBoundingClientRect();
    const h = hub.current?.getBoundingClientRect();
    if (!box || !h || window.innerWidth < LG) {
      setLines([]);
      return;
    }
    const cx = h.left + h.width / 2 - box.left;
    const cy = h.top + h.height / 2 - box.top;
    const r = h.width / 2 + 6;
    const next: Line[] = [];
    for (const g of skillGroups) {
      const li = cards.current.get(g.id);
      const list = li?.offsetParent?.getBoundingClientRect();
      if (!li || !list) continue;
      // offset* ignores transforms, so the GSAP pop-in (scale/y) can't skew the measured anchors.
      const el = { width: li.offsetWidth, height: li.offsetHeight };
      const left = list.left - box.left + li.offsetLeft;
      const right = left + el.width;
      const top = list.top - box.top + li.offsetTop;
      const midY = top + el.height / 2;
      let x1: number;
      let y1: number;
      let d: string;
      if (cx > left && cx < right) {
        // Card sits under the hub (Tools): leave from its top edge and rise.
        x1 = left + Math.min(el.width * 0.25, 90);
        y1 = top;
        const ang = Math.atan2(y1 - cy, x1 - cx);
        const x2 = cx + Math.cos(ang) * r;
        const y2 = cy + Math.sin(ang) * r;
        const my = y1 + (y2 - y1) * 0.5;
        d = `M${x1} ${y1} C${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
      } else {
        x1 = cx < left ? left : right;
        y1 = midY;
        const ang = Math.atan2(y1 - cy, x1 - cx);
        const x2 = cx + Math.cos(ang) * r;
        const y2 = cy + Math.sin(ang) * r;
        const mx = x1 + (x2 - x1) * 0.5;
        d = `M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
      }
      next.push({ id: g.id, d, x: x1, y: y1 });
    }
    setLines(next);
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const ro = new ResizeObserver(measure);
    if (stage.current) ro.observe(stage.current);
    // Web fonts change card heights after first paint.
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [measure]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const el = stage.current;
        if (!el) return;
        // Cards pop in (back.out) — content stays visible without JS because GSAP sets the "from" state.
        gsap.from("[data-skill-card]", {
          opacity: 0, // not autoAlpha: buttons must stay in the Tab order before the reveal
          y: 22,
          scale: 0.94,
          duration: 0.7,
          ease: "back.out(1.7)",
          stagger: 0.07,
          scrollTrigger: { trigger: el, start: "top 78%", once: true, onEnter: () => setDrawn(true) },
        });
      });
      mm.add("(prefers-reduced-motion: reduce)", () => setDrawn(true));
    },
    { scope: stage },
  );

  // Title "decode" on pointer hover (motion spec 13). Purely visual: the h3 keeps
  // a stable sr-only name, the scrambled span is aria-hidden.
  const scramble = useCallback(async (id: SkillGroupId) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = titles.current.get(id);
    const text = skillGroups.find((g) => g.id === id)?.title;
    if (!el || !text) return;
    const { ScrambleTextPlugin } = await import("gsap/ScrambleTextPlugin");
    gsap.registerPlugin(ScrambleTextPlugin);
    gsap.to(el, { duration: 0.5, overwrite: true, scrambleText: { text, chars: "01<>/{}#", speed: 0.6, revealDelay: 0.1 } });
  }, []);

  const lit = (id: SkillGroupId) => activeGroup === id;

  return (
    <div ref={stage} className="relative mt-6 lg:mt-3 lg:h-[450px]">
      {/* Connectors (desktop). pathLength=1 lets a CSS dashoffset draw each one in. */}
      <svg aria-hidden className="pointer-events-none absolute inset-0 z-[1] hidden h-full w-full overflow-visible lg:block">
        <defs>
          <linearGradient id="skill-link" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#60a5fa" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
          <filter id="skill-link-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
        </defs>
        {lines.map((l, i) => {
          const on = lit(l.id);
          const dim = activeGroup !== null && !on;
          const draw = {
            strokeDasharray: 1,
            strokeDashoffset: drawn ? 0 : 1,
            transition: `stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1) ${0.25 + i * 0.04}s, opacity 0.35s`,
          };
          return (
            <g key={l.id} style={{ opacity: dim ? 0.35 : on ? 1 : 0.7, transition: "opacity 0.35s" }}>
              {/* Soft glow copy under the hairline; only shown at full strength on the lit link. */}
              <path
                d={l.d}
                pathLength={1}
                fill="none"
                stroke="url(#skill-link)"
                strokeWidth={on ? 4 : 3}
                filter="url(#skill-link-glow)"
                style={{ ...draw, opacity: on ? 0.9 : 0.35 }}
              />
              <path d={l.d} pathLength={1} fill="none" stroke="url(#skill-link)" strokeWidth={on ? 1.4 : 1} style={draw} />
              <circle cx={l.x} cy={l.y} r={on ? 3.2 : 2.4} fill="#93c5fd" style={{ opacity: drawn ? 1 : 0, transition: "opacity 0.4s 0.6s" }} />
            </g>
          );
        })}
      </svg>

      {/* Centre visual: Three.js crystal (decorative) with the glowing </> badge as HTML on top. */}
      <div
        aria-hidden
        className="relative mx-auto -my-4 lg:my-0 size-[min(68vw,270px)] lg:absolute lg:left-[51%] lg:top-[25%] lg:size-[clamp(320px,30vw,410px)] lg:-translate-x-1/2 lg:-translate-y-1/2"
      >
        <CrystalCanvas preset="skills" />
        <div
          ref={hub}
          className="absolute left-1/2 top-1/2 z-[2] grid size-[clamp(84px,8.5vw,120px)] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-sky/50 bg-[radial-gradient(circle_at_50%_35%,#3b6dff_0%,#2135b8_55%,#0d1a5c_100%)] shadow-[0_0_40px_6px_rgba(59,130,246,0.55),0_0_90px_20px_rgba(99,102,241,0.3),inset_0_1px_0_rgba(255,255,255,0.35)]"
        >
          <CodeXml className="size-[42%] text-white drop-shadow-[0_0_8px_rgba(147,197,253,0.9)]" strokeWidth={2.2} />
        </div>
      </div>

      <ul className="relative z-[2] mt-6 grid gap-4 sm:grid-cols-2 lg:absolute lg:inset-0 lg:mt-0 lg:block">
        {skillGroups.map((group) => {
          const { icon: Icon, tint, place } = CARD[group.id];
          const on = lit(group.id);
          const shown = activeSkill?.group === group.id ? group.skills.find((s) => s.name === activeSkill.name) : undefined;
          // Top-row cards open their note below, so it never covers the section heading text above them.
          const noteBelow = group.id === "frontend" || group.id === "backend";
          return (
            <li
              key={group.id}
              data-skill-card
              ref={(el) => {
                if (el) cards.current.set(group.id, el);
                else cards.current.delete(group.id);
              }}
              onPointerEnter={(e) => {
                setActiveGroup(group.id);
                if (e.pointerType === "mouse") void scramble(group.id);
              }}
              onPointerLeave={() => {
                setActiveGroup(null);
                setActiveSkill(null);
              }}
              onFocus={() => setActiveGroup(group.id)}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setActiveGroup(null);
                  setActiveSkill(null);
                }
              }}
              className={`glass relative rounded-2xl p-5 transition-[border-color,box-shadow] duration-400 ease-[var(--ease-out-expo)] lg:absolute ${place} ${shown ? "z-40" : ""} ${
                on ? "border-indigo/70! shadow-[0_0_0_1px_rgba(99,102,241,0.25),0_0_42px_-6px_rgba(99,102,241,0.6)]!" : ""
              }`}
            >
              <div className="flex items-start gap-4">
                <span aria-hidden className={`grid size-10 shrink-0 place-items-center rounded-full ring-1 ${tint}`}>
                  <Icon className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="pt-1.5 font-display text-base font-semibold text-ink">
                    <span className="sr-only">{group.title}</span>
                    <span
                      aria-hidden
                      ref={(el) => {
                        if (el) titles.current.set(group.id, el);
                        else titles.current.delete(group.id);
                      }}
                    >
                      {group.title}
                    </span>
                  </h3>
                  <ul className="mt-3.5 flex flex-wrap gap-x-5 gap-y-2.5 text-[13.5px] text-soft">
                    {group.skills.map((s) => {
                      const noteId = `skill-note-${group.id}-${s.name.replace(/\W+/g, "-").toLowerCase()}`;
                      const sel = shown?.name === s.name;
                      return (
                        <li key={s.name}>
                          <button
                            type="button"
                            aria-describedby={noteId}
                            onPointerEnter={(e) => e.pointerType === "mouse" && setActiveSkill({ group: group.id, name: s.name })}
                            onFocus={() => setActiveSkill({ group: group.id, name: s.name })}
                            onClick={() => setActiveSkill(sel ? null : { group: group.id, name: s.name })}
                            onKeyDown={(e) => e.key === "Escape" && setActiveSkill(null)}
                            className={`rounded-sm transition-colors hover:text-ink ${sel ? "text-ink" : ""}`}
                          >
                            {s.name}
                            {s.aiAssisted && (
                              <sup aria-hidden className="ml-0.5 text-[9px] text-lilac">
                                ✦
                              </sup>
                            )}
                          </button>
                          <span id={noteId} className="sr-only">
                            {s.aiAssisted ? `${AI_ASSISTED_LABEL}. ` : ""}
                            {s.note}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              {/* Visual note popover; the same text is already announced via aria-describedby. */}
              {shown && (
                <div
                  aria-hidden
                  className={`pointer-events-none absolute inset-x-3 z-30 rounded-xl border border-indigo/50 bg-[#0a1024] px-4 py-3 text-[12.5px] leading-relaxed text-soft shadow-[0_18px_50px_-12px_rgba(0,0,0,0.9),0_0_0_1px_rgba(99,102,241,0.15)] ${
                    noteBelow ? "top-[calc(100%+8px)]" : "bottom-[calc(100%+8px)]"
                  }`}
                >
                  <p className="font-display text-[13px] font-semibold text-ink">
                    {shown.name}
                    {shown.aiAssisted && <span className="ml-2 text-[11px] font-medium text-lilac">✦ {AI_ASSISTED_LABEL}</span>}
                  </p>
                  <p className="mt-1">{shown.note}</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="relative z-[2] mt-6 text-xs text-muted lg:absolute lg:bottom-[-28px] lg:left-0 lg:mt-0">
        <span aria-hidden className="text-lilac">✦</span> {AI_ASSISTED_LABEL} — select a skill for a short note.
      </p>
    </div>
  );
}

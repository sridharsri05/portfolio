"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Pause, Play } from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/useClientEnv";

/*
 * Illustrative pledge lifecycle. All names, numbers and rules below are mock
 * values chosen to explain the concept — they are not the client's rates or logic.
 */

type StageId = "create" | "accrue" | "renew" | "redeem" | "auction" | "close";

const STAGES: { id: StageId; label: string; detail: string; screen: string[] }[] = [
  {
    id: "create",
    label: "Pledge created",
    detail: "Gold items are recorded against a customer and a loan amount is issued at the branch counter.",
    screen: ["PLEDGE    #DEMO-0001", "BRANCH    Branch A", "ITEMS     2 · gold", "PRINCIPAL 50,000.00", "STATUS    ACTIVE"],
  },
  {
    id: "accrue",
    label: "Interest accrues",
    detail: "Interest builds over the pledge period. Every screen and report reads the same backend-computed figure.",
    screen: ["PLEDGE    #DEMO-0001", "ELAPSED   3 months", "RATE      mock 1.5%/mo", "INTEREST  2,250.00", "STATUS    ACTIVE"],
  },
  {
    id: "renew",
    label: "Renewal",
    detail: "The customer settles interest and the pledge continues for a new period — the lifecycle loops back to accrual.",
    screen: ["PLEDGE    #DEMO-0001", "ACTION    RENEW", "PAID      interest due", "NEW TERM  starts today", "STATUS    ACTIVE"],
  },
  {
    id: "redeem",
    label: "Redemption",
    detail: "Principal plus interest is paid and the gold is returned. The pledge closes.",
    screen: ["PLEDGE    #DEMO-0001", "ACTION    REDEEM", "SETTLED   principal+int", "ITEMS     returned", "STATUS    CLOSED"],
  },
  {
    id: "auction",
    label: "Auction",
    detail: "A pledge left overdue past its term becomes eligible for auction, following the business's rules.",
    screen: ["PLEDGE    #DEMO-0007", "OVERDUE   yes", "ELIGIBLE  auction", "LOT       DEMO-LOT-03", "STATUS    AUCTION"],
  },
  {
    id: "close",
    label: "Day-end close",
    detail: "Each branch reconciles the day's pledges, renewals, redemptions and cash before the books close.",
    screen: ["DAY-END   Branch A", "PLEDGES   +4", "RENEWALS  2", "REDEEMED  3", "CASH      reconciled"],
  },
];

// Node positions in the SVG diagram (viewBox 920 x 300).
const NODES: Record<StageId, { x: number; y: number }> = {
  create: { x: 90, y: 110 },
  accrue: { x: 290, y: 110 },
  renew: { x: 520, y: 40 },
  redeem: { x: 520, y: 140 },
  auction: { x: 520, y: 240 },
  close: { x: 800, y: 140 },
};

const EDGES: [StageId, StageId][] = [
  ["create", "accrue"],
  ["accrue", "renew"],
  ["accrue", "redeem"],
  ["accrue", "auction"],
  ["redeem", "close"],
  ["auction", "close"],
  ["renew", "close"],
];

function edgePath(a: StageId, b: StageId) {
  const p = NODES[a];
  const q = NODES[b];
  const x1 = p.x + 70;
  const x2 = q.x - 70;
  const mx = (x1 + x2) / 2;
  return `M${x1} ${p.y} C${mx} ${p.y}, ${mx} ${q.y}, ${x2} ${q.y}`;
}

const BRANCHES = [
  { id: "A", pledges: 4, renewals: 2, redeemed: 3 },
  { id: "B", pledges: 6, renewals: 1, redeemed: 2 },
  { id: "C", pledges: 2, renewals: 3, redeemed: 1 },
];

export function PawnWorkflow() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [months, setMonths] = useState(3);
  const [branch, setBranch] = useState("A");
  const reduced = usePrefersReducedMotion();
  const stage = STAGES[index];

  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % STAGES.length), 2600);
    return () => window.clearInterval(t);
  }, [playing]);

  // Mock-only concept: 12-month term, auction eligibility after 2 overdue months.
  const term = 12;
  const state = months < term ? "Active" : months === term ? "Renewal due" : months <= term + 1 ? "Overdue" : "Auction eligible";
  const interest = (50000 * 0.015 * months).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  const b = BRANCHES.find((x) => x.id === branch)!;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-px overflow-hidden rounded-2xl border border-edge bg-edge shadow-[0_30px_80px_-40px_rgba(79,70,229,0.5)]">
      {/* Diagram */}
      <div className="blueprint relative bg-graphite p-4 md:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-mist">Pledge lifecycle — select a stage or play through it.</p>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="inline-flex items-center gap-2 rounded-full border border-edge-strong bg-navy/60 px-4 py-1.5 text-sm text-frost transition-colors hover:border-lilac"
            aria-pressed={playing}
          >
            {playing ? <Pause aria-hidden className="size-4" /> : <Play aria-hidden className="size-4" />}
            {playing ? "Pause" : "Play"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <svg viewBox="0 0 920 300" className="mx-auto min-w-[640px] max-w-[980px]" aria-hidden>
            {EDGES.map(([a, c]) => {
              const on = stage.id === a || stage.id === c;
              return (
                <path
                  key={`${a}-${c}`}
                  d={edgePath(a, c)}
                  fill="none"
                  stroke={on ? "#8b7cff" : "#2b3a66"}
                  strokeWidth={on ? 2 : 1.2}
                  strokeDasharray={c === "close" ? "5 6" : undefined}
                  className="transition-[stroke] duration-500"
                />
              );
            })}
            {/* Renewal loops back into accrual. */}
            <path d="M450 40 C 380 0, 300 30, 300 78" fill="none" stroke={stage.id === "renew" ? "#8b7cff" : "#2b3a66"} strokeWidth="1.2" markerEnd="url(#arrow)" />
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 z" fill="#8d98bb" />
              </marker>
            </defs>
            {STAGES.map((s, i) => {
              const n = NODES[s.id];
              const on = i === index;
              return (
                <g key={s.id} transform={`translate(${n.x - 70} ${n.y - 22})`} className="cursor-pointer" onClick={() => setIndex(i)}>
                  <rect width="140" height="44" rx="12" fill={on ? "#1d1b4d" : "#0b1228"} stroke={on ? "#8b7cff" : "#2b3a66"} className="transition-[fill,stroke] duration-500" />
                  <text x="70" y="27" textAnchor="middle" fill={on ? "#eef1ff" : "#c3cbe6"} fontSize="13" fontFamily="var(--font-sora)">
                    {s.label}
                  </text>
                </g>
              );
            })}
            {/* Travelling token marks the active stage. */}
            <motion.circle
              r="6"
              fill="#8b7cff"
              initial={false}
              animate={{ cx: NODES[stage.id].x - 70, cy: NODES[stage.id].y }}
              transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 90, damping: 16 }}
            />
          </svg>
        </div>

        <ol className="mt-4 flex flex-wrap gap-2" aria-label="Lifecycle stages">
          {STAGES.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  setIndex(i);
                  setPlaying(false);
                }}
                aria-current={i === index ? "step" : undefined}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${i === index ? "border-violet bg-violet/20 text-frost" : "border-edge text-steel hover:text-frost"}`}
              >
                {i + 1}. {s.label}
              </button>
            </li>
          ))}
        </ol>
      </div>

      {/* Stage detail + mock terminal screen */}
      <div className="grid gap-px bg-line md:grid-cols-2">
        <div className="bg-graphite p-6 md:p-8" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.div key={stage.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.25 }}>
              <p className="text-xs text-steel">Stage {index + 1} of {STAGES.length}</p>
              <h3 className="mt-2 font-display text-2xl font-bold">{stage.label}</h3>
              <p className="mt-3 max-w-[48ch] leading-relaxed text-mist">{stage.detail}</p>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="bg-void p-6 font-mono text-[13px] leading-7 text-mist md:p-8">
          <p className="mb-2 text-[11px] text-steel">Illustrative counter screen · mock data</p>
          {stage.screen.map((l) => (
            <p key={l} className="whitespace-pre">
              {l}
            </p>
          ))}
        </div>
      </div>

      {/* Concept explorers */}
      <div className="grid gap-px bg-line md:grid-cols-2">
        <div className="bg-graphite p-6 md:p-8">
          <label htmlFor="pawn-months" className="text-sm font-semibold">
            Pledge over time
          </label>
          <p className="mt-1 text-xs text-steel">Mock rule: 12-month term, mock 1.5% monthly interest on 50,000.</p>
          <input
            id="pawn-months"
            type="range"
            min={0}
            max={15}
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="mt-5 w-full accent-[var(--color-violet)]"
            aria-valuetext={`${months} months elapsed, ${state}`}
          />
          <div className="mt-4 grid grid-cols-3 gap-4 font-mono text-sm">
            <div>
              <p className="text-[11px] text-steel">Elapsed</p>
              <p className="text-frost">{months} mo</p>
            </div>
            <div>
              <p className="text-[11px] text-steel">Interest</p>
              <p className="text-frost">{interest}</p>
            </div>
            <div>
              <p className="text-[11px] text-steel">State</p>
              <p className={state === "Active" ? "text-signal" : state === "Renewal due" ? "text-gold" : "text-alert"}>{state}</p>
            </div>
          </div>
        </div>
        <div className="bg-graphite p-6 md:p-8">
          <p className="text-sm font-semibold" id="branch-label">
            Branches and day-end close
          </p>
          <p className="mt-1 text-xs text-steel">Each branch closes its own day; head office sees all of them.</p>
          <div className="mt-5 flex gap-2" role="radiogroup" aria-labelledby="branch-label">
            {BRANCHES.map((x) => (
              <button
                key={x.id}
                type="button"
                role="radio"
                aria-checked={branch === x.id}
                onClick={() => setBranch(x.id)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${branch === x.id ? "border-violet bg-violet/20 text-frost" : "border-edge text-steel hover:text-frost"}`}
              >
                Branch {x.id}
              </button>
            ))}
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-4 font-mono text-sm">
            <div>
              <dt className="text-[11px] text-steel">New pledges</dt>
              <dd className="text-frost">{b.pledges}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-steel">Renewals</dt>
              <dd className="text-frost">{b.renewals}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-steel">Redeemed</dt>
              <dd className="text-frost">{b.redeemed}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

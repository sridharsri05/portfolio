import type { Project } from "@/data/projects";

/*
 * Original, abstract "signature" illustrations for each case study — used as
 * hover previews and case-study covers. Pure SVG: no client code, no real data.
 */

const ACCENT: Record<Project["accent"], string> = {
  signal: "#3fe0f0",
  ice: "#a9d8ff",
  iris: "#9b8cff",
};

function PawnArt({ accent }: { accent: string }) {
  // Pledge lifecycle drawn as a dial: active → renewal → redemption / auction.
  const arcs = [
    { from: -90, to: 40, label: "Active" },
    { from: 46, to: 140, label: "Renewal" },
    { from: 146, to: 210, label: "Redeem" },
    { from: 216, to: 264, label: "Auction" },
  ];
  const polar = (deg: number, r: number) => {
    const a = (deg * Math.PI) / 180;
    // Rounded so server and client produce identical SVG attributes (avoids hydration mismatch).
    return [Math.round((200 + r * Math.cos(a)) * 100) / 100, Math.round((150 + r * Math.sin(a)) * 100) / 100];
  };
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" role="img" aria-label="Abstract pledge lifecycle dial">
      <rect width="400" height="300" fill="#0c0f16" />
      <g stroke="#222838">
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={i} x1="0" x2="400" y1={i * 36 + 6} y2={i * 36 + 6} />
        ))}
      </g>
      {arcs.map((a, i) => {
        const [x1, y1] = polar(a.from, 92);
        const [x2, y2] = polar(a.to, 92);
        const large = a.to - a.from > 180 ? 1 : 0;
        const [lx, ly] = polar((a.from + a.to) / 2, 124);
        return (
          <g key={a.label}>
            <path d={`M${x1} ${y1} A92 92 0 ${large} 1 ${x2} ${y2}`} fill="none" stroke={i === 0 ? accent : "#5b6478"} strokeWidth={i === 0 ? 6 : 3} />
            <text x={lx} y={ly} fill={i === 0 ? accent : "#8e97aa"} fontSize="11" fontFamily="var(--font-jetbrains), monospace" textAnchor="middle" dominantBaseline="middle">
              {a.label}
            </text>
          </g>
        );
      })}
      <circle cx="200" cy="150" r="54" fill="none" stroke="#f2c66d" strokeWidth="10" opacity="0.9" />
      <circle cx="200" cy="150" r="54" fill="none" stroke="#fff3d1" strokeWidth="1" opacity="0.6" strokeDasharray="2 6" />
      <text x="200" y="146" fill="#eaf0f7" fontSize="13" fontFamily="var(--font-jetbrains), monospace" textAnchor="middle">PLEDGE</text>
      <text x="200" y="164" fill="#8e97aa" fontSize="10" fontFamily="var(--font-jetbrains), monospace" textAnchor="middle">#DEMO-0001</text>
    </svg>
  );
}

/** Deterministic pseudo-QR pattern — decorative only; the real QR lives in the interactive demo. */
function qrCells(seed: number, n = 21) {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const finder = (x: number, y: number) =>
    [
      [0, 0],
      [n - 7, 0],
      [0, n - 7],
    ].some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);
  const cells: [number, number][] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!finder(x, y) && rand() > 0.52) cells.push([x, y]);
  return cells;
}

function TicketArt({ accent }: { accent: string }) {
  const cells = qrCells(42);
  const finders: [number, number][] = [
    [0, 0],
    [14, 0],
    [0, 14],
  ];
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" role="img" aria-label="Abstract ticket with QR code and scanner frame">
      <rect width="400" height="300" fill="#0c0f16" />
      {/* Ticket body with a perforated stub */}
      <path d="M70 52 H330 V128 a14 14 0 0 0 0 28 V248 H70 V156 a14 14 0 0 0 0 -28 Z" fill="#121620" stroke="#343c50" />
      <line x1="84" x2="316" y1="142" y2="142" stroke="#343c50" strokeDasharray="4 5" />
      <text x="90" y="80" fill="#eaf0f7" fontSize="12" fontFamily="var(--font-jetbrains), monospace">ENTRY · ADULT</text>
      <text x="90" y="100" fill="#8e97aa" fontSize="10" fontFamily="var(--font-jetbrains), monospace">DEMO-TKT-0001</text>
      <text x="90" y="118" fill="#8e97aa" fontSize="10" fontFamily="var(--font-jetbrains), monospace">COUNTER 02</text>
      <g transform="translate(222 152) scale(4)">
        {finders.map(([fx, fy], i) => (
          <g key={i} transform={`translate(${fx} ${fy})`}>
            <rect width="7" height="7" fill="#eaf0f7" />
            <rect x="1" y="1" width="5" height="5" fill="#121620" />
            <rect x="2" y="2" width="3" height="3" fill="#eaf0f7" />
          </g>
        ))}
        {cells.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#eaf0f7" />
        ))}
      </g>
      {/* Scanner frame */}
      <g stroke={accent} strokeWidth="3" fill="none">
        <path d="M206 140 v-10 h12" />
        <path d="M322 140 v-10 h-12" />
        <path d="M206 254 v10 h12" />
        <path d="M322 254 v10 h-12" />
      </g>
      <line x1="208" x2="320" y1="196" y2="196" stroke={accent} strokeWidth="2" opacity="0.9" />
    </svg>
  );
}

function TempleArt({ accent }: { accent: string }) {
  const tiers = 7;
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" role="img" aria-label="Abstract pagoda tower with light nodes on each floor">
      <rect width="400" height="300" fill="#0c0f16" />
      <line x1="200" x2="200" y1="20" y2="42" stroke="#8e97aa" strokeWidth="2" />
      {Array.from({ length: tiers }).map((_, i) => {
        const level = tiers - 1 - i; // 0 = bottom
        const w = 70 + level * 22;
        const y = 44 + i * 32;
        const lights = 5 + level;
        return (
          <g key={i}>
            <path d={`M${200 - w / 2 - 14} ${y + 12} L${200 - w / 2 + 6} ${y} H${200 + w / 2 - 6} L${200 + w / 2 + 14} ${y + 12} Z`} fill="#1b2130" stroke="#343c50" />
            <rect x={200 - w / 2 + 8} y={y + 12} width={w - 16} height="18" fill="#121620" stroke="#222838" />
            {Array.from({ length: lights }).map((__, j) => {
              const lit = (i * 3 + j * 5) % 4 !== 0;
              return (
                <circle
                  key={j}
                  cx={200 - (w - 30) / 2 + (j * (w - 30)) / (lights - 1)}
                  cy={y + 21}
                  r="2.6"
                  fill={lit ? (i === 3 ? accent : "#f2c66d") : "#343c50"}
                  opacity={lit ? 1 : 0.8}
                />
              );
            })}
          </g>
        );
      })}
      <rect x="96" y="268" width="208" height="8" fill="#1b2130" stroke="#343c50" />
    </svg>
  );
}

export function ProjectArt({ project }: { project: Project }) {
  const accent = ACCENT[project.accent];
  if (project.demo === "pawn") return <PawnArt accent={accent} />;
  if (project.demo === "ticketing") return <TicketArt accent={accent} />;
  return <TempleArt accent={accent} />;
}

export const accentHex = ACCENT;

/** Section label from the reference: "02  ABOUT ME" — bright blue number, then the uppercase label. */
export function SectionKicker({ index, label, className = "" }: { index: string; label: string; className?: string }) {
  return (
    <p className={`kicker flex items-center gap-3 ${className}`} data-kicker>
      <span className="font-bold text-cyan [text-shadow:0_0_12px_rgba(56,189,248,0.55)]">{index}</span>
      <span>{label}</span>
    </p>
  );
}

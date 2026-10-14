/** Section label from the reference: "02  ABOUT ME" — bright blue number, then the uppercase label. */
export function SectionKicker({ index, label, className = "" }: { index: string; label: string; className?: string }) {
  return (
    <p className={`kicker flex items-center gap-3 ${className}`} data-kicker>
      <span className="font-bold text-[#4f8bff] [text-shadow:0_0_12px_rgba(79,139,255,0.65)]">{index}</span>
      <span>{label}</span>
    </p>
  );
}

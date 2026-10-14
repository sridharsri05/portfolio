"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import QRCode from "qrcode";
import { Printer, RotateCcw, ScanLine } from "lucide-react";

/*
 * Interactive, client-side demonstration of the ticket journey. Ticket codes,
 * prices and commissions are mock values generated in the browser — nothing
 * here talks to the real system, and the QR codes encode a "not a real ticket" note.
 */

type TicketType = "Adult" | "Child" | "Partner";
type Ticket = { id: string; type: TicketType; status: "issued" | "entered" };
type ScanResult = { ticketId: string; ok: boolean; message: string } | null;

const PRICE: Record<TicketType, number> = { Adult: 10, Child: 5, Partner: 10 };
const COMMISSION = 0.1;

const STEPS = [
  { n: 1, title: "Ticket creation", app: "counter", text: "Counter staff choose a ticket type and issue it." },
  { n: 2, title: "QR generation", app: "counter", text: "A unique code is generated and printed on a 58mm thermal receipt." },
  { n: 3, title: "Scanner validation", app: "scanner", text: "The gate scanner reads the QR and checks the ticket's state with the backend." },
  { n: 4, title: "Gate entry", app: "scanner", text: "Valid tickets are marked as used and the visitor enters. A repeat scan is rejected." },
  { n: 5, title: "Reporting & reconciliation", app: "admin", text: "Admin sees sales, entries and partner commissions; issued vs. entered reconcile." },
] as const;

function useQr(text: string | null) {
  const [svg, setSvg] = useState<{ text: string; markup: string } | null>(null);
  useEffect(() => {
    if (!text) return;
    let cancelled = false;
    QRCode.toString(text, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#05060a", light: "#ffffff" } }).then((markup) => {
      if (!cancelled) setSvg({ text, markup });
    });
    return () => {
      cancelled = true;
    };
  }, [text]);
  return svg && svg.text === text ? svg.markup : null;
}

function AppPanel({ title, subtitle, active, children }: { title: string; subtitle: string; active: boolean; children: ReactNode }) {
  return (
    <div className={`relative flex flex-col bg-graphite p-5 transition-shadow duration-500 md:p-6 ${active ? "shadow-[inset_0_0_0_1px_var(--color-ice)]" : ""}`}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <p className="font-display text-lg font-bold">{title}</p>
        <p className="text-xs text-steel">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

export function TicketJourney() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [type, setType] = useState<TicketType>("Adult");
  const [current, setCurrent] = useState<string | null>(null);
  const [scan, setScan] = useState<ScanResult>(null);
  const [step, setStep] = useState(1);
  const [scanning, setScanning] = useState(false);

  const ticket = tickets.find((t) => t.id === current) ?? null;
  const payload = ticket ? `${ticket.id}|${ticket.type.toUpperCase()}|PORTFOLIO-DEMO-NOT-A-REAL-TICKET` : null;
  const qr = useQr(payload);

  function issue() {
    const id = `DEMO-TKT-${String(tickets.length + 1).padStart(4, "0")}`;
    setTickets((ts) => [...ts, { id, type, status: "issued" }]);
    setCurrent(id);
    setScan(null);
    setStep(2);
  }

  function scanCurrent() {
    if (!ticket || scanning) return;
    setScanning(true);
    setStep(3);
    window.setTimeout(() => {
      setScanning(false);
      if (ticket.status === "entered") {
        setScan({ ticketId: ticket.id, ok: false, message: "Rejected — this ticket has already been used." });
      } else {
        setTickets((ts) => ts.map((t) => (t.id === ticket.id ? { ...t, status: "entered" } : t)));
        setScan({ ticketId: ticket.id, ok: true, message: "Valid — entry recorded." });
        setStep(4);
      }
    }, 700);
  }

  function reset() {
    setTickets([]);
    setCurrent(null);
    setScan(null);
    setStep(1);
  }

  const report = useMemo(() => {
    const issued = tickets.length;
    const entered = tickets.filter((t) => t.status === "entered").length;
    const sales = tickets.reduce((s, t) => s + PRICE[t.type], 0);
    const commission = tickets.filter((t) => t.type === "Partner").length * PRICE.Partner * COMMISSION;
    const byType = (["Adult", "Child", "Partner"] as TicketType[]).map((k) => ({ k, n: tickets.filter((t) => t.type === k).length }));
    return { issued, entered, outstanding: issued - entered, sales, commission, byType };
  }, [tickets]);

  const activeApp = STEPS[step - 1].app;

  return (
    <div className="overflow-hidden rounded-2xl border border-edge shadow-[0_30px_80px_-40px_rgba(79,70,229,0.5)]">
      {/* Step rail */}
      <ol className="grid grid-cols-5 border-b border-line bg-void" aria-label="Ticket journey">
        {STEPS.map((s) => (
          <li key={s.n}>
            <button
              type="button"
              onClick={() => setStep(s.n)}
              aria-current={step === s.n ? "step" : undefined}
              className={`relative h-full w-full px-2 py-4 text-left transition-colors md:px-4 ${step === s.n ? "text-frost" : "text-steel hover:text-frost"}`}
            >
              <span className="block text-xs tabular-nums">{s.n}</span>
              <span className="mt-1 hidden text-sm leading-tight sm:block">{s.title}</span>
              {step === s.n && <motion.span layoutId="ticket-step" className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-indigo via-violet to-sky" />}
            </button>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-graphite px-5 py-4 md:px-6">
        <p className="text-sm text-mist" aria-live="polite">
          <span className="text-frost">{STEPS[step - 1].title}.</span> {STEPS[step - 1].text}
        </p>
        <button type="button" onClick={reset} className="inline-flex items-center gap-2 text-sm text-steel hover:text-frost">
          <RotateCcw aria-hidden className="size-4" /> Reset demo
        </button>
      </div>

      <div className="grid gap-px bg-line lg:grid-cols-3">
        {/* COUNTER */}
        <AppPanel title="Counter" subtitle="Sells & prints" active={activeApp === "counter"}>
          <fieldset>
            <legend className="text-xs text-steel">Ticket type</legend>
            <div className="mt-2 flex gap-2">
              {(["Adult", "Child", "Partner"] as TicketType[]).map((t) => (
                <label key={t} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal ${type === t ? "border-ice text-frost" : "border-line text-steel"}`}>
                  <input type="radio" name="ticket-type" value={t} checked={type === t} onChange={() => setType(t)} className="sr-only" />
                  {t}
                </label>
              ))}
            </div>
          </fieldset>
          <button type="button" onClick={issue} className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#4f5bff] to-violet px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_30px_-12px_rgba(99,102,241,0.8)] transition-[filter] hover:brightness-110">
            <Printer aria-hidden className="size-4" /> Issue ticket
          </button>

          {/* 58mm receipt: 58mm paper ≈ 48mm printable — drawn narrow on purpose. */}
          <div className="mt-5 flex justify-center">
            <AnimatePresence mode="popLayout">
              {ticket ? (
                <motion.div
                  key={ticket.id}
                  initial={{ y: -24, opacity: 0, clipPath: "inset(0 0 100% 0)" }}
                  animate={{ y: 0, opacity: 1, clipPath: "inset(0 0 0% 0)" }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="w-[200px] rounded-sm bg-white px-4 pb-5 pt-4 font-mono text-[11px] leading-5 text-black"
                >
                  <p className="text-center font-bold">DEMO ATTRACTION</p>
                  <p className="text-center">Portfolio demo — not valid</p>
                  <p className="my-1 border-t border-dashed border-black/50" />
                  <p>TICKET  {ticket.id}</p>
                  <p>TYPE    {ticket.type.toUpperCase()}</p>
                  <p>PRICE   RM {PRICE[ticket.type].toFixed(2)} (mock)</p>
                  <div className="mx-auto mt-3 size-[120px] bg-white">
                    {qr ? <div className="size-full [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: qr }} /> : <div className="size-full animate-pulse bg-black/10" />}
                  </div>
                  <p className="mt-2 text-center">Scan at gate</p>
                </motion.div>
              ) : (
                <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-10 text-center text-sm text-steel">
                  Issue a ticket to print a receipt.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </AppPanel>

        {/* SCANNER */}
        <AppPanel title="Scanner" subtitle="Validates at the gate" active={activeApp === "scanner"}>
          <div className="relative mx-auto aspect-square w-full max-w-[240px] overflow-hidden rounded-xl bg-void" style={{ ["--scan-distance" as string]: "230px" }}>
            <div className="absolute inset-6 border border-line" />
            {["left-3 top-3 border-l-2 border-t-2", "right-3 top-3 border-r-2 border-t-2", "left-3 bottom-3 border-l-2 border-b-2", "right-3 bottom-3 border-r-2 border-b-2"].map((c) => (
              <span key={c} aria-hidden className={`absolute size-6 border-ice ${c}`} />
            ))}
            {qr && ticket && (
              <div className="absolute inset-12 bg-white p-2 opacity-90 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: qr }} />
            )}
            {scanning && <span aria-hidden className="absolute inset-x-4 top-2 h-0.5 bg-ice shadow-[0_0_14px_var(--color-ice)] [animation:scan_0.7s_ease-in-out]" />}
          </div>
          <button
            type="button"
            onClick={scanCurrent}
            disabled={!ticket || scanning}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-ice px-4 py-2.5 text-sm font-bold text-frost transition-colors hover:bg-ice hover:text-void disabled:cursor-not-allowed disabled:border-line disabled:text-steel disabled:hover:bg-transparent"
          >
            <ScanLine aria-hidden className="size-4" /> {scanning ? "Scanning…" : "Scan at gate"}
          </button>
          <div className="mt-4 min-h-[52px]" role="status" aria-live="polite">
            {scan && (
              <motion.p
                key={`${scan.ticketId}-${scan.message}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border-l-2 pl-3 text-sm ${scan.ok ? "border-signal text-frost" : "border-alert text-alert"}`}
              >
                <span className="font-mono text-xs text-steel">{scan.ticketId}</span>
                <br />
                {scan.message}
              </motion.p>
            )}
            {!scan && !ticket && <p className="text-sm text-steel">Waiting for a ticket from the counter.</p>}
            {!scan && ticket && <p className="text-sm text-steel">Scan the receipt. Try scanning it twice.</p>}
          </div>
        </AppPanel>

        {/* ADMIN */}
        <AppPanel title="Admin" subtitle="Reports & reconciles" active={activeApp === "admin"}>
          <dl className="grid grid-cols-3 gap-3 font-mono">
            {[
              ["Issued", report.issued],
              ["Entered", report.entered],
              ["Open", report.outstanding],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-edge bg-navy/50 p-3">
                <dt className="text-[11px] text-steel">{k}</dt>
                <dd className="mt-1 text-xl text-frost">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 grid gap-2 font-mono text-[13px]">
            {report.byType.map(({ k, n }) => (
              <div key={k} className="grid grid-cols-[64px_1fr_24px] items-center gap-3">
                <span className="text-steel">{k}</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-edge">
                  <motion.span
                    className="block h-full rounded-full bg-gradient-to-r from-indigo to-sky"
                    animate={{ width: report.issued ? `${(n / report.issued) * 100}%` : "0%" }}
                    transition={{ duration: 0.5 }}
                  />
                </span>
                <span className="text-right text-frost">{n}</span>
              </div>
            ))}
          </div>
          <dl className="mt-5 grid gap-1 border-t border-line pt-4 font-mono text-[13px]">
            <div className="flex justify-between">
              <dt className="text-steel">Sales (mock)</dt>
              <dd>RM {report.sales.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-steel">Partner commission (mock 10%)</dt>
              <dd>RM {report.commission.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-steel">Reconciliation</dt>
              <dd className={report.outstanding ? "text-gold" : "text-signal"}>
                {report.issued === 0 ? "—" : report.outstanding ? `${report.outstanding} not yet entered` : "All entered"}
              </dd>
            </div>
          </dl>
          <button type="button" onClick={() => setStep(5)} className="mt-5 self-start text-sm text-ice underline underline-offset-4 hover:text-frost">
            View reporting step
          </button>
        </AppPanel>
      </div>
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { motion } from "motion/react";
import { Database, Server } from "lucide-react";
import { useWebGLSupport } from "@/hooks/useClientEnv";
import { FLOORS, LIGHTS_PER_FLOOR, STATUS_COLOR, STATUS_LABEL, lightStatus, type LightStatus } from "./pagoda-data";

// Loaded only when a visitor reaches the temple case study.
const PagodaScene = dynamic(() => import("@/components/three/PagodaScene"), {
  ssr: false,
  loading: () => <div className="grid size-full place-items-center text-sm text-steel">Loading 3D model…</div>,
});

/* Mock tenants. No real temples, devotees or payments are represented. */
const TENANTS = [
  { id: "a", name: "Temple A", db: "tenant_a", plan: "Trial" },
  { id: "b", name: "Temple B", db: "tenant_b", plan: "Active" },
  { id: "c", name: "Temple C", db: "tenant_c", plan: "Renewal due" },
] as const;

const LIFECYCLE = ["Trial", "Active", "Renewal due", "Renewed"] as const;

function TenantArchitecture() {
  const [tenant, setTenant] = useState<(typeof TENANTS)[number]["id"]>("a");
  const t = TENANTS.find((x) => x.id === tenant)!;

  return (
    <div className="bg-graphite p-5 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-lg font-bold" id="tenant-label">
          Tenant isolation
        </p>
        <div className="flex gap-2" role="radiogroup" aria-labelledby="tenant-label">
          {TENANTS.map((x) => (
            <button
              key={x.id}
              type="button"
              role="radio"
              aria-checked={tenant === x.id}
              onClick={() => setTenant(x.id)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${tenant === x.id ? "border-iris bg-iris/20 text-frost" : "border-line text-steel hover:text-frost"}`}
            >
              {x.name}
            </button>
          ))}
        </div>
      </div>

      {/* Request → shared app → one tenant DB. Other DBs dim to show they're never touched. */}
      <div className="mt-8 grid items-center gap-4 md:grid-cols-[1fr_auto_1.2fr_auto_1fr]">
        <div className="rounded-xl border border-edge bg-navy/50 p-4">
          <p className="text-xs text-steel">Request</p>
          <p className="mt-1 font-mono text-sm text-frost">{t.id}.temples.example</p>
        </div>
        <span aria-hidden className="mx-auto h-6 w-px bg-iris md:h-px md:w-10" />
        <div className="rounded-xl border border-iris/60 bg-iris/5 p-4">
          <p className="flex items-center gap-2 text-xs text-steel">
            <Server aria-hidden className="size-3.5" /> Shared Laravel application
          </p>
          <ul className="mt-2 grid gap-1 text-sm text-mist">
            <li>Resolve tenant from the request</li>
            <li>Check subscription state</li>
            <li>Connect to that tenant&apos;s database only</li>
          </ul>
        </div>
        <span aria-hidden className="mx-auto h-6 w-px bg-iris md:h-px md:w-10" />
        <ul className="grid gap-2">
          {TENANTS.map((x) => {
            const on = x.id === tenant;
            return (
              <motion.li
                key={x.id}
                animate={{ opacity: on ? 1 : 0.35 }}
                className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 font-mono text-sm ${on ? "border-iris text-frost" : "border-line text-steel"}`}
              >
                <span className="flex items-center gap-2">
                  <Database aria-hidden className="size-4" /> {x.db}
                </span>
                <span className="text-[11px]">PostgreSQL</span>
              </motion.li>
            );
          })}
        </ul>
      </div>

      <div className="mt-8">
        <p className="text-xs text-steel">Subscription — {t.name} (mock state)</p>
        <ol className="mt-3 grid grid-cols-4 gap-px overflow-hidden rounded-xl bg-edge text-center text-xs sm:text-sm">
          {LIFECYCLE.map((s) => {
            const on = s === t.plan;
            return (
              <li key={s} aria-current={on ? "step" : undefined} className={`px-2 py-3 ${on ? "bg-iris text-void font-semibold" : "bg-void text-steel"}`}>
                {s}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function PagodaBooking() {
  const webgl = useWebGLSupport();
  const [floor, setFloor] = useState(3);
  const [light, setLight] = useState<number | null>(null);

  const statuses: LightStatus[] = Array.from({ length: LIGHTS_PER_FLOOR }, (_, i) => lightStatus(floor, i));
  const counts = statuses.reduce<Record<LightStatus, number>>((acc, s) => ({ ...acc, [s]: acc[s] + 1 }), { available: 0, booked: 0, renewal: 0 });

  return (
    <div className="grid gap-px bg-line lg:grid-cols-[1.2fr_1fr]">
      <div className="relative min-h-[360px] bg-graphite md:min-h-[460px]">
        {webgl === false ? (
          <div className="grid size-full place-items-center p-8 text-center text-sm text-steel">
            3D view needs WebGL, which isn&apos;t available here. The floor and light controls alongside work the same way.
          </div>
        ) : webgl ? (
          <PagodaScene
            floor={floor}
            light={light}
            onSelectFloor={(f) => {
              setFloor(f);
              setLight(null);
            }}
            onSelectLight={(f, l) => {
              setFloor(f);
              setLight(l);
            }}
          />
        ) : null}
        <p className="pointer-events-none absolute bottom-3 left-4 text-xs text-steel">Drag to orbit · click a floor or a light</p>
      </div>

      <div className="bg-graphite p-5 md:p-8">
        <p className="font-display text-lg font-bold">Pagoda Tower light booking</p>
        <p className="mt-1 text-sm text-mist">Devotees book a light on a floor of the tower; bookings run for a period and come up for renewal.</p>

        <fieldset className="mt-6">
          <legend className="text-xs text-steel">Floor</legend>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {Array.from({ length: FLOORS }).map((_, i) => {
              const f = FLOORS - 1 - i; // list top floor first, like the tower
              return (
                <button
                  key={f}
                  type="button"
                  aria-pressed={floor === f}
                  aria-label={`Floor ${f + 1}`}
                  onClick={() => {
                    setFloor(f);
                    setLight(null);
                  }}
                  className={`rounded-lg border py-2 text-sm tabular-nums ${floor === f ? "border-iris bg-iris/15 text-frost" : "border-line text-steel hover:text-frost"}`}
                >
                  {f + 1}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="text-xs text-steel">Lights on floor {floor + 1}</legend>
          <div className="mt-2 grid grid-cols-6 gap-1.5">
            {statuses.map((s, i) => (
              <button
                key={i}
                type="button"
                aria-pressed={light === i}
                aria-label={`Light ${i + 1}: ${STATUS_LABEL[s]}`}
                onClick={() => setLight(i)}
                className={`grid aspect-square place-items-center rounded-lg border text-xs tabular-nums ${light === i ? "border-frost text-frost" : "border-line text-steel"}`}
              >
                <span className="size-2.5 rounded-full" style={{ background: STATUS_COLOR[s] }} aria-hidden />
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-6 min-h-[64px] border-t border-line pt-4 text-sm" aria-live="polite">
          {light === null ? (
            <p className="text-mist">
              Floor {floor + 1}: {counts.booked} booked · {counts.renewal} due for renewal · {counts.available} available
            </p>
          ) : (
            <p className="text-mist">
              <span className="font-mono text-frost">F{floor + 1}-L{String(light + 1).padStart(2, "0")}</span> — {STATUS_LABEL[statuses[light]]}.{" "}
              {statuses[light] === "renewal"
                ? "A reminder would go out before the booking lapses."
                : statuses[light] === "booked"
                  ? "Held for the current booking period."
                  : "Open for a new booking."}
            </p>
          )}
        </div>

        <ul className="mt-4 flex flex-wrap gap-4 text-xs text-steel">
          {(Object.keys(STATUS_LABEL) as LightStatus[]).map((s) => (
            <li key={s} className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ background: STATUS_COLOR[s] }} aria-hidden /> {STATUS_LABEL[s]}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function TempleDemo() {
  return (
    <div className="grid gap-px overflow-hidden rounded-2xl border border-edge bg-edge shadow-[0_30px_80px_-40px_rgba(79,70,229,0.5)]">
      <PagodaBooking />
      <TenantArchitecture />
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import type { Project } from "@/data/projects";

const loading = () => <div className="glass grid min-h-[420px] place-items-center rounded-2xl text-sm text-muted">Loading demonstration…</div>;

// Each demo is its own chunk so a case study only ships the code it shows.
const PawnWorkflow = dynamic(() => import("./demos/PawnWorkflow").then((m) => m.PawnWorkflow), { loading });
const TicketJourney = dynamic(() => import("./demos/TicketJourney").then((m) => m.TicketJourney), { loading });
const TempleDemo = dynamic(() => import("./demos/TempleDemo").then((m) => m.TempleDemo), { loading });

export function CaseStudyDemo({ demo }: { demo: Project["demo"] }) {
  if (demo === "pawn") return <PawnWorkflow />;
  if (demo === "ticketing") return <TicketJourney />;
  return <TempleDemo />;
}

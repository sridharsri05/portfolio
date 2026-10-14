import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <section className="gutter relative flex min-h-[80svh] flex-col justify-center pt-24">
      <div aria-hidden className="blueprint absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="relative mx-auto w-full max-w-[1600px]">
        <p className="text-sm text-steel">Error 404</p>
        <h1 className="display mt-4 text-[clamp(3rem,12vw,11rem)]">
          <span className="outline-type">Lost</span>
          <br />
          signal
        </h1>
        <p className="mt-8 max-w-[44ch] text-lg leading-relaxed text-mist">
          This page doesn&apos;t exist. The link may be old, or the address may have a typo.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/" className="inline-flex items-center gap-2 bg-signal px-5 py-3 text-sm font-bold uppercase tracking-wide text-void hover:bg-frost">
            <ArrowLeft aria-hidden className="size-4" /> Back to home
          </Link>
          <Link href="/#work" className="inline-flex items-center gap-2 border border-line-strong px-5 py-3 text-sm font-bold uppercase tracking-wide hover:border-frost">
            See projects
          </Link>
        </div>
      </div>
    </section>
  );
}

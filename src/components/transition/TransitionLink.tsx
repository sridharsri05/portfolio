"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { pulseSignal } from "@/lib/motion";
import { navigateWithSeam } from "./seam-controller";

/**
 * Internal cross-route link. Use this (not next/link) for links between "/" and
 * "/work/[slug]" so the page-transition layer can intercept them.
 * Contract: same props as next/link, plus optional `transitionLabel` (text shown
 * during the transition, e.g. the project title).
 *
 * It renders a real next/link, so prefetching and the no-JS fallback still work.
 * Only plain left-clicks to a *different* internal path are intercepted; modifier and
 * middle clicks, target="_blank", downloads and same-page links (e.g. "/#work" while
 * on "/", handled by the smooth-scroll anchor handler) behave exactly like next/link.
 */
export type TransitionLinkProps = ComponentProps<typeof Link> & { transitionLabel?: string };

/**
 * Case-study pages read params behind Suspense, so the default (App Shell) prefetch would leave
 * only the fallback ready when the curtain lifts. Prefetch their full static content instead.
 */
function isCaseStudyHref(href: TransitionLinkProps["href"]) {
  const path = typeof href === "string" ? href : (href.pathname ?? "");
  return path.startsWith("/work/");
}

export function TransitionLink({ transitionLabel, onClick, onMouseEnter, prefetch, ...props }: TransitionLinkProps) {
  return (
    <Link
      {...props}
      prefetch={prefetch ?? (isCaseStudyHref(props.href) ? true : undefined)}
      onMouseEnter={(e) => {
        onMouseEnter?.(e);
        pulseSignal();
      }}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const a = e.currentTarget;
        if ((a.target && a.target !== "_self") || a.hasAttribute("download") || props.replace) return;

        const url = new URL(a.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        const strip = (p: string) => (p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p);
        if (strip(url.pathname) === strip(window.location.pathname)) return;

        // Hand off to the TransitionProvider; if it isn't mounted, next/link navigates as usual.
        if (navigateWithSeam(url.pathname + url.search + url.hash, transitionLabel)) e.preventDefault();
      }}
    />
  );
}

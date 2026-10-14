"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { profile } from "@/data/profile";

type Status = "idle" | "copied" | "failed";

/** Small pill from the contact rows ("Copy Email"), with live feedback for screen readers. */
export function CopyEmailButton({ className = "" }: { className?: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(profile.email);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus("idle"), 2400);
  }

  const label = status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : "Copy Email";

  return (
    <>
      <button
        type="button"
        onClick={copy}
        data-cursor="Copy"
        className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
          status === "copied"
            ? "border-mint/60 text-mint"
            : status === "failed"
              ? "border-alert/60 text-alert"
              : "border-edge-strong text-soft hover:border-sky/70 hover:text-ink"
        } ${className}`}
      >
        <AnimatePresence initial={false}>
          {status === "copied" && (
            <motion.span
              key="check"
              aria-hidden
              initial={{ scale: 0.4, opacity: 0, width: 0 }}
              animate={{ scale: 1, opacity: 1, width: "auto" }}
              exit={{ scale: 0.4, opacity: 0, width: 0 }}
              transition={{ duration: 0.18 }}
              className="inline-flex"
            >
              <Check className="size-3.5" />
            </motion.span>
          )}
        </AnimatePresence>
        <span>{label}</span>
      </button>
      {/* Live region sits outside the button so it never becomes part of the button's name. */}
      <span className="sr-only" role="status" aria-live="polite">
        {status === "copied"
          ? `${profile.email} copied to clipboard`
          : status === "failed"
            ? "Copy failed — select the email address and copy it manually"
            : ""}
      </span>
    </>
  );
}

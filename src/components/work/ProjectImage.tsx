"use client";

import Image from "next/image";
import { useState } from "react";
import type { Project } from "@/data/projects";
import { ProjectArt } from "@/components/work/ProjectArt";

type Props = {
  project: Project;
  /** next/image `sizes` for the slot this image fills. */
  sizes: string;
  priority?: boolean;
  className?: string;
  /** Show the small "Illustration" label (bottom-left) when the image is an illustration. */
  showLabel?: boolean;
};

/**
 * Project image with a graceful fallback. The original SVG ProjectArt always sits
 * underneath, so a missing / failed /images/projects/*.webp never leaves an empty box:
 * on error the raster is removed and the SVG shows through.
 */
export function ProjectImage({ project, sizes, priority = false, className = "", showLabel = true }: Props) {
  const [failed, setFailed] = useState(false);
  const { image } = project;

  return (
    <div className={`relative size-full overflow-hidden bg-deep ${className}`}>
      <div aria-hidden={!failed} className="absolute inset-0">
        <ProjectArt project={project} />
      </div>
      {!failed && (
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes}
          priority={priority}
          onError={() => setFailed(true)}
          className="object-cover object-center"
          style={image.position ? { objectPosition: image.position } : undefined}
        />
      )}
      {/* Soft navy fade into the card body, as in the reference. */}
      <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-night/70 to-transparent" />
      {showLabel && image.illustration && (
        <span className="pointer-events-none absolute bottom-2.5 left-3 rounded-full border border-white/10 bg-night/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-soft/80 backdrop-blur-sm">
          Illustration
        </span>
      )}
    </div>
  );
}

# Sridhar Ganesan — Portfolio

A cinematic 3D developer portfolio built with Next.js 16 (App Router), React 19, React Three Fiber, GSAP, Lenis and Motion. The visual design follows the "Neon Full-Stack Developer Portfolio" reference board (kept locally, not committed).

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (also type-checks)
npm start          # serve the production build
npm run lint
```

Requires Node.js 20+.

## Editing content

All copy lives in `src/data/`. The animation code doesn't need to change.

| File | What it controls |
| --- | --- |
| `profile.ts` | Name, role, email, LinkedIn/GitHub, availability label (`availability.show/label`), **portrait** path, resume path, site URL |
| `experience.ts` | Roles (dates as `YYYY-MM`; durations are calculated), education/journey, languages |
| `projects.ts` | Case studies: problem, contribution, features, challenges, live/repo links, screenshots |
| `skills.ts` | The five skill groups around the Skills crystal, short notes, and which items are AI-assisted (with Claude Code) |

### Resume
The download button points to `public/resume/Sridhar-Ganesan-Resume.pdf`. It is checked at build time: if the file is missing, the button switches to a "Request resume" email link instead of a broken download. Replace the file and rebuild to update it.

### Portrait
`profile.portrait` points to `public/images/portraits/sridhar-cutout.webp`, a transparent cutout of the real photo (`portraitIsCutout: true`), staged in front of the 3D "about" backdrop. Set `portrait: null` to fall back to the abstract placeholder (`profile-placeholder.webp`).

### Project images
`public/images/projects/*.webp` are **original illustrations** (labelled "Illustration" on the cards), rendered from the scenes in `tools/asset-lab/` (see its README). To use real screenshots, replace the files and set `image.illustration: false` in `projects.ts`.

### Screenshots and links
- Project links show only when `links.live` / `links.repo` are set in `projects.ts`.
- To add real screenshots, put images in `public/work/<slug>/` and list them in that project's `screenshots` array (with width/height). Until then, the case study explains that production screens are private.

## Structure

```
src/
  app/                 layout, home page, /work/[slug] case studies, 404, sitemap, robots, OG image, icon
  sections/            Hero, About, Experience, Work (projects), Skills, Contact
  components/
    layout/            header (nav, mobile menu), footer, back-to-top
    three/crystal/     CrystalCanvas (lazy, CSS fallback) + CrystalScene: gem, orbit rings, shards, rocks, stars; presets hero/skills/contact/about
    three/PagodaScene  3D pagoda for the temple case study
    transition/        Seam preloader + page transitions (TransitionLink / TransitionProvider)
    providers/         Lenis smooth scroll, MotionConfig
    animations/        Reveal / SplitReveal (GSAP scroll + SplitText reveals)
    about/ skills/     portrait, journey timeline, skills constellation
    work/              project images, case-study demos, next-project finale
    ui/                magnetic, copy-email, resume link, section kicker, brand icons
  data/                all editable content
  hooks/useClientEnv   media queries, WebGL detection, device tier, current month
  lib/                 gsap registration, date maths, resume check
```

**Animation responsibilities:** GSAP + ScrollTrigger (+ SplitText/ScrambleText/CustomEase) handle scroll-linked and orchestrated timelines; Lenis smooths wheel scrolling on the same GSAP ticker; Motion handles component state transitions (menu, panels, steppers, copy feedback). All of it is disabled under `prefers-reduced-motion`.

**3D performance:** three.js is code-split and only loads when a crystal scene nears the viewport, with a CSS fallback behind it. Bloom and richer glass only on capable desktops; star counts, ring segments and DPR drop on mobile/low-memory devices. Off-screen canvases stop rendering, the pagoda renders on demand, reduced motion renders one static frame, and without WebGL the CSS crystal stays.

## Deploying to Vercel

1. Push this folder to a Git repository.
2. Import it at vercel.com/new. The defaults (framework: Next.js, `npm run build`) need no changes.
3. Set the environment variable `NEXT_PUBLIC_SITE_URL` to the final URL, e.g. `https://your-domain.com`. It's used for canonical URLs, the sitemap and Open Graph.
4. Deploy.

## Assets and licences
- All 3D geometry is procedural (no model files). Project images and the portrait placeholder are original renders made for this site (`tools/asset-lab/`).
- Fonts: Sora, Inter and JetBrains Mono via `next/font/google` (SIL Open Font License), self-hosted at build time.
- Smooth scroll: Lenis (MIT). GSAP and its plugins are free under the GSAP standard license.
- Icons: Lucide (ISC). GitHub/LinkedIn marks are inlined SVGs used only to link to those profiles.
- No paid assets, accounts or external services are required at runtime.

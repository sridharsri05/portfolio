# Asset lab

Source scenes for the portfolio's project-card images and the About-section portrait placeholder.

**Every image here is an original illustration.** None of them is a screenshot of a client
system, a stock photo, or a photo of a real person. All UI text and numbers inside them
(pledge IDs, RM amounts, ticket codes, booking counts) are mock data invented for the
illustration. The QR codes are random decorative patterns, not scannable tickets.

| Scene | Output | Size | What it shows |
| --- | --- | --- | --- |
| `pawn-shop-erp.html` | `public/images/projects/pawn-shop-erp.webp` | 1280×800 | three.js: a monitor showing a mock gold-pawn ERP dashboard (canvas texture), bevelled PBR gold ingots, a gold balance scale and a lit brass oil lamp on a dark desk, lit by a custom "studio softbox" environment with a blue rim light |
| `batu-caves-pos.html` | `public/images/projects/batu-caves-pos.webp` | 1280×800 | three.js: phone with a QR e-ticket, handheld POS/scanner with a QR in a blue scan frame and a 58 mm receipt leaving its printer, phone with a counter-sales dashboard |
| `temple-management.html` | `public/images/projects/temple-management.webp` | 1280×800 | three.js: seven-tier pagoda with lit windows and eave lights, reflected in water (custom ripple shader on a `Reflector`), dusk sky with stars and tree silhouettes, plus a translucent mock "Pagoda Tower · Light booking" panel (HTML/CSS) |
| `profile-placeholder.html` | `public/images/portraits/profile-placeholder.webp` | 720×960 (3:4) | SVG: a deliberately featureless profile silhouette with a blue rim light in front of translucent glass panels. **Not a likeness of anyone.** |

`convert.mjs` turns the PNG renders into the WebP files (sharp, Lanczos resize, quality 90 stepping
down only if a file would exceed 150 KB).

## Re-rendering

The scenes are self-contained HTML files. The three.js scenes load `three@0.170.0` from jsDelivr
through an import map, so they need network access. They are offline authoring tools and are
not part of the site bundle.

1. Open a scene in Chrome with a **device pixel ratio of 1** and the exact viewport size:
   - project scenes: **1600×1000**
   - portrait: **900×1200**

   With Chrome DevTools, use device emulation (for example `1600x1000x1`), then open
   `file:///C:/chinese%20temple/portfolio/tools/asset-lab/<scene>.html`.
2. Wait until `document.body.dataset.ready === "1"`. The three.js scenes render a few frames,
   then set it.
3. Take a viewport screenshot as PNG and name it after the scene, for example `pawn-shop-erp.png`.
   Put all four PNGs in one folder.
4. From the project root, run:

   ```sh
   node tools/asset-lab/convert.mjs <folder-with-the-pngs>
   ```

   The script prints each output's path, pixel size, file size and the quality it used.

Each three.js scene exposes `window.__lab` (scene, camera and `render()`), so you can tweak
lighting or camera from the DevTools console before taking the screenshot.

## Replacing with real media

- **Portrait:** put a real photo at, for example, `public/images/portraits/<name>.webp` (3:4) and
  set `profile.portrait` in `src/data/profile.ts`. The placeholder is used only while that
  field is `null`.
- **Project screenshots:** put a real screenshot in `public/images/projects/`, point the
  project's `image.src` at it in `src/data/projects.ts`, and set `image.illustration: false`
  so the "Illustration" label is dropped. Use real screenshots only when you are allowed to
  publish them.

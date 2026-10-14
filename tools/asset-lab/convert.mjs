// Converts the PNG renders from the asset-lab scenes into the WebP files the site uses.
//
// Usage (from the project root):
//   node tools/asset-lab/convert.mjs <render-dir>
// <render-dir> must contain pawn-shop-erp.png, batu-caves-pos.png, temple-management.png
// and profile-placeholder.png (screenshots of the matching .html scenes).
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const renderDir = path.resolve(process.argv[2] ?? path.join(root, "tools/asset-lab/renders"));

const jobs = [
  { src: "pawn-shop-erp.png", out: "public/images/projects/pawn-shop-erp.webp", width: 1280, height: 800 },
  { src: "batu-caves-pos.png", out: "public/images/projects/batu-caves-pos.webp", width: 1280, height: 800 },
  { src: "temple-management.png", out: "public/images/projects/temple-management.webp", width: 1280, height: 800 },
  { src: "profile-placeholder.png", out: "public/images/portraits/profile-placeholder.webp", width: 720, height: 960 },
];

const MAX_BYTES = 150 * 1024;

for (const job of jobs) {
  const input = path.join(renderDir, job.src);
  const output = path.join(root, job.out);
  await mkdir(path.dirname(output), { recursive: true });
  // Dark scenes compress very well, so start high (q90) for crisp UI text and step down only if a
  // file would exceed the size budget.
  for (let quality = 90; quality >= 60; quality -= 4) {
    await sharp(input)
      .resize(job.width, job.height, { fit: "cover", position: "centre", kernel: "lanczos3" })
      .webp({ quality, effort: 6, smartSubsample: true })
      .toFile(output);
    const { size } = await stat(output);
    if (size <= MAX_BYTES || quality <= 60) {
      const meta = await sharp(output).metadata();
      console.log(`${job.out}  ${meta.width}x${meta.height}  ${(size / 1024).toFixed(1)} KB  q${quality}`);
      break;
    }
  }
}

import { existsSync } from "node:fs";
import { join } from "node:path";
import { profile } from "@/data/profile";

/**
 * Checked during prerender so the site never renders a download button that 404s.
 * Drop the PDF at public/resume/Sridhar-Ganesan-Resume.pdf and rebuild.
 */
export const resumeAvailable = existsSync(join(process.cwd(), "public", profile.resume.publicPath));

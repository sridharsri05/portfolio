/**
 * Single source of truth for personal details shown across the site.
 * Edit this file to update contact links, availability or the resume path.
 */
export const profile = {
  name: "Sridhar Ganesan",
  wordmark: "Sridhar.G",
  initials: "SG",
  role: "Full-Stack Developer",
  focus: "React.js · Laravel · Node.js",
  heroLabel: "Full-Stack Developer",
  heroLabelAccent: "India",
  location: "Uthangarai, Krishnagiri, Tamil Nadu, India",
  shortLocation: "Tamil Nadu, India",
  email: "sridharganesan4898@gmail.com",
  linkedin: "https://linkedin.com/in/sridhar-g-920b27199/",
  github: "https://github.com/sridharsri05",

  /** Shown as a small status pill in the hero. Set `show: false` to hide it. */
  availability: {
    show: true,
    label: "Available for new opportunities",
  },

  /** One-line role under the name in the hero footer ("Full-Stack Developer | React.js"). */
  roleLine: "Full-Stack Developer | React.js",

  /**
   * Portrait for the About section. Set to your real photo, e.g. "/images/portraits/sridhar.webp".
   * While null, an abstract (non-photographic) placeholder is shown instead.
   */
  portrait: "/images/portraits/sridhar-cutout.webp" as string | null,
  /** true when `portrait` is a transparent cutout (staged in front of the 3D backdrop). */
  portraitIsCutout: true,
  portraitPlaceholder: "/images/portraits/profile-placeholder.webp",

  /**
   * Place the PDF at /public/resume/Sridhar-Ganesan-Resume.pdf.
   * The download button checks for this file at build time; until it exists the
   * button falls back to a "request by email" link instead of a dead download.
   */
  resume: {
    publicPath: "/resume/Sridhar-Ganesan-Resume.pdf",
    downloadName: "Sridhar-Ganesan-Resume.pdf",
  },

  /** Used for canonical URLs, sitemap and Open Graph. Override with NEXT_PUBLIC_SITE_URL. */
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://sridhar-ganesan.vercel.app",
} as const;

export const navItems = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "experience", label: "Experience" },
  { id: "work", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "contact", label: "Contact" },
] as const;

export type SectionId = (typeof navItems)[number]["id"];

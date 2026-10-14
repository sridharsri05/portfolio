import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Sora } from "next/font/google";
import "./globals.css";
import { profile } from "@/data/profile";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Suspense } from "react";
import { introScript } from "@/components/transition/intro";
import { Seam } from "@/components/transition/Seam";
import { TransitionProvider } from "@/components/transition/TransitionProvider";
import { MotionProvider } from "@/components/providers/MotionProvider";
import { SmoothScroll } from "@/components/providers/SmoothScroll";

// Type system from the reference: Sora (geometric) for headings, Inter for reading text.
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
});
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Only used inside the illustrative product mockups (receipts, ledgers, scanner readouts).
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const description =
  "Sridhar Ganesan is a full-stack developer in Tamil Nadu, India, building React interfaces and Laravel systems — pawn ERP, ticketing & POS, and multi-tenant SaaS.";

export const metadata: Metadata = {
  metadataBase: new URL(profile.siteUrl),
  title: {
    default: `${profile.name} — ${profile.role} | React.js`,
    template: `%s — ${profile.name}`,
  },
  description,
  applicationName: `${profile.name} portfolio`,
  authors: [{ name: profile.name, url: profile.linkedin }],
  creator: profile.name,
  keywords: ["Sridhar Ganesan", "Full-Stack Developer", "React.js developer", "Laravel developer", "India", "Tamil Nadu", "Portfolio"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: profile.name,
    title: `${profile.name} — ${profile.role}`,
    description,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: `${profile.name} — ${profile.role}`,
    description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#03050d",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sora.variable} ${inter.variable} ${jetbrains.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: introScript }} />
      </head>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="fixed left-4 top-3 z-[80] -translate-y-20 rounded-md bg-indigo px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        {/* Client leaves only — the layout itself stays a static server component (cacheComponents). */}
        <SmoothScroll />
        {/* Seam: first-visit preloader + route-transition curtain (aria-hidden, pointer-events: none). */}
        <Seam />
        <Suspense fallback={null}>
          <TransitionProvider />
        </Suspense>
        <MotionProvider>
          <SiteHeader />
          <main id="main" tabIndex={-1} className="outline-none">
            {children}
          </main>
          <SiteFooter />
        </MotionProvider>
      </body>
    </html>
  );
}

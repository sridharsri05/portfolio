import { Hero } from "@/sections/Hero";
import { About } from "@/sections/About";
import { Experience } from "@/sections/Experience";
import { Work } from "@/sections/Work";
import { Skills } from "@/sections/Skills";
import { Contact } from "@/sections/Contact";
import { resumeAvailable } from "@/lib/resume";
import { profile } from "@/data/profile";

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  jobTitle: profile.role,
  email: `mailto:${profile.email}`,
  url: profile.siteUrl,
  sameAs: [profile.linkedin, profile.github],
  address: { "@type": "PostalAddress", addressLocality: "Uthangarai", addressRegion: "Tamil Nadu", addressCountry: "IN" },
  worksFor: { "@type": "Organization", name: "Grasp Software Solutions" },
};

// Section order follows the reference design: Hero, About, Experience, Projects, Skills, Contact.
export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd).replace(/</g, "\\u003c") }} />
      <Hero resumeAvailable={resumeAvailable} />
      <About />
      <Experience />
      <Work />
      <Skills />
      <Contact resumeAvailable={resumeAvailable} />
    </>
  );
}

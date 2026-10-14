import { Download, Mail } from "lucide-react";
import { profile } from "@/data/profile";

type Props = { available: boolean; className?: string; label?: string };

/**
 * Real download when the PDF exists in /public; otherwise an honest
 * "request by email" link rather than a button that 404s.
 */
export function ResumeLink({ available, className, label = "Download resume" }: Props) {
  if (available) {
    return (
      <a href={profile.resume.publicPath} download={profile.resume.downloadName} className={className}>
        <Download aria-hidden className="size-4" />
        <span>{label}</span>
      </a>
    );
  }
  const subject = encodeURIComponent("Resume request");
  return (
    <a href={`mailto:${profile.email}?subject=${subject}`} className={className} title="The PDF isn't published yet — this opens an email to request it">
      <Mail aria-hidden className="size-4" />
      <span>Request resume</span>
    </a>
  );
}

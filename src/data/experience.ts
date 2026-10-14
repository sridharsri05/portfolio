/** Dates use "YYYY-MM". `end: null` means the role is current; durations are computed, never hardcoded. */
export type Role = {
  company: string;
  title: string;
  location: string;
  kind: "Full-time" | "Internship";
  start: string;
  end: string | null;
  summary: string;
  highlights: string[];
  stack: string[];
  /** Slugs from data/projects.ts */
  relatedProjects?: string[];
};

export const roles: Role[] = [
  {
    company: "Grasp Software Solutions",
    title: "Associate Software Engineer",
    location: "Madurai",
    kind: "Full-time",
    start: "2025-09",
    end: null,
    summary: "Delivering client business systems end to end, from requirements and SRS documentation through implementation, deployment and user manuals.",
    highlights: [
      "Built React frontends with Redux Toolkit & Tailwind CSS.",
      "Developed Laravel REST APIs and MySQL integrations, using Claude Code for AI-assisted backend work.",
      "Delivered client systems end-to-end (SRS to deployment).",
      "Implemented reports, QR ticketing, printing, role-based access.",
      "Integrated WhatsApp, iPay88, Stripe and maintained CodeIgniter apps.",
    ],
    stack: ["React 19", "Redux Toolkit", "Tailwind CSS", "Laravel", "MySQL", "PostgreSQL", "Zod", "CodeIgniter"],
    relatedProjects: ["pawn-shop-erp", "batu-caves-ticketing-pos", "temple-management-saas"],
  },
  {
    company: "Senchola Technology Solution",
    title: "ReactJS Developer Intern",
    location: "Bangalore",
    kind: "Internship",
    start: "2023-07",
    end: "2024-02",
    summary: "Developed a restaurant ERP web application in React.",
    highlights: ["Developed restaurant ERP with React.js.", "Integrated RESTful APIs and worked in an agile team."],
    stack: ["React.js", "JavaScript", "REST APIs"],
  },
];

/** "My journey" timeline in the About section, newest first. */
export type JourneyItem = {
  period: string;
  title: string;
  org: string;
  place?: string;
  kind: "work" | "education" | "certification";
  href?: string;
};

export const journey: JourneyItem[] = [
  { period: "2025 – Present", title: "Associate Software Engineer", org: "Grasp Software Solutions", place: "Madurai", kind: "work" },
  { period: "2023 – 2024", title: "ReactJS Developer Intern", org: "Senchola Technology Solution", place: "Bangalore", kind: "work" },
  { period: "2019 – 2021", title: "MBA in Systems and HR", org: "K V Institute of Management and Information Studies", place: "Coimbatore", kind: "education" },
  { period: "2015 – 2019", title: "BE in Mechanical Engineering", org: "K S R College of Engineering", place: "Namakkal", kind: "education" },
  {
    period: "Certification",
    title: "Complete React Developer (Redux, Hooks, GraphQL)",
    org: "Udemy",
    kind: "certification",
    href: "https://www.udemy.com/certificate/UC-501e6331-6cf5-43dd-ba53-92b3c996f465/",
  },
];

export const languages = ["Tamil (native)", "Telugu (native)", "English (professional)"];

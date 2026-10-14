/**
 * Skills shown in the "Technologies I Work With" constellation.
 *
 * `aiAssisted: true` marks technologies the resume lists as
 * "AI-assisted (with Claude Code)" — Laravel, PHP and TypeScript (CodeIgniter is
 * mentioned in the PHP note). The UI shows a small marker and says so in the note,
 * so the claim stays honest without changing the reference layout.
 * No percentages or ratings: edit `note` if your own assessment changes.
 */
export type Skill = {
  name: string;
  /** One short, factual line shown in the tooltip on hover / focus / tap. */
  note: string;
  aiAssisted?: boolean;
};

export type SkillGroupId = "frontend" | "backend" | "databases" | "tools" | "ai";

export type SkillGroup = {
  id: SkillGroupId;
  title: string;
  skills: Skill[];
};

export const AI_ASSISTED_LABEL = "AI-assisted (with Claude Code)";

export const skillGroups: SkillGroup[] = [
  {
    id: "frontend",
    title: "Frontend",
    skills: [
      { name: "React", note: "Main UI library — React 19 on current client projects." },
      { name: "Redux", note: "Redux Toolkit for shared state across multi-screen business workflows." },
      { name: "Tailwind CSS", note: "Utility-first styling for dense, data-heavy interfaces." },
      {
        name: "TypeScript",
        aiAssisted: true,
        note: "Typed code written with Claude Code and reviewed by me — this portfolio is TypeScript.",
      },
      { name: "HTML", note: "Semantic markup, including print layouts for thermal receipts." },
      { name: "CSS", note: "Layout and styling for client interfaces and print views." },
    ],
  },
  {
    id: "backend",
    title: "Backend & APIs",
    skills: [
      { name: "Node.js", note: "JavaScript on the server for APIs and tooling (working knowledge)." },
      { name: "Express.js", note: "Minimal REST services on Node.js (working knowledge)." },
      {
        name: "Laravel",
        aiAssisted: true,
        note: "Backend for all three client case studies (Laravel 11 and 12), built with Claude Code and reviewed by me.",
      },
      {
        name: "PHP",
        aiAssisted: true,
        note: "Language behind the Laravel services and maintained CodeIgniter apps — AI-assisted with Claude Code.",
      },
      { name: "REST APIs", note: "Designing and consuming the APIs between React apps and Laravel." },
    ],
  },
  {
    id: "databases",
    title: "Databases",
    skills: [
      { name: "MySQL", note: "Relational data for the pawn ERP and ticketing platform." },
      { name: "MongoDB", note: "Document storage for Node.js projects (working knowledge)." },
      { name: "PostgreSQL", note: "A separate database per tenant in the temple SaaS." },
      { name: "Firebase", note: "Hosted auth and data for small apps (working knowledge)." },
    ],
  },
  {
    id: "tools",
    title: "Tools & Workflow",
    skills: [
      { name: "Git", note: "Version control on every project." },
      { name: "GitHub", note: "Repositories, reviews and collaboration." },
      { name: "Vite", note: "Build tooling for React applications." },
      { name: "Postman", note: "Exercising and documenting APIs during development." },
      { name: "VS Code", note: "Primary editor." },
      { name: "cPanel", note: "Deploying and managing hosted client applications." },
    ],
  },
  {
    id: "ai",
    title: "AI-Assisted",
    skills: [
      { name: "Claude Code", note: "Agentic coding used daily for backend work — every change reviewed before it ships." },
      { name: "Claude AI", note: "Research, planning and explanations alongside the code." },
      { name: "Gemini", note: "Research, explanation and code assistance." },
      { name: "Google Antigravity", note: "Agent-first IDE for exploring and scaffolding work." },
      { name: "Prompt Engineering", note: "Writing precise briefs and constraints so AI output is reviewable." },
    ],
  },
];

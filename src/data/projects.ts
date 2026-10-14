/**
 * Case study content. Visual demos on each case study page are original
 * illustrations with mock data — they are not the client applications.
 *
 * To add real media later: drop images into /public/work/<slug>/ and list them
 * in `screenshots`. Add `links.live` / `links.repo` only when a real public URL exists.
 */
export type Accent = "signal" | "ice" | "iris";

export type Challenge = { title: string; problem: string; approach: string };

/** A tech pill on the home-page project card. `tint` matches the reference's violet-tinted first pill. */
export type CardTag = { label: string; tint?: "violet" };

/**
 * Card / cover image. Paths are configurable: drop a real screenshot in /public/images/projects/
 * and set `illustration: false` to show it without the "Illustration" label.
 */
export type ProjectImage = {
  src: string;
  alt: string;
  illustration: boolean;
  /** CSS object-position used when the 16:10 image is cropped into a wider slot (e.g. the 2.1:1 home card). */
  position?: string;
};

export type Project = {
  slug: string;
  number: string;
  title: string;
  client?: string;
  kind: string;
  tagline: string;
  problem: string;
  contribution: string[];
  stack: string[];
  features: string[];
  challenges: Challenge[];
  ownership: string;
  accent: Accent;
  demo: "pawn" | "ticketing" | "temple";
  links: { live?: string; liveLabel?: string; repo?: string };
  screenshots: { src: string; alt: string; width: number; height: number }[];
  /** Home-page card fields (match the reference card copy). */
  cardTitle: string;
  cardTags: CardTag[];
  cardSummary: string;
  image: ProjectImage;
};

export const projects: Project[] = [
  {
    slug: "pawn-shop-erp",
    number: "01",
    title: "Pawn Shop ERP",
    client: "Dsara Asset Ventures",
    kind: "Multi-branch gold pawn ERP",
    tagline: "Pledges, renewals, redemptions and auctions across every branch, reconciled at day end.",
    problem:
      "A gold pawn business runs on dates and money: each pledge accrues interest, gets renewed or redeemed, or eventually goes to auction. Doing that across several branches needs one consistent ledger, clear branch boundaries and a reliable day-end close.",
    contribution: [
      "Built the React 19 frontend for a Malaysian client: a pledge wizard plus renewal, redemption and auction flows.",
      "Managed shared state with Redux Toolkit and styled the interface with Tailwind CSS.",
      "Worked on the Laravel 11 / MySQL backend behind interest calculation and day-end reconciliation, using Claude Code for AI-assisted backend work.",
      "Added WebAuthn passkey login.",
    ],
    stack: ["React 19", "Redux Toolkit", "Tailwind CSS", "Laravel 11", "MySQL", "WebAuthn"],
    features: [
      "Multi-branch pledge workflows",
      "Pledge wizard, renewals and redemptions",
      "Interest calculation over the pledge period",
      "Auction handling for overdue pledges",
      "Day-end reconciliation",
      "WebAuthn passkey authentication",
    ],
    challenges: [
      {
        title: "One lifecycle, many states",
        problem: "A pledge can be active, renewed, redeemed, overdue or auctioned, and each action is only valid from certain states.",
        approach: "Model the pledge as an explicit lifecycle so the interface only offers actions the current state allows.",
      },
      {
        title: "Interest that everyone agrees on",
        problem: "Counter staff, branch managers and the day-end report all need to see the same interest figure for the same pledge.",
        approach: "Keep the calculation in the backend and have every screen read the same computed result.",
      },
      {
        title: "Sign-in without shared passwords",
        problem: "Branch terminals are shared physical spaces where passwords get written down.",
        approach: "Add WebAuthn passkeys so staff authenticate with a device-bound credential.",
      },
    ],
    ownership:
      "The workflow diagram and screens on this page are original illustrations with mock values. They explain the concepts and are not the client's live application or real rates.",
    accent: "signal",
    demo: "pawn",
    links: { live: "https://dsaraassetventures.com/", liveLabel: "Client website" },
    screenshots: [],
    cardTitle: "Pawn Shop System",
    cardTags: [{ label: "React", tint: "violet" }, { label: "Laravel" }, { label: "MySQL" }],
    cardSummary:
      "Multi-branch gold pawn ERP with pledge management, renewals, redemptions, interest calculation, auctions and WebAuthn authentication.",
    image: {
      src: "/images/projects/pawn-shop-erp.webp",
      alt: "Illustration: a pawn-management ERP dashboard on a monitor beside gold bars",
      illustration: true,
      position: "50% 48%",
    },
  },
  {
    slug: "batu-caves-ticketing-pos",
    number: "02",
    title: "Batu Caves Ticketing & POS",
    kind: "Ticketing, gate scanning and point of sale",
    tagline: "Three apps — counter, scanner and admin — sharing one ticket from sale to gate to report.",
    problem:
      "Selling tickets at a counter, validating them at a gate and reporting on the day's takings are separate jobs done by different people on different devices. They still have to agree on what every ticket is and whether it has been used.",
    contribution: [
      "Built the counter, scanner and admin applications in React 19 with Redux Toolkit.",
      "Used Zod to validate data at the boundary between the apps and the Laravel API.",
      "Implemented QR ticketing and 58mm thermal receipt printing on iMin POS devices.",
      "Worked on partner commissions, daily closing, finance (P&L), inventory and payroll modules with PDF/Excel reports.",
    ],
    stack: ["React 19", "Redux Toolkit", "Zod", "Laravel", "MySQL", "iMin POS"],
    features: [
      "Separate admin, counter and scanner apps",
      "QR ticket generation",
      "Gate scanning and validation",
      "58mm thermal printing on iMin POS",
      "Partner commissions",
      "Daily closing and finance (P&L) reports",
      "Inventory and payroll with PDF/Excel export",
    ],
    challenges: [
      {
        title: "A ticket can only be used once",
        problem: "The scanner must reject a ticket that has already entered, even if someone shows the same QR code twice.",
        approach: "Treat the backend as the source of truth for ticket state; the scanner records entry and refuses repeats.",
      },
      {
        title: "Printing on 58mm paper",
        problem: "A receipt designed for a screen doesn't fit a 58mm thermal roll.",
        approach: "Lay out a dedicated narrow receipt with a QR code sized to scan reliably at the gate.",
      },
      {
        title: "Three apps, one contract",
        problem: "Counter, scanner and admin evolve separately but exchange the same ticket data.",
        approach: "Validate payloads with Zod schemas so mismatched data fails loudly instead of silently.",
      },
    ],
    ownership:
      "The ticket journey on this page is an original, interactive demonstration with mock ticket codes. No real tickets, customers or transaction data are shown.",
    accent: "ice",
    demo: "ticketing",
    links: { live: "https://batucavetickets.graspsoftwaresolution.com/login", liveLabel: "Live system (staff login)" },
    screenshots: [],
    cardTitle: "Batu Caves Ticketing & POS",
    cardTags: [{ label: "React" }, { label: "Laravel" }, { label: "MySQL" }],
    cardSummary: "QR ticketing, gate scanning, thermal printing, partner commissions, financial reporting, inventory and payroll.",
    image: {
      src: "/images/projects/batu-caves-pos.webp",
      alt: "Illustration: handheld ticket scanners showing QR tickets and a point-of-sale dashboard",
      illustration: true,
      position: "50% 50%",
    },
  },
  {
    slug: "temple-management-saas",
    number: "03",
    title: "Temple Management SaaS",
    kind: "Multi-tenant SaaS platform",
    tagline: "A SaaS platform used by many temples — each with its own database, trial and subscription, and its own Pagoda Tower of lights.",
    problem:
      "Many temples use the same platform — bookings, renewals, reminders and outreach — but each one's data must stay strictly its own, and each needs to start on a free trial before subscribing.",
    contribution: [
      "Built the Pagoda Tower light-booking module: the light map, bookings and renewal reminders.",
      "Built the Outreach module.",
      "Improved the UI across the app, written in vanilla JavaScript, HTML and CSS.",
      "Worked within the Laravel 12 multi-tenant setup, where each temple has its own PostgreSQL database, free trial and subscription.",
    ],
    stack: ["JavaScript", "HTML", "CSS", "Laravel 12", "PostgreSQL"],
    features: [
      "Multi-tenant architecture with a database per temple",
      "Free trials and subscriptions",
      "Pagoda Tower light booking",
      "Booking renewals and reminders",
      "Outreach management",
    ],
    challenges: [
      {
        title: "Isolation by default",
        problem: "One temple must never see another temple's devotees, bookings or payments.",
        approach: "Give each tenant its own PostgreSQL database and resolve the tenant before any data access happens.",
      },
      {
        title: "Lights that expire",
        problem: "A booked light is valid for a period, so renewals and reminders have to be timely.",
        approach: "Track each booking's validity and drive reminders and renewals from it.",
      },
      {
        title: "Trial to subscription",
        problem: "A new temple should be productive immediately, then move to a paid plan without migrating data.",
        approach: "Provision the tenant on trial and switch the subscription state rather than the data.",
      },
    ],
    ownership:
      "The pagoda model and architecture diagram are simplified, original portfolio demonstrations. They are not connected to the production system and show no real temple data.",
    accent: "iris",
    demo: "temple",
    links: {},
    screenshots: [],
    cardTitle: "Temple Management SaaS",
    cardTags: [{ label: "JavaScript" }, { label: "Laravel" }, { label: "PostgreSQL" }],
    cardSummary: "Multi-tenant platform with temple databases, subscriptions, Pagoda Tower light booking, renewals and outreach management.",
    image: {
      src: "/images/projects/temple-management.webp",
      alt: "Illustration: an illuminated pagoda at night beside a temple-management interface",
      illustration: true,
      position: "50% 42%",
    },
  },
];

/** Smaller work without a full case study. */
export const otherWork = [
  {
    title: "Restaurant ERP",
    context: "Internship · Senchola Technology Solution",
    description: "React web application with Sales, Ingredients, Labour, Costing and User Authentication modules, integrated with RESTful APIs.",
    stack: ["React.js", "JavaScript"],
  },
];

export function getProject(slug: string) {
  return projects.find((p) => p.slug === slug);
}

export function getNextProject(slug: string) {
  return getAdjacentProjects(slug).next;
}

export function getAdjacentProjects(slug: string) {
  const i = projects.findIndex((p) => p.slug === slug);
  const n = projects.length;
  return { prev: projects[(i - 1 + n) % n], next: projects[(i + 1) % n] };
}

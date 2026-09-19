// Single source for every enum in the data model.
export const TRACKS = ["core", "software", "non-technical"] as const;
export type Track = (typeof TRACKS)[number];

export const TRACK_LABELS: Record<Track, string> = {
  core: "Core engineering",
  software: "Software & IT",
  "non-technical": "Non-technical",
};

// Engineering domains (all branches). Each category belongs to exactly one track.
export const CATEGORY_INFO = {
  "mechanical-design": { track: "core", label: "Mechanical & design", hint: "Design engineer, CAD/CAE, product and machine design" },
  "manufacturing-production": { track: "core", label: "Manufacturing & production", hint: "Production, process, industrial engineering, lean, plant roles" },
  "automotive-ev": { track: "core", label: "Automotive & EV", hint: "Vehicle, EV, battery, powertrain, automotive testing" },
  "civil-construction": { track: "core", label: "Civil & construction", hint: "Site engineer, structural, QS, planning, infrastructure" },
  "electrical-power": { track: "core", label: "Electrical & power", hint: "Electrical design, power systems, solar, substations, MEP" },
  "electronics-embedded": { track: "core", label: "Electronics, embedded & VLSI", hint: "Embedded, firmware, PCB, VLSI, IoT, telecom hardware" },
  "robotics-automation": { track: "core", label: "Robotics & automation", hint: "PLC, SCADA, industrial robots, mechatronics, drones" },
  "instrumentation-control": { track: "core", label: "Instrumentation & control", hint: "Instrumentation, control systems, calibration, process plants" },
  "chemical-process": { track: "core", label: "Chemical, process & energy", hint: "Chemical, petroleum, refinery, pharma process, energy" },
  "biotech-biomedical": { track: "core", label: "Biotech & biomedical", hint: "Biomedical equipment, biotech, medical devices (engineering roles)" },
  "aerospace-marine": { track: "core", label: "Aerospace, marine & defence", hint: "Aerospace, aeronautical, shipbuilding, defence PSUs" },
  "quality-maintenance": { track: "core", label: "Quality, maintenance & field service", hint: "QA/QC, maintenance, service and commissioning engineers" },
  "software-development": { track: "software", label: "Software development", hint: "Developer, full-stack, backend, frontend, mobile" },
  "data-ai": { track: "software", label: "Data, AI & ML", hint: "Data analyst, data engineer, ML, AI, computer vision" },
  "cloud-devops-network": { track: "software", label: "Cloud, DevOps & networking", hint: "Cloud, DevOps, system admin, network engineer" },
  "cybersecurity": { track: "software", label: "Cybersecurity", hint: "SOC analyst, security engineer, VAPT" },
  "testing-qa": { track: "software", label: "Software testing & QA", hint: "Manual and automation testing, QA engineer" },
  "it-support": { track: "software", label: "IT support & services", hint: "Technical support, IT helpdesk, service desk, implementation" },
  "project-coordination": { track: "non-technical", label: "Project engineering & coordination", hint: "Project engineer, planning, site coordination, PMO" },
  "sales-business": { track: "non-technical", label: "Technical sales & business development", hint: "Sales engineer, pre-sales, BD, marketing for engineers" },
  "customer-support": { track: "non-technical", label: "Customer & application support", hint: "Application engineer (support), customer success, service coordination" },
  "operations-supply": { track: "non-technical", label: "Operations, supply chain & procurement", hint: "Operations, purchase, procurement, logistics, planning" },
  "graduate-trainee": { track: "non-technical", label: "Graduate & management trainee", hint: "GET, management trainee, rotational graduate programs" },
  "training-content": { track: "non-technical", label: "Training, teaching & content", hint: "Technical trainer, instructor, technical writer" },
  "other": { track: null, label: "Other", hint: "Anything that fits no category above" },
} as const satisfies Record<string, { track: Track | null; label: string; hint: string }>;

export type Category = keyof typeof CATEGORY_INFO;
export const CATEGORIES = Object.keys(CATEGORY_INFO) as [Category, ...Category[]];
export const CATEGORY_LABELS = Object.fromEntries(
  CATEGORIES.map((c) => [c, CATEGORY_INFO[c].label]),
) as Record<Category, string>;

// Categories used before the site covered every branch; stored jobs may still have them.
export const LEGACY_CATEGORIES: Record<string, Category> = {
  robotics: "robotics-automation",
  "industrial-automation": "robotics-automation",
  "autonomous-systems": "robotics-automation",
  "embedded-iot": "electronics-embedded",
  "mechatronics-design": "mechanical-design",
  "field-service": "quality-maintenance",
  "ai-ml-vision": "data-ai",
  "robotics-software": "software-development",
  "rpa-workflow": "software-development",
  "technical-sales": "sales-business",
  "application-support": "customer-support",
};

/** Any stored category (current or legacy) -> a current category. */
export function normalizeCategory(c: string): Category {
  return c in CATEGORY_INFO ? (c as Category) : LEGACY_CATEGORIES[c] ?? "other";
}

export function categoriesFor(track: Track | undefined): Category[] {
  return CATEGORIES.filter((c) => !track || CATEGORY_INFO[c].track === track || CATEGORY_INFO[c].track === null);
}

export const JOB_TYPES = ["job", "internship", "apprenticeship", "trainee"] as const;
export const WORK_MODES = ["onsite", "hybrid", "remote"] as const;
export const JOB_STATUSES = ["active", "expired"] as const;
export const SALARY_PERIODS = ["month", "year", "stipend-month"] as const;
export const RESOURCE_KINDS = ["youtube", "course", "docs", "article"] as const;

export type JobType = (typeof JOB_TYPES)[number];
export type WorkMode = (typeof WORK_MODES)[number];
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  job: "Job",
  internship: "Internship",
  apprenticeship: "Apprenticeship",
  trainee: "Trainee",
};

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  onsite: "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
};

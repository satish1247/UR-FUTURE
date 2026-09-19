// Single source for every enum in the data model.
export const TRACKS = ["core", "software", "non-technical"] as const;
export type Track = (typeof TRACKS)[number];

export const TRACK_LABELS: Record<Track, string> = {
  core: "Core",
  software: "Software",
  "non-technical": "Non-technical",
};

// Robotics & Automation department. Each category belongs to exactly one track.
// One department for now; adding another = a second CATEGORY_INFO block + a department filter.
export const CATEGORY_INFO = {
  "robotics": { track: "core", label: "Robotics & robot programming", hint: "Industrial robots, ROS/ROS2, cobots, robot cells" },
  "industrial-automation": { track: "core", label: "PLC, SCADA & industrial automation", hint: "PLC, HMI, SCADA, DCS, drives, motion control" },
  "instrumentation-control": { track: "core", label: "Instrumentation & process control", hint: "Sensors, calibration, control loops, process plants" },
  "embedded-iot": { track: "core", label: "Embedded systems & IoT", hint: "Firmware, STM32/ESP32, PCB design, IoT devices" },
  "mechatronics-design": { track: "core", label: "Mechatronics & machine design", hint: "CAD, SPM design, mechanisms, product design" },
  "autonomous-systems": { track: "core", label: "Drones, AMRs & autonomous vehicles", hint: "UAVs, AGVs/AMRs, navigation, ADAS" },
  "field-service": { track: "core", label: "Commissioning & field service", hint: "Installation, commissioning, maintenance, site engineer" },
  "ai-ml-vision": { track: "software", label: "AI, ML & computer vision", hint: "Machine learning, vision inspection, generative AI" },
  "robotics-software": { track: "software", label: "Robotics software & simulation", hint: "Simulation, motion planning, digital twins, ROS software" },
  "rpa-workflow": { track: "software", label: "RPA & workflow automation", hint: "UiPath, n8n, Zapier, Make, automation developer" },
  "software-development": { track: "software", label: "Software & web development", hint: "Apps, dashboards, HMI/SCADA software, testing" },
  "technical-sales": { track: "non-technical", label: "Technical sales & pre-sales", hint: "Sales engineer, business development, pre-sales" },
  "application-support": { track: "non-technical", label: "Application & customer support", hint: "Application engineer (support), service desk, customer success" },
  "training-content": { track: "non-technical", label: "Training, teaching & content", hint: "Robotics trainer, instructor, technical writer" },
  "other": { track: null, label: "Other", hint: "Anything that fits no category above" },
} as const satisfies Record<string, { track: Track | null; label: string; hint: string }>;

export type Category = keyof typeof CATEGORY_INFO;
export const CATEGORIES = Object.keys(CATEGORY_INFO) as [Category, ...Category[]];
export const CATEGORY_LABELS = Object.fromEntries(
  CATEGORIES.map((c) => [c, CATEGORY_INFO[c].label]),
) as Record<Category, string>;

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

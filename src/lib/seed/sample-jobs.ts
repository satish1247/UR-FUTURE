// SAMPLE DATA ONLY — fictional companies, marked "(Sample)". Seed only in the emulator / a fresh project; they expire like any job.
import type { Category, JobType, Track } from "@/lib/schema/enums";
import type { JobInput } from "@/lib/schema/job";

const VERIFIED = "2026-09-18T00:00:00.000Z";

function resource(title: string, url: string, platform: string, kind: "docs" | "course" | "youtube" | "article" = "docs") {
  return { title, url, platform, kind, cost: "free" as const, verifiedAt: VERIFIED };
}

const RES = {
  ros: resource("ROS 2 Humble tutorials", "https://docs.ros.org/en/humble/Tutorials.html", "ROS docs"),
  python: resource("The Python tutorial", "https://docs.python.org/3/tutorial/", "Python docs"),
  fcc: resource("freeCodeCamp curriculum", "https://www.freecodecamp.org/learn/", "freeCodeCamp", "course"),
  ocw: resource("MIT OpenCourseWare", "https://ocw.mit.edu/", "MIT OCW", "course"),
  nptel: resource("NPTEL courses", "https://nptel.ac.in/courses", "NPTEL", "course"),
  arduino: resource("Arduino documentation", "https://docs.arduino.cc/", "Arduino docs"),
  n8n: resource("n8n documentation", "https://docs.n8n.io/", "n8n docs"),
  opencv: resource("OpenCV tutorials", "https://docs.opencv.org/4.x/d9/df8/tutorial_root.html", "OpenCV docs"),
};

interface SampleSpec {
  track: Track;
  category: Category;
  type: JobType;
  title: string;
  company: string;
  city: string;
  state: string;
  workMode: "onsite" | "hybrid" | "remote";
  salary: JobInput["salary"];
  must: string[];
  nice: string[];
  stand: string[];
  learn: [string, typeof RES.ros][];
  deadlineInDays?: number;
}

function sample(s: SampleSpec, i: number): JobInput {
  const slug = s.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const deadline = s.deadlineInDays
    ? new Date(Date.now() + s.deadlineInDays * 86_400_000).toISOString().slice(0, 10)
    : undefined;
  const company = `${s.company} (Sample)`;
  return {
    track: s.track,
    category: s.category,
    type: s.type,
    title: s.title,
    summary: `SAMPLE LISTING. ${company} is hiring a ${s.title} in ${s.city}. You will work with ${s.must.slice(0, 3).join(", ")} on real projects and learn from senior engineers. Freshers are welcome to apply.`,
    company: { name: company },
    location: { city: s.city, state: s.state, country: "India", workMode: s.workMode },
    experience: { minYears: 0, maxYears: 2, label: i % 2 ? "0-2 yrs" : "Fresher" },
    eligibility: { degrees: ["B.E.", "B.Tech", "Diploma"], branches: ["Robotics & Automation", "Mechatronics", "EEE", "ECE"] },
    salary: s.salary,
    vacancies: null,
    documentsRequired: [],
    responsibilities: [
      `Support day-to-day ${s.category.replace("-", " ")} work on customer projects`,
      `Use ${s.must[0]} to build, test and document solutions`,
      "Work with senior engineers and follow their review comments",
      "Write short reports on what you tested and what you found",
    ],
    requirements: [
      "Degree or diploma in Robotics & Automation or a related branch",
      `Basic knowledge of ${s.must.slice(0, 2).join(" and ")}`,
      "At least one academic or personal project you can explain",
      "Clear communication in English",
    ],
    skills: { mustHave: s.must, niceToHave: s.nice, standOut: s.stand },
    applyUrl: `https://example.com/careers/sample-${i + 1}-${slug}`,
    applyUrlStable: true,
    sourceName: "Sample data",
    sourceUrl: "https://example.com/careers",
    postedDate: new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10),
    deadline,
    help: {
      whatCompanyExpects: `They expect a fresher who already knows the basics of ${s.must.slice(0, 2).join(" and ")} and can show it through one working project. They care more about how you debug a problem and explain your choices than about marks. Be ready to walk through your project, what failed first, and how you fixed it, in simple words.`,
      skillGapTips: [
        `Build one small project using ${s.must[0]} and put the code and a short demo video on GitHub.`,
        `Write a one-page README that explains the problem, your approach, and what you would improve next.`,
        `Practise explaining ${s.must[1] ?? s.must[0]} in two minutes, as if to a customer who is not an engineer.`,
      ],
      learningPath: s.learn.map(([skill, res]) => ({
        skill,
        whyItMatters: `${skill} appears in the job requirements and is the fastest way to stand out as a fresher.`,
        steps: ["Week 1: follow the basics and take notes", "Week 2: build a tiny project using it", "Week 3: document it on GitHub and share it"],
        resources: [res],
      })),
    },
  };
}

const SPECS: SampleSpec[] = [
  { track: "core", category: "robotics-automation", type: "job", title: "Junior Robotics Engineer (ROS2)", company: "Botline Robotics", city: "Bengaluru", state: "Karnataka", workMode: "onsite", salary: { min: 350000, max: 500000, currency: "INR", period: "year" }, must: ["ROS2", "C++", "Python", "Linux"], nice: ["Gazebo", "Nav2"], stand: ["SLAM demo on GitHub"], learn: [["ROS2", RES.ros], ["Python", RES.python]], deadlineInDays: 5 },
  { track: "core", category: "robotics-automation", type: "trainee", title: "PLC & SCADA Trainee Engineer", company: "Indus Controls", city: "Pune", state: "Maharashtra", workMode: "onsite", salary: { min: 18000, max: 22000, currency: "INR", period: "month" }, must: ["PLC ladder logic", "SCADA", "HMI"], nice: ["Siemens TIA Portal", "Modbus"], stand: ["Mini conveyor PLC project"], learn: [["PLC programming", RES.nptel]], deadlineInDays: 12 },
  { track: "core", category: "electronics-embedded", type: "internship", title: "Embedded Firmware Intern (ESP32)", company: "Voltbyte Labs", city: "Chennai", state: "Tamil Nadu", workMode: "hybrid", salary: { min: 10000, currency: "INR", period: "stipend-month" }, must: ["Embedded C", "ESP32", "UART/I2C/SPI"], nice: ["FreeRTOS", "MQTT"], stand: ["Published IoT dashboard project"], learn: [["Microcontrollers", RES.arduino]] },
  { track: "core", category: "instrumentation-control", type: "apprenticeship", title: "Instrumentation Apprentice", company: "Deccan Process Automation", city: "Hyderabad", state: "Telangana", workMode: "onsite", salary: null, must: ["Instrumentation basics", "P&ID reading", "Calibration"], nice: ["DCS", "HART"], stand: ["Loop calibration log from lab"], learn: [["Process control", RES.nptel]], deadlineInDays: 20 },
  { track: "software", category: "data-ai", type: "job", title: "Computer Vision Engineer - Fresher", company: "Visiq AI", city: "Bengaluru", state: "Karnataka", workMode: "hybrid", salary: { min: 600000, max: 800000, currency: "INR", period: "year" }, must: ["Python", "OpenCV", "PyTorch"], nice: ["YOLO", "Docker"], stand: ["Deployed defect-detection demo"], learn: [["OpenCV", RES.opencv], ["Python", RES.python]] },
  { track: "software", category: "data-ai", type: "internship", title: "Generative AI Developer Intern", company: "Promptly Systems", city: "Remote", state: "Karnataka", workMode: "remote", salary: { min: 15000, currency: "INR", period: "stipend-month" }, must: ["Python", "LLM APIs", "Prompt engineering"], nice: ["RAG", "Vector databases"], stand: ["Chatbot over your own notes"], learn: [["Python", RES.python], ["Web basics", RES.fcc]], deadlineInDays: 3 },
  { track: "software", category: "software-development", type: "job", title: "Workflow Automation Developer (n8n)", company: "FlowForge", city: "Ahmedabad", state: "Gujarat", workMode: "remote", salary: null, must: ["n8n", "REST APIs", "JavaScript"], nice: ["Zapier", "Make"], stand: ["Automated a real college process"], learn: [["n8n", RES.n8n], ["JavaScript", RES.fcc]] },
  { track: "non-technical", category: "sales-business", type: "job", title: "Technical Sales Engineer - Industrial Robots", company: "Armatech Automation", city: "Delhi NCR", state: "Delhi", workMode: "hybrid", salary: { note: "Fixed + incentives", period: "year", currency: "INR" }, must: ["Technical communication", "Robot applications basics", "Customer handling"], nice: ["CRM tools", "Hindi"], stand: ["Demo video explaining a robot cell"], learn: [["Robotics basics", RES.ocw]] },
  { track: "non-technical", category: "customer-support", type: "trainee", title: "Application Support Engineer Trainee", company: "CellSense Robotics", city: "Coimbatore", state: "Tamil Nadu", workMode: "onsite", salary: { min: 20000, max: 25000, currency: "INR", period: "month" }, must: ["Troubleshooting", "Customer communication", "Documentation"], nice: ["Ticketing tools", "Basic PLC"], stand: ["Written troubleshooting guide"], learn: [["Technical writing", RES.fcc]], deadlineInDays: 9 },
  { track: "non-technical", category: "training-content", type: "job", title: "Robotics Trainer / Instructor", company: "RoboSchool Academy", city: "Mumbai", state: "Maharashtra", workMode: "onsite", salary: { min: 25000, max: 30000, currency: "INR", period: "month" }, must: ["Arduino", "Teaching", "Basic electronics"], nice: ["Scratch", "3D printing"], stand: ["Workshop you ran for juniors"], learn: [["Arduino", RES.arduino]] },
];

export const SAMPLE_JOBS: JobInput[] = SPECS.map(sample);

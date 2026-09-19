import type { IngestionConfig } from "@/lib/schema/config";

// What the daily AI agent searches. Returned by the MCP tool `get_ingestion_config`.
// Every URL is a starting point: career URLs change, so the agent verifies each at runtime.
const V = "verify at runtime";
type Source = IngestionConfig["sources"][number];
const career = (name: string, url: string, tracks: Source["tracks"] = ["core", "non-technical"]): Source => ({ name, url, kind: "career-page", tracks, note: V });

export const INGESTION_CONFIG: IngestionConfig = {
  keywords: [
    { track: "core", category: "robotics", terms: ["robotics engineer", "robot programmer", "robotics application engineer", "ROS developer", "ROS2", "cobot", "robot cell", "welding robot", "FANUC", "ABB robot", "KUKA", "graduate engineer trainee robotics"] },
    { track: "core", category: "industrial-automation", terms: ["PLC engineer", "PLC programmer", "SCADA engineer", "HMI developer", "DCS engineer", "automation engineer", "control systems engineer", "motion control", "servo drives", "Siemens TIA Portal", "Allen-Bradley", "GET automation", "automation trainee"] },
    { track: "core", category: "instrumentation-control", terms: ["instrumentation engineer", "control and instrumentation", "calibration engineer", "process control engineer", "C&I trainee"] },
    { track: "core", category: "embedded-iot", terms: ["embedded engineer", "firmware engineer", "embedded trainee", "IoT engineer", "PCB design engineer", "STM32", "ESP32", "embedded intern"] },
    { track: "core", category: "mechatronics-design", terms: ["mechatronics engineer", "design engineer SPM", "special purpose machine", "mechanical design automation", "CAD engineer automation", "product design engineer robotics"] },
    { track: "core", category: "autonomous-systems", terms: ["drone engineer", "UAV engineer", "AMR engineer", "AGV engineer", "autonomous vehicle", "navigation engineer", "ADAS intern"] },
    { track: "core", category: "field-service", terms: ["commissioning engineer", "field service engineer automation", "service engineer robotics", "site engineer automation", "maintenance engineer automation", "installation engineer"] },
    { track: "software", category: "ai-ml-vision", terms: ["computer vision engineer", "machine vision engineer", "AI/ML intern", "machine learning trainee", "generative AI developer", "LLM developer", "vision inspection"] },
    { track: "software", category: "robotics-software", terms: ["robotics software engineer", "motion planning", "robot simulation", "Gazebo", "Isaac Sim", "digital twin engineer", "ROS software intern"] },
    { track: "software", category: "rpa-workflow", terms: ["RPA developer", "UiPath developer", "Automation Anywhere", "Power Automate", "n8n", "Zapier", "workflow automation developer"] },
    { track: "software", category: "software-development", terms: ["SCADA software developer", "industrial software developer", "IIoT developer", "MES developer", "test automation engineer", "software trainee automation"] },
    { track: "non-technical", category: "technical-sales", terms: ["sales engineer automation", "technical sales engineer", "pre-sales engineer robotics", "business development engineer automation", "inside sales engineer"] },
    { track: "non-technical", category: "application-support", terms: ["application engineer support", "customer support engineer robotics", "technical support engineer automation", "customer success engineer"] },
    { track: "non-technical", category: "training-content", terms: ["robotics trainer", "STEM robotics instructor", "technical trainer automation", "technical writer robotics"] },
  ],
  sources: [
    // Automation & robotics OEMs
    career("Siemens careers", "https://jobs.siemens.com/careers"),
    career("ABB careers", "https://careers.abb/global/en"),
    career("Rockwell Automation careers", "https://www.rockwellautomation.com/en-in/company/careers.html"),
    career("Schneider Electric careers", "https://www.se.com/in/en/about-us/careers/overview.jsp"),
    career("Honeywell careers", "https://careers.honeywell.com", ["core", "software", "non-technical"]),
    career("Emerson careers", "https://www.emerson.com/en-us/careers"),
    career("Yokogawa India careers", "https://www.yokogawa.com/in/about/careers/"),
    career("Mitsubishi Electric India careers", "https://in.mitsubishielectric.com/en/careers/"),
    career("Omron careers", "https://www.omron.com/global/en/careers/"),
    career("Festo India careers", "https://www.festo.com/in/en/e/about-festo/careers-id_3877/"),
    career("Bosch Rexroth careers", "https://www.boschrexroth.com/en/in/careers/"),
    career("KUKA careers", "https://www.kuka.com/en-in/company/careers"),
    career("FANUC India", "https://www.fanucindia.com"),
    career("Yaskawa India", "https://www.yaskawaindia.in"),
    career("Delta Electronics India careers", "https://www.deltaelectronicsindia.com/careers"),
    career("Endress+Hauser careers", "https://www.endress.com/en/careers"),
    career("Phoenix Contact India careers", "https://www.phoenixcontact.com/en-in/company/careers"),
    career("Danfoss careers", "https://www.danfoss.com/en/careers/"),
    career("Hitachi Energy careers", "https://www.hitachienergy.com/careers"),
    // Indian robotics, drones and warehouse automation
    career("Addverb careers", "https://addverb.com/careers", ["core", "software", "non-technical"]),
    career("GreyOrange careers", "https://www.greyorange.com/careers", ["core", "software"]),
    career("Ati Motors careers", "https://atimotors.com/careers", ["core", "software"]),
    career("CynLr careers", "https://www.cynlr.com/careers", ["core", "software"]),
    career("Genrobotics careers", "https://www.genrobotics.com/careers", ["core"]),
    career("Unbox Robotics careers", "https://unboxrobotics.com/careers", ["core", "software"]),
    career("Sastra Robotics", "https://www.sastrarobotics.com", ["core", "software"]),
    career("ideaForge careers", "https://ideaforgetech.com/careers", ["core", "software"]),
    career("Garuda Aerospace careers", "https://garudaaerospace.com/careers", ["core"]),
    // Engineering services, auto and manufacturing
    career("Tata Elxsi careers", "https://www.tataelxsi.com/careers", ["core", "software"]),
    career("L&T Technology Services careers", "https://www.ltts.com/careers", ["core", "software"]),
    career("KPIT careers", "https://www.kpit.com/careers/", ["core", "software"]),
    career("Bosch India careers", "https://www.bosch.in/careers/", ["core", "software"]),
    career("Mahindra careers", "https://www.mahindra.com/careers", ["core"]),
    career("Tata Motors careers", "https://www.tatamotors.com/careers/", ["core"]),
    career("TVS Motor careers", "https://www.tvsmotor.com/careers", ["core"]),
    career("Texas Instruments India careers", "https://careers.ti.com", ["core", "software"]),
    // Public ATS job boards (JSON, no login) — replace {company} with the board name found on the careers page
    { name: "Greenhouse boards (boards-api.greenhouse.io/v1/boards/{company}/jobs)", url: "https://boards-api.greenhouse.io", kind: "ats-feed", tracks: ["core", "software", "non-technical"], note: V },
    { name: "Lever postings (api.lever.co/v0/postings/{company})", url: "https://api.lever.co", kind: "ats-feed", tracks: ["core", "software", "non-technical"], note: V },
    { name: "SmartRecruiters (api.smartrecruiters.com/v1/companies/{company}/postings)", url: "https://api.smartrecruiters.com", kind: "ats-feed", tracks: ["core", "software", "non-technical"], note: V },
    { name: "Ashby (api.ashbyhq.com/posting-api/job-board/{company})", url: "https://api.ashbyhq.com", kind: "ats-feed", tracks: ["core", "software", "non-technical"], note: V },
    { name: "Workday career sites ({company}.wd*.myworkdayjobs.com)", url: "https://www.myworkday.com", kind: "ats-feed", tracks: ["core", "software", "non-technical"], note: V },
    // Job portals (public listings; use for discovery, prefer the official posting as apply link)
    { name: "Indeed (use the Indeed connector if enabled)", url: "https://in.indeed.com", kind: "job-portal", tracks: ["core", "software", "non-technical"], note: V },
    { name: "Internshala", url: "https://internshala.com", kind: "job-portal", tracks: ["core", "software", "non-technical"], note: V },
    { name: "foundit", url: "https://www.foundit.in", kind: "job-portal", tracks: ["core", "software", "non-technical"], note: V },
    { name: "Cutshort", url: "https://cutshort.io", kind: "job-portal", tracks: ["software"], note: V },
    { name: "Wellfound", url: "https://wellfound.com", kind: "job-portal", tracks: ["core", "software"], note: V },
    { name: "Instahyre", url: "https://www.instahyre.com", kind: "job-portal", tracks: ["software", "non-technical"], note: V },
    // Government, PSU and apprenticeships
    { name: "National Apprenticeship Training Scheme", url: "https://nats.education.gov.in", kind: "government", tracks: ["core"], note: V },
    { name: "Apprenticeship India", url: "https://www.apprenticeshipindia.gov.in", kind: "government", tracks: ["core"], note: V },
    { name: "AICTE Internship portal", url: "https://internship.aicte-india.org", kind: "government", tracks: ["core", "software", "non-technical"], note: V },
    { name: "National Career Service", url: "https://www.ncs.gov.in", kind: "government", tracks: ["core", "non-technical"], note: V },
    { name: "BEL careers", url: "https://bel-india.in/careers", kind: "government", tracks: ["core"], note: V },
    { name: "BHEL careers", url: "https://careers.bhel.in", kind: "government", tracks: ["core"], note: V },
    { name: "HAL careers", url: "https://hal-india.co.in/career", kind: "government", tracks: ["core"], note: V },
  ],
  locations: ["India", "Remote (India)", "Bengaluru", "Pune", "Chennai", "Hyderabad", "Delhi NCR", "Mumbai", "Coimbatore", "Ahmedabad", "Vadodara", "Kolkata", "Kochi", "Visakhapatnam"],
  maxMinYears: 2,
  perRunCap: 40,
  // Login-walled or scraping-forbidden. Never use as sourceUrl/applyUrl (web search results may still point you to the official posting).
  blockedHosts: ["linkedin.com", "naukri.com", "glassdoor.co.in", "glassdoor.com", "shine.com", "timesjobs.com"],
};

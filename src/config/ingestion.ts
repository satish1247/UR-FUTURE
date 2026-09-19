import type { IngestionConfig } from "@/lib/schema/config";

// What the daily job finder searches. Returned by the MCP tool `get_ingestion_config`.
// Every URL is a starting point: career URLs change, so the agent verifies each at runtime.
const V = "verify at runtime";
type Source = IngestionConfig["sources"][number];
const career = (name: string, url: string, tracks: Source["tracks"] = ["core", "software", "non-technical"]): Source => ({ name, url, kind: "career-page", tracks, note: V });

export const INGESTION_CONFIG: IngestionConfig = {
  // Engineering freshers, every branch. Terms are combined with "fresher" / "graduate" / "trainee" when searching.
  keywords: [
    { track: "core", category: "mechanical-design", terms: ["mechanical design engineer", "design engineer fresher", "CAD engineer", "product design engineer", "SolidWorks", "CATIA"] },
    { track: "core", category: "manufacturing-production", terms: ["production engineer", "manufacturing engineer", "process engineer", "industrial engineer", "plant engineer", "shop floor engineer"] },
    { track: "core", category: "automotive-ev", terms: ["automotive engineer", "EV engineer", "battery engineer", "vehicle testing engineer", "powertrain"] },
    { track: "core", category: "civil-construction", terms: ["site engineer", "civil engineer fresher", "structural engineer", "quantity surveyor", "planning engineer civil", "AutoCAD civil"] },
    { track: "core", category: "electrical-power", terms: ["electrical engineer", "electrical design engineer", "power systems engineer", "solar engineer", "MEP engineer", "substation engineer"] },
    { track: "core", category: "electronics-embedded", terms: ["embedded engineer", "firmware engineer", "VLSI engineer", "PCB design engineer", "electronics engineer", "IoT engineer"] },
    { track: "core", category: "robotics-automation", terms: ["automation engineer", "PLC engineer", "SCADA engineer", "robotics engineer", "mechatronics engineer"] },
    { track: "core", category: "instrumentation-control", terms: ["instrumentation engineer", "control systems engineer", "C&I engineer", "calibration engineer"] },
    { track: "core", category: "chemical-process", terms: ["chemical engineer", "process engineer chemical", "petroleum engineer", "refinery", "energy engineer"] },
    { track: "core", category: "biotech-biomedical", terms: ["biomedical engineer", "biomedical service engineer", "biotech engineer"] },
    { track: "core", category: "aerospace-marine", terms: ["aerospace engineer", "aeronautical engineer", "marine engineer", "shipyard engineer"] },
    { track: "core", category: "quality-maintenance", terms: ["quality engineer", "QA QC engineer", "maintenance engineer", "service engineer", "field engineer", "commissioning engineer"] },
    { track: "software", category: "software-development", terms: ["software engineer fresher", "software developer", "Java developer", "Python developer", "full stack developer", "web developer", "mobile app developer"] },
    { track: "software", category: "data-ai", terms: ["data analyst", "data engineer", "machine learning engineer", "AI engineer", "data science fresher"] },
    { track: "software", category: "cloud-devops-network", terms: ["cloud engineer", "DevOps engineer", "network engineer", "system administrator", "CCNA"] },
    { track: "software", category: "cybersecurity", terms: ["cyber security analyst", "SOC analyst", "security engineer"] },
    { track: "software", category: "testing-qa", terms: ["software tester", "QA engineer", "test engineer", "automation testing"] },
    { track: "software", category: "it-support", terms: ["technical support engineer", "IT support engineer", "desktop support engineer", "implementation engineer"] },
    { track: "non-technical", category: "project-coordination", terms: ["project engineer", "project coordinator", "planning engineer", "PMO"] },
    { track: "non-technical", category: "sales-business", terms: ["sales engineer", "technical sales engineer", "business development engineer", "pre-sales engineer"] },
    { track: "non-technical", category: "customer-support", terms: ["application engineer", "customer support engineer", "customer success engineer"] },
    { track: "non-technical", category: "operations-supply", terms: ["purchase engineer", "procurement engineer", "supply chain engineer", "operations engineer", "logistics"] },
    { track: "non-technical", category: "graduate-trainee", terms: ["graduate engineer trainee", "GET", "management trainee", "engineer trainee", "trainee engineer"] },
    { track: "non-technical", category: "training-content", terms: ["technical trainer", "technical writer", "engineering instructor"] },
  ],
  sources: [
    // IT & software (Chennai, Bengaluru, Kochi, Thiruvananthapuram, Visakhapatnam)
    career("Zoho careers", "https://www.zoho.com/careers/", ["software", "non-technical"]),
    career("Freshworks careers", "https://www.freshworks.com/company/careers/", ["software", "non-technical"]),
    career("TCS careers", "https://www.tcs.com/careers", ["software"]),
    career("Infosys careers", "https://www.infosys.com/careers/", ["software"]),
    career("Wipro careers", "https://careers.wipro.com", ["software"]),
    career("HCLTech careers", "https://www.hcltech.com/careers", ["software"]),
    career("Cognizant careers", "https://careers.cognizant.com/india-en/", ["software"]),
    career("Accenture India careers", "https://www.accenture.com/in-en/careers", ["software"]),
    career("Capgemini India careers", "https://www.capgemini.com/in-en/careers/", ["software"]),
    career("UST careers (Thiruvananthapuram)", "https://www.ust.com/en/careers", ["software"]),
    career("IBS Software careers (Kerala)", "https://www.ibsplc.com/careers", ["software"]),
    career("Tata Elxsi careers", "https://www.tataelxsi.com/careers", ["core", "software"]),
    // Automotive & manufacturing (Chennai, Hosur, Sri City, Anantapur, Bengaluru)
    career("Ashok Leyland careers", "https://www.ashokleyland.com/in/en/careers", ["core"]),
    career("TVS Motor careers", "https://www.tvsmotor.com/careers", ["core"]),
    career("Hyundai India careers", "https://www.hyundai.com/in/en/hyundai-story/careers", ["core"]),
    career("Royal Enfield careers", "https://careers.royalenfield.com", ["core"]),
    career("Renault Nissan Technology (RNTBCI) careers", "https://www.rntbci.com/careers", ["core", "software"]),
    career("Kia India careers (Anantapur)", "https://www.kia.com/in/careers.html", ["core"]),
    career("Caterpillar India careers", "https://careers.caterpillar.com", ["core"]),
    career("Saint-Gobain India careers", "https://www.saint-gobain.co.in/careers", ["core", "non-technical"]),
    career("Titan careers (Hosur)", "https://www.titancompany.in/careers", ["core"]),
    career("Bosch India careers", "https://www.bosch.in/careers/", ["core", "software"]),
    career("Daikin India careers (Sri City)", "https://www.daikinindia.com/careers", ["core"]),
    // Engineering, infrastructure & power
    career("L&T careers", "https://www.larsentoubro.com/corporate/careers/", ["core", "non-technical"]),
    career("L&T Technology Services careers", "https://www.ltts.com/careers", ["core", "software"]),
    career("Siemens careers", "https://jobs.siemens.com/careers", ["core", "software"]),
    career("ABB India careers", "https://careers.abb/global/en", ["core"]),
    career("Schneider Electric India careers", "https://www.se.com/in/en/about-us/careers/overview.jsp", ["core", "non-technical"]),
    career("Honeywell careers", "https://careers.honeywell.com", ["core", "software"]),
    career("Shapoorji Pallonji careers", "https://www.shapoorjipallonji.com/careers", ["core", "non-technical"]),
    career("Sobha careers (Bengaluru)", "https://www.sobha.com/careers/", ["core", "non-technical"]),
    // PSUs and government (TN, Kerala, AP, Karnataka)
    { name: "BHEL careers (Trichy, Ranipet, Bengaluru)", url: "https://careers.bhel.in", kind: "government", tracks: ["core"], note: V },
    { name: "BEL careers (Bengaluru, Chennai)", url: "https://bel-india.in/careers", kind: "government", tracks: ["core"], note: V },
    { name: "HAL careers (Bengaluru)", url: "https://hal-india.co.in/career", kind: "government", tracks: ["core"], note: V },
    { name: "NLC India careers (Neyveli)", url: "https://www.nlcindia.in/new_website/careers/careers.htm", kind: "government", tracks: ["core"], note: V },
    { name: "Cochin Shipyard careers", url: "https://cochinshipyard.in/career", kind: "government", tracks: ["core"], note: V },
    { name: "RINL Visakhapatnam Steel careers", url: "https://www.vizagsteel.com/careers.asp", kind: "government", tracks: ["core"], note: V },
    { name: "ISRO careers", url: "https://www.isro.gov.in/Careers.html", kind: "government", tracks: ["core"], note: V },
    { name: "National Apprenticeship Training Scheme (NATS, Southern Region)", url: "https://nats.education.gov.in", kind: "government", tracks: ["core", "software", "non-technical"], note: V },
    // Public ATS job boards (JSON, no login) — replace {company} with the board name found on the careers page
    { name: "Greenhouse boards (boards-api.greenhouse.io/v1/boards/{company}/jobs)", url: "https://boards-api.greenhouse.io", kind: "ats-feed", tracks: ["core", "software", "non-technical"], note: V },
    { name: "Lever postings (api.lever.co/v0/postings/{company})", url: "https://api.lever.co", kind: "ats-feed", tracks: ["core", "software", "non-technical"], note: V },
    { name: "SmartRecruiters (api.smartrecruiters.com/v1/companies/{company}/postings)", url: "https://api.smartrecruiters.com", kind: "ats-feed", tracks: ["core", "software", "non-technical"], note: V },
    { name: "Workday career sites ({company}.wd*.myworkdayjobs.com)", url: "https://www.myworkday.com", kind: "ats-feed", tracks: ["core", "software", "non-technical"], note: V },
    // Job portals (LinkedIn and Naukri come through Apify — see `apify`)
    { name: "Internshala", url: "https://internshala.com", kind: "job-portal", tracks: ["core", "software", "non-technical"], note: V },
    { name: "foundit", url: "https://www.foundit.in", kind: "job-portal", tracks: ["core", "software", "non-technical"], note: V },
  ],
  // Only these regions. Where `cities` is set, only those cities count (e.g. Bengaluru for Karnataka).
  regions: [
    { state: "Tamil Nadu", cities: [] },
    { state: "Puducherry", cities: [] },
    { state: "Kerala", cities: [] },
    { state: "Andhra Pradesh", cities: [] },
    { state: "Karnataka", cities: ["Bengaluru", "Bangalore"] },
  ],
  locations: [
    "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Hosur", "Tirunelveli", "Vellore", "Erode", "Sriperumbudur",
    "Puducherry", "Bengaluru", "Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur",
    "Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Nellore", "Kakinada", "Sri City", "Anantapur",
  ],
  maxMinYears: 2,
  perRunCap: 40,
  // Job pages that need a login just to view. Never use as sourceUrl/applyUrl.
  blockedHosts: ["glassdoor.co.in", "glassdoor.com"],
  // Job portals scraped through the Apify connector. About $0.40-0.70 per 1,000 results;
  // ~330 results/day stays inside Apify's free $5/month.
  apify: [
    {
      platform: "Naukri",
      actor: "valig/naukri-jobs-scraper",
      maxResultsPerRun: 20,
      input: { keywords: "<keyword group>", location: "<city>", experience: 0, jobAge: "3", sort: "date", limit: 20 },
      note: "About 12 runs per day: rotate keyword groups across Chennai, Bengaluru, Coimbatore, Kochi, Thiruvananthapuram, Visakhapatnam, Puducherry. Cover core, software and non-technical groups every day.",
    },
    {
      platform: "LinkedIn",
      actor: "cheap_scraper/linkedin-job-scraper",
      maxResultsPerRun: 50,
      input: { keyword: ["<keyword group>"], locations: ["Chennai", "Bengaluru", "Coimbatore", "Kochi", "Thiruvananthapuram", "Visakhapatnam", "Puducherry"], publishedAt: "r86400", experienceLevel: ["1", "2"], maxItems: 50 },
      note: "2 runs per day with 4-6 keyword groups each (one core-heavy, one software/non-technical). Experience levels 1-2 = internship / entry level.",
    },
  ],
};

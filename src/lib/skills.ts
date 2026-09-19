// Skill vocabulary for Robotics & Automation, with synonyms. Used to pull skills out of a
// resume (in the browser) and to compare student skills with job skills.
// Each entry: [display name, ...aliases]. Aliases are matched case-insensitively as whole words.
// Keyword matching, not AI. Add aliases here when a real resume/job is missed.
const VOCAB: string[][] = [
  // Robotics
  ["ROS", "ros", "robot operating system"],
  ["ROS2", "ros2", "ros 2"],
  ["Gazebo", "gazebo"],
  ["MoveIt", "moveit"],
  ["SLAM", "slam"],
  ["Nav2", "nav2"],
  ["Isaac Sim", "isaac sim", "isaac"],
  ["Industrial robot programming", "robot programming", "robot programmer", "teach pendant"],
  ["FANUC", "fanuc"],
  ["ABB RobotStudio", "robotstudio", "abb robot", "rapid programming"],
  ["KUKA", "kuka"],
  ["Yaskawa", "yaskawa", "motoman"],
  ["Universal Robots", "universal robots", "ur5", "ur10", "cobot", "collaborative robot"],
  ["Kinematics", "kinematics", "inverse kinematics", "forward kinematics"],
  ["Motion planning", "motion planning", "path planning", "trajectory planning"],
  ["Robot vision", "robot vision"],
  // Industrial automation
  ["PLC", "plc", "plcs", "programmable logic controller", "programmable logic controllers"],
  ["Ladder logic", "ladder logic", "ladder diagram"],
  ["SCADA", "scada"],
  ["HMI", "hmi", "human machine interface"],
  ["DCS", "dcs", "distributed control system"],
  ["Siemens TIA Portal", "tia portal", "step 7", "simatic", "s7-1200", "s7-1500"],
  ["Allen-Bradley", "allen-bradley", "allen bradley", "rslogix", "studio 5000", "controllogix", "compactlogix"],
  ["Mitsubishi PLC", "gx works", "melsec"],
  ["Delta PLC", "delta plc", "wplsoft", "ispsoft"],
  ["Schneider PLC", "unity pro", "ecostruxure", "somachine"],
  ["CODESYS", "codesys"],
  ["OpenPLC", "openplc"],
  ["Structured text", "structured text", "iec 61131"],
  ["WinCC", "wincc"],
  ["Ignition SCADA", "ignition"],
  ["VFD", "vfd", "variable frequency drive", "ac drive", "ac drives"],
  ["Servo drives", "servo drive", "servo drives", "servo motor", "servo motors"],
  ["Motion control", "motion control"],
  ["Pneumatics", "pneumatics", "pneumatic"],
  ["Hydraulics", "hydraulics", "hydraulic"],
  ["Electrical panels", "control panel", "electrical panel", "panel wiring"],
  ["Modbus", "modbus"],
  ["Profinet", "profinet"],
  ["Profibus", "profibus"],
  ["EtherCAT", "ethercat"],
  ["EtherNet/IP", "ethernet/ip"],
  ["OPC UA", "opc ua", "opc-ua"],
  ["CAN bus", "can bus", "canbus", "can protocol"],
  ["IIoT", "iiot", "industrial iot", "industry 4.0"],
  ["MES", "mes", "manufacturing execution system"],
  // Instrumentation & control
  ["Instrumentation", "instrumentation"],
  ["Process control", "process control"],
  ["PID control", "pid", "pid controller", "pid control"],
  ["Control systems", "control systems", "control system", "control engineering"],
  ["Calibration", "calibration"],
  ["P&ID", "p&id", "piping and instrumentation"],
  ["Sensors", "sensors", "sensor interfacing", "transducers"],
  ["HART", "hart protocol"],
  // Embedded & IoT
  ["Embedded C", "embedded c"],
  ["C", "c programming", "c language"],
  ["C++", "c++", "cpp"],
  ["Arduino", "arduino"],
  ["Raspberry Pi", "raspberry pi", "rpi"],
  ["ESP32", "esp32", "esp8266", "nodemcu"],
  ["STM32", "stm32"],
  ["ARM Cortex", "arm cortex", "cortex-m"],
  ["Microcontrollers", "microcontroller", "microcontrollers", "8051", "avr", "pic microcontroller"],
  ["FreeRTOS", "freertos", "rtos"],
  ["UART/I2C/SPI", "uart", "i2c", "spi"],
  ["IoT", "iot", "internet of things"],
  ["MQTT", "mqtt"],
  ["PCB design", "pcb design", "pcb", "kicad", "eagle", "altium"],
  ["Circuit design", "circuit design", "analog circuits", "digital electronics"],
  ["FPGA", "fpga", "verilog", "vhdl"],
  ["Proteus", "proteus"],
  // Mechatronics & design
  ["SolidWorks", "solidworks", "solid works"],
  ["AutoCAD", "autocad", "auto cad"],
  ["CATIA", "catia"],
  ["Fusion 360", "fusion 360", "fusion360"],
  ["Creo", "creo", "pro/e", "pro-e"],
  ["ANSYS", "ansys"],
  ["3D printing", "3d printing", "additive manufacturing"],
  ["CNC", "cnc"],
  ["GD&T", "gd&t"],
  ["Mechatronics", "mechatronics"],
  ["Mechanical design", "mechanical design", "machine design"],
  // Autonomous systems
  ["Drones / UAV", "drone", "drones", "uav", "uavs", "quadcopter"],
  ["PX4 / ArduPilot", "px4", "ardupilot"],
  ["AGV/AMR", "agv", "amr", "autonomous mobile robot"],
  ["Autonomous navigation", "autonomous navigation", "localization", "sensor fusion", "kalman filter"],
  ["LiDAR", "lidar"],
  // Software / AI
  ["Python", "python"],
  ["Java", "java"],
  ["JavaScript", "javascript", "js", "node.js", "nodejs"],
  ["TypeScript", "typescript"],
  ["React", "react", "reactjs", "react.js"],
  ["HTML/CSS", "html", "css"],
  ["SQL", "sql", "mysql", "postgresql"],
  ["MATLAB", "matlab"],
  ["Simulink", "simulink"],
  ["LabVIEW", "labview"],
  ["Linux", "linux", "ubuntu"],
  ["Git", "git", "github"],
  ["Docker", "docker"],
  ["REST APIs", "rest api", "rest apis", "api integration"],
  ["Machine learning", "machine learning", "ml"],
  ["Deep learning", "deep learning", "neural networks", "cnn"],
  ["Computer vision", "computer vision", "image processing", "machine vision"],
  ["OpenCV", "opencv"],
  ["YOLO", "yolo"],
  ["TensorFlow", "tensorflow", "keras"],
  ["PyTorch", "pytorch"],
  ["NumPy/Pandas", "numpy", "pandas"],
  ["Generative AI", "generative ai", "genai", "gen ai"],
  ["LLM APIs", "llm", "llms", "large language model", "openai api", "chatgpt api", "gemini api"],
  ["Prompt engineering", "prompt engineering"],
  ["RAG", "rag", "retrieval augmented generation"],
  ["Data analysis", "data analysis", "data analytics", "power bi", "tableau"],
  ["Excel", "excel", "ms excel"],
  // RPA & workflow automation
  ["RPA", "rpa", "robotic process automation"],
  ["UiPath", "uipath"],
  ["Automation Anywhere", "automation anywhere"],
  ["Power Automate", "power automate"],
  ["n8n", "n8n"],
  ["Zapier", "zapier"],
  ["Make.com", "make.com", "integromat"],
  // Non-technical
  ["Technical sales", "technical sales", "sales engineer", "pre-sales", "presales"],
  ["Business development", "business development"],
  ["Customer support", "customer support", "customer service", "technical support"],
  ["Communication", "communication skills", "communication", "presentation skills"],
  ["Technical writing", "technical writing", "documentation"],
  ["Teaching / training", "teaching", "trainer", "training", "mentoring"],
  ["Project management", "project management"],
  ["Troubleshooting", "troubleshooting", "fault finding", "debugging"],
  ["Commissioning", "commissioning", "installation"],
  ["Maintenance", "maintenance", "preventive maintenance"],
  ["Hindi", "hindi"],
  ["Tamil", "tamil"],
  ["Telugu", "telugu"],
];

interface Entry {
  name: string;
  key: string;
  patterns: RegExp[];
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
// Word boundary that treats + # . / & - as part of a skill ("C++", "P&ID", "node.js").
const wordRe = (alias: string) => new RegExp(`(^|[^a-z0-9+#])${escape(alias)}(?=$|[^a-z0-9+#])`, "i");

const ENTRIES: Entry[] = VOCAB.map(([name, ...aliases]) => ({
  name,
  key: name.toLowerCase(),
  patterns: [name.toLowerCase(), ...aliases].map(wordRe),
}));

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Canonical keys a skill phrase refers to: "Siemens TIA Portal (S7-1200)" -> ["siemens tia portal"]. */
export function skillKeys(phrase: string): string[] {
  const found = ENTRIES.filter((e) => e.patterns.some((p) => p.test(phrase))).map((e) => e.key);
  return found.length ? found : [norm(phrase)];
}

/** Display names of every known skill that appears in the text (e.g. a resume). */
export function extractSkills(text: string, extraNames: string[] = []): string[] {
  const hits = ENTRIES.filter((e) => e.patterns.some((p) => p.test(text))).map((e) => e.name);
  // Job-posted skills not in the vocabulary still count if they appear verbatim.
  const extra = extraNames.filter((n) => n.length >= 3 && wordRe(n.toLowerCase()).test(text) && !hits.some((h) => skillKeys(h).includes(norm(n))));
  return [...new Set([...hits, ...extra])];
}

/** Percentage of a job's must-have + nice-to-have skills the student has, synonym-aware. */
export function matchPercent(skills: { mustHave: string[]; niceToHave: string[] }, known: string[]): number {
  const all = [...skills.mustHave, ...skills.niceToHave];
  if (!all.length) return 0;
  const have = new Set(known.flatMap(skillKeys));
  const hit = all.filter((s) => skillKeys(s).some((k) => have.has(k))).length;
  return Math.round((100 * hit) / all.length);
}

export const KNOWN_SKILL_NAMES = ENTRIES.map((e) => e.name);

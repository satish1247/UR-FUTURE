import { describe, expect, it } from "vitest";
import { parseResume } from "@/lib/resume";

const RESUME = `G. V. V. SATYANARAYANA
Puducherry, India | +91 63039 87443 | student@gmail.com
linkedin.com/in/example-student | https://github.com/example-student/robot-arm
CAREER OBJECTIVE
Robotics and Automation student seeking a graduate engineer trainee role.
EDUCATION
B.Tech in Robotics and Automation
MANAKULA VINAYGAR INSTITUTE OF TECHNOLOGY, PUDUCHERRY | 2022 - 2026 | CGPA 8.1
Higher Secondary (HSC), Sri Vidya School, 2022
PROJECTS
Pick-and-place robot arm using ROS 2, MoveIt and an ESP32; conveyor sorting with Programmable Logic Controller (ladder diagram) and HMI.
SKILLS
Python, C++, SolidWorks, Siemens TIA Portal, AutoCAD, Arduino`;

describe("parseResume", () => {
  const r = parseResume(RESUME);

  it("reads contact details", () => {
    expect(r.fullName).toBe("G. V. V. Satyanarayana");
    expect(r.email).toBe("student@gmail.com");
    expect(r.phone).toBe("+91 6303987443");
    expect(r.city).toBe("Puducherry");
    expect(r.linkedin).toBe("https://www.linkedin.com/in/example-student");
    expect(r.github).toBe("https://github.com/example-student");
  });

  it("reads education", () => {
    expect(r.degree).toBe("B.Tech");
    expect(r.branch).toBe("Robotics and Automation");
    expect(r.college).toBe("Manakula Vinaygar Institute Of Technology, Puducherry");
    expect(r.gradYear).toBe(2026);
  });

  it("reads skills including synonyms", () => {
    for (const s of ["ROS2", "MoveIt", "ESP32", "PLC", "Ladder logic", "HMI", "Python", "C++", "SolidWorks", "Siemens TIA Portal", "AutoCAD", "Arduino"]) {
      expect(r.skills).toContain(s);
    }
  });

  it("copes with a resume that has almost nothing", () => {
    const empty = parseResume("Objective\nLooking for a job");
    expect(empty.fullName).toBeUndefined();
    expect(empty.skills).toEqual([]);
  });
});

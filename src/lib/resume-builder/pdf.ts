// PDF resume with real, selectable text (built-in fonts), so ATS software can read it.
import type { jsPDF } from "jspdf";
import { sectionsToRender, sectionTitle, type ResumeData, type Variant } from "./model";

const PAGE_W = 210;
const PAGE_H = 297;
const MX = 16; // side margin (mm)
const MY = 14;
const W = PAGE_W - 2 * MX;
const PT = 0.3528; // mm per point

// Built-in PDF fonts only cover Latin text; drop anything else rather than print garbage.
const safe = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\x20-\x7E -ÿ•–—›€]/g, "");

const rgb = (hex: string): [number, number, number] => [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16)) as [number, number, number];

export async function renderPdf(data: ResumeData, v: Variant): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc: jsPDF = new jsPDF({ unit: "mm", format: "a4" });
  doc.setProperties({ title: `${data.name} - Resume`, author: data.name, subject: "Resume" });
  const accent = rgb(v.accent);
  const body = 10 * v.scale;
  const lh = (size: number) => size * PT * 1.35;
  let y = MY;

  const ensure = (h: number) => {
    if (y + h > PAGE_H - MY) {
      doc.addPage();
      y = MY;
    }
  };
  const font = (style: "normal" | "bold" | "italic", size: number, color: [number, number, number] = [30, 30, 30]) => {
    doc.setFont(v.pdfFont, style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };
  const para = (text: string, x = MX, width = W, size = body) => {
    for (const line of doc.splitTextToSize(safe(text), width) as string[]) {
      ensure(lh(size));
      doc.text(line, x, y + lh(size) * 0.75);
      y += lh(size);
    }
  };
  /** "Bold label: normal text" wrapped across lines. */
  const labelled = (label: string, text: string) => {
    font("bold", body);
    const lw = doc.getTextWidth(safe(label) + " ");
    font("normal", body);
    const first = (doc.splitTextToSize(safe(text), W - lw) as string[])[0] ?? "";
    ensure(lh(body));
    font("bold", body);
    doc.text(safe(label), MX, y + lh(body) * 0.75);
    font("normal", body);
    doc.text(first, MX + lw, y + lh(body) * 0.75);
    y += lh(body);
    const rest = safe(text).slice(first.length).trim();
    if (rest) para(rest);
  };
  const bullet = (text: string) => {
    font("normal", body);
    const lines = doc.splitTextToSize(safe(text), W - 5) as string[];
    lines.forEach((line, i) => {
      ensure(lh(body));
      if (i === 0) doc.text(v.bullet, MX + 1, y + lh(body) * 0.75);
      doc.text(line, MX + 5, y + lh(body) * 0.75);
      y += lh(body);
    });
  };
  /** Bold left text (+ optional italic note) with a right-aligned note (dates) on the same line. */
  const row = (left: string, right?: string, italic?: string) => {
    ensure(lh(body + 0.5));
    const base = y + lh(body) * 0.75;
    font("bold", body + 0.5);
    const leftText = (doc.splitTextToSize(safe(left), W - 35) as string[])[0] ?? "";
    doc.text(leftText, MX, base);
    if (italic) {
      const lw = doc.getTextWidth(leftText);
      font("italic", body - 0.5, [90, 90, 90]);
      const note = (doc.splitTextToSize(safe(` - ${italic}`), Math.max(20, W - lw - 2)) as string[])[0] ?? "";
      doc.text(note, MX + lw + 1, base);
    }
    if (right) {
      font("normal", body - 0.5, [90, 90, 90]);
      doc.text(safe(right), PAGE_W - MX, base, { align: "right" });
    }
    y += lh(body + 0.5);
  };
  const heading = (title: string) => {
    y += 3.2;
    ensure(10);
    const size = 11.5 * v.scale;
    const caps = v.heading !== "title-underline";
    const text = safe(caps ? title.toUpperCase() : title);
    font("bold", size, accent);
    const base = y + lh(size) * 0.75;
    if (v.heading === "caps-bar") {
      doc.setFillColor(...accent);
      doc.rect(MX, base - lh(size) * 0.62, 1.4, lh(size) * 0.7, "F");
      doc.text(text, MX + 3.5, base);
    } else if (v.heading === "caps-spaced") {
      doc.text(text, MX, base, { charSpace: 0.7 });
    } else {
      doc.text(text, MX, base);
    }
    y += lh(size) + 0.8;
    if (v.heading === "title-underline") {
      doc.setLineWidth(0.5);
      doc.setDrawColor(...accent);
      doc.line(MX, y - 0.6, MX + doc.getTextWidth(text), y - 0.6);
    } else if (v.heading === "caps-rule") {
      doc.setLineWidth(0.25);
      doc.setDrawColor(...accent);
      doc.line(MX, y - 0.6, PAGE_W - MX, y - 0.6);
    } else if (v.heading === "caps-spaced") {
      doc.setLineWidth(0.25);
      doc.setDrawColor(190, 190, 190);
      doc.line(MX, y - 0.6, PAGE_W - MX, y - 0.6);
    }
    y += 1.2;
  };

  // Header
  const align = v.headerAlign === "center" ? "center" : "left";
  const hx = align === "center" ? PAGE_W / 2 : MX;
  font("bold", 22 * v.scale, accent);
  doc.text(safe(data.name), hx, y + 8, { align });
  y += 10.5;
  font("normal", 11 * v.scale, [70, 70, 70]);
  doc.text(safe(data.headline), hx, y + 3.5, { align });
  y += 5.5;
  font("normal", 9.5 * v.scale, [70, 70, 70]);
  for (const line of doc.splitTextToSize(safe(data.contact.join("  |  ")), W) as string[]) {
    doc.text(line, hx, y + 3.2, { align });
    y += 4.4;
  }

  for (const s of sectionsToRender(data, v)) {
    heading(sectionTitle(v, s));
    if (s === "summary") {
      font("normal", body);
      para(data.summary);
    } else if (s === "skills") {
      if (v.skills === "grouped") for (const g of data.skillGroups) labelled(`${g.label}:`, g.items.join(", "));
      else {
        font("normal", body);
        para(data.skillGroups.flatMap((g) => g.items).join(", "));
      }
    } else if (s === "projects") {
      for (const p of data.projects) {
        row(p.title, undefined, p.tools);
        p.points.forEach(bullet);
        y += 1.2;
      }
    } else if (s === "experience") {
      for (const e of data.experience) {
        row(`${e.role}, ${e.org}`, e.period);
        e.points.forEach(bullet);
        y += 1.2;
      }
    } else if (s === "education") {
      for (const e of data.education) {
        row(e.title, [e.year, e.score].filter(Boolean).join("  ·  "));
        if (e.institution) {
          font("normal", body);
          para(e.institution);
        }
        y += 0.8;
      }
    } else if (s === "certifications") data.certifications.forEach(bullet);
    else if (s === "achievements") data.achievements.forEach(bullet);
  }
  return doc.output("blob");
}

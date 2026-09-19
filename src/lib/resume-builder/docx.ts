// Word (.docx) resume: single column, real paragraphs, no tables — editable and ATS-readable.
import { sectionsToRender, sectionTitle, type ResumeData, type Variant } from "./model";

const RIGHT_TAB = 10200; // twips: right edge of the text area on A4 with ~1.5cm margins

export async function renderDocx(data: ResumeData, v: Variant): Promise<Blob> {
  const { AlignmentType, BorderStyle, Document, Packer, Paragraph, TabStopType, TextRun } = await import("docx");
  const color = v.accent.slice(1);
  const size = Math.round(21 * v.scale); // half-points (10.5pt)
  const children: InstanceType<typeof Paragraph>[] = [];
  const align = v.headerAlign === "center" ? AlignmentType.CENTER : AlignmentType.LEFT;

  const heading = (title: string) => {
    const caps = v.heading !== "title-underline";
    const border =
      v.heading === "caps-rule" || v.heading === "caps-spaced"
        ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: v.heading === "caps-spaced" ? "BFBFBF" : color, space: 1 } }
        : v.heading === "caps-bar"
          ? { left: { style: BorderStyle.SINGLE, size: 24, color, space: 6 } }
          : undefined;
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 80 },
        border,
        children: [
          new TextRun({
            text: caps ? title.toUpperCase() : title,
            bold: true,
            color,
            size: Math.round(24 * v.scale),
            characterSpacing: v.heading === "caps-spaced" ? 40 : undefined,
            underline: v.heading === "title-underline" ? {} : undefined,
          }),
        ],
      }),
    );
  };
  const text = (t: string, opts: { bold?: boolean; italics?: boolean } = {}) => new TextRun({ text: t, size, ...opts });
  const para = (runs: InstanceType<typeof TextRun>[], extra: Record<string, unknown> = {}) =>
    children.push(new Paragraph({ spacing: { after: 40 }, children: runs, ...extra }));
  const bullet = (t: string) => para([text(`${v.bullet}  ${t}`)], { indent: { left: 300, hanging: 220 } });
  const row = (left: string, right?: string, italic?: string) =>
    para([text(left, { bold: true }), ...(italic ? [text(` - ${italic}`, { italics: true })] : []), ...(right ? [text(`\t${right}`)] : [])], {
      tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
      spacing: { before: 80, after: 20 },
    });

  // Header
  children.push(new Paragraph({ alignment: align, children: [new TextRun({ text: data.name, bold: true, color, size: Math.round(44 * v.scale) })] }));
  children.push(new Paragraph({ alignment: align, children: [new TextRun({ text: data.headline, size: Math.round(22 * v.scale), color: "444444" })] }));
  children.push(
    new Paragraph({ alignment: align, spacing: { after: 120 }, children: [new TextRun({ text: data.contact.join("  |  "), size: Math.round(19 * v.scale), color: "444444" })] }),
  );

  for (const s of sectionsToRender(data, v)) {
    heading(sectionTitle(v, s));
    if (s === "summary") para([text(data.summary)]);
    else if (s === "skills") {
      if (v.skills === "grouped") for (const g of data.skillGroups) para([text(`${g.label}: `, { bold: true }), text(g.items.join(", "))]);
      else para([text(data.skillGroups.flatMap((g) => g.items).join(", "))]);
    } else if (s === "projects") {
      for (const p of data.projects) {
        row(p.title, undefined, p.tools);
        p.points.forEach(bullet);
      }
    } else if (s === "experience") {
      for (const e of data.experience) {
        row(`${e.role}, ${e.org}`, e.period);
        e.points.forEach(bullet);
      }
    } else if (s === "education") {
      for (const e of data.education) {
        row(e.title, [e.year, e.score].filter(Boolean).join("  ·  "));
        if (e.institution) para([text(e.institution)]);
      }
    } else if (s === "certifications") data.certifications.forEach(bullet);
    else if (s === "achievements") data.achievements.forEach(bullet);
  }

  const doc = new Document({
    creator: data.name,
    title: `${data.name} - Resume`,
    styles: { default: { document: { run: { font: v.docxFont, size } } } },
    sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 850, right: 850 } } }, children }],
  });
  return Packer.toBlob(doc);
}

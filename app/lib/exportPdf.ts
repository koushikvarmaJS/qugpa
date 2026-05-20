import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { GradingScale, StudentInfo } from "./types";
import type { ConvertedCourse } from "./gpa";
import { formatGpa } from "./format";
import { asset } from "./basePath";

interface ReportData {
  student: StudentInfo;
  scale: GradingScale;
  letterToGpa: Record<string, number>;
  converted: ConvertedCourse[];
  gpa: number | null;
}

const NAVY: [number, number, number] = [15, 45, 82];
const GOLD: [number, number, number] = [241, 184, 45];

interface SemesterStat {
  semester: string;
  credits: number;
  points: number;
  gpa: number | null;
  rows: ConvertedCourse[];
}

function semesterBreakdown(converted: ConvertedCourse[]): SemesterStat[] {
  const byKey = new Map<string, SemesterStat>();
  for (const c of converted) {
    const key = c.course.semester || "—";
    let stat = byKey.get(key);
    if (!stat) {
      stat = { semester: key, credits: 0, points: 0, gpa: null, rows: [] };
      byKey.set(key, stat);
    }
    stat.rows.push(c);
    if (c.gpaPoints !== null && c.credits !== null) {
      stat.credits += c.credits;
      stat.points += c.gpaPoints * c.credits;
    }
  }
  for (const stat of byKey.values()) {
    stat.gpa = stat.credits > 0 ? stat.points / stat.credits : null;
  }
  return [...byKey.values()].sort((a, b) => {
    const sa = parseFloat(a.semester);
    const sb = parseFloat(b.semester);
    if (Number.isNaN(sa) && Number.isNaN(sb)) return a.semester.localeCompare(b.semester);
    if (Number.isNaN(sa)) return 1;
    if (Number.isNaN(sb)) return -1;
    return sa - sb;
  });
}

async function loadImageData(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function downloadReport(data: ReportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  const [logoData, signData] = await Promise.all([
    loadImageData(asset("/QUwhitebg.png")),
    loadImageData(asset("/QUsign.png")),
  ]);

  // Navy header band (taller, to fit logo above heading)
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 32, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 32, pageWidth, 2, "F");

  // QU white logo centered above heading. 1501x406 → ratio ~3.696
  const logoW = 50;
  const logoH = logoW * (406 / 1501);
  doc.addImage(logoData, "PNG", (pageWidth - logoW) / 2, 4, logoW, logoH);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text("Office of International Admissions — GPA Report", pageWidth / 2, 27, {
    align: "center",
  });

  // Student info block
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);
  let y = 42;
  const studentStartY = y;
  const writeRow = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(value || "—", 50, y);
    y += 6;
  };
  writeRow("Name", data.student.name);
  writeRow("Country", data.student.country);
  writeRow("QU ID", data.student.quId);
  writeRow("Calculated by", data.student.calculatedBy);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 14, studentStartY, {
    align: "right",
  });

  // QU sign tucked below "Generated", filling the space to the right of the student info rows.
  // QUsign is ~square (873x857). Space available: top = studentStartY+4, bottom = y (last row baseline).
  const signTop = studentStartY + 4;
  const signBottom = y;
  const signSize = Math.max(0, signBottom - signTop);
  if (signSize > 0) {
    doc.addImage(
      signData,
      "PNG",
      pageWidth - 14 - signSize,
      signTop,
      signSize,
      signSize,
    );
  }

  // All courses table (sorted by semester)
  const sorted = [...data.converted].sort((a, b) => {
    const sa = parseFloat(a.course.semester);
    const sb = parseFloat(b.course.semester);
    if (Number.isNaN(sa) && Number.isNaN(sb)) return 0;
    if (Number.isNaN(sa)) return 1;
    if (Number.isNaN(sb)) return -1;
    return sa - sb;
  });

  autoTable(doc, {
    startY: y + 4,
    head: [["Semester/Year", "Course", "Credits", "Foreign Grade", "US Grade", "GPA Pts"]],
    body: sorted.map((c) => [
      c.course.semester || "—",
      c.course.name || "—",
      c.course.credits || "—",
      c.course.grade || "—",
      c.usGrade ?? (c.error ?? "—"),
      c.gpaPoints !== null ? c.gpaPoints.toFixed(2) : "—",
    ]),
    headStyles: { fillColor: NAVY, textColor: 255 },
    styles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 248, 252] },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const afterCoursesY = (doc as any).lastAutoTable?.finalY ?? y + 8;

  // Final GPA highlight box
  doc.setFillColor(...GOLD);
  doc.rect(14, afterCoursesY + 6, pageWidth - 28, 12, "F");
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  const finalGpaText =
    data.gpa !== null
      ? `${formatGpa(data.gpa)}${data.scale.usKind === "letter" ? "/4" : ""}`
      : "—";
  doc.text(`Final GPA: ${finalGpaText}`, pageWidth / 2, afterCoursesY + 14, {
    align: "center",
  });

  // Semester-wise GPA section (before grading scale)
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Semester-wise grades", 14, afterCoursesY + 28);

  const semesters = semesterBreakdown(data.converted);
  autoTable(doc, {
    startY: afterCoursesY + 32,
    head: [["Semester/Year", "Courses", "Credits", "Semester GPA"]],
    body: semesters.map((s) => [
      s.semester,
      String(s.rows.length),
      s.credits.toFixed(2),
      s.gpa !== null ? s.gpa.toFixed(2) : "—",
    ]),
    headStyles: { fillColor: NAVY, textColor: 255 },
    styles: { fontSize: 9 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const afterSemY = (doc as any).lastAutoTable?.finalY ?? afterCoursesY + 50;

  // Grading scale used
  doc.setFontSize(11);
  doc.text("Grading scale used", 14, afterSemY + 10);
  doc.setFontSize(9);
  doc.text(
    `Name: ${data.scale.name || "—"}`,
    14,
    afterSemY + 16,
  );
  doc.text(
    `Foreign scale to US scale`,
    14,
    afterSemY + 22,
  );

  const pointsFor = (usGrade: string): string => {
    const key = usGrade.trim().toUpperCase();
    const v = data.letterToGpa[key];
    return v === undefined ? "—" : v.toFixed(2);
  };

  autoTable(doc, {
    startY: afterSemY + 26,
    head: [["Foreign Grade", "US Grade", "GPA Points"]],
    body: data.scale.rows.map((r) => [r.foreignGrade, r.usGrade, pointsFor(r.usGrade)]),
    headStyles: { fillColor: NAVY, textColor: 255 },
    styles: { fontSize: 9 },
  });

  const filename = `gpa-report-${data.student.quId || data.student.name || "student"}.pdf`;
  doc.save(filename);
}

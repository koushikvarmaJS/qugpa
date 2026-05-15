import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { GradingScale, StudentInfo } from "./types";
import type { ConvertedCourse } from "./gpa";
import { formatGpa } from "./format";

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

export function downloadReport(data: ReportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Navy header band
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 24, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 24, pageWidth, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("Office of International Admissions — GPA Report", pageWidth / 2, 16, {
    align: "center",
  });

  // Student info block
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);
  let y = 36;
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
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 14, 36, {
    align: "right",
  });

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
    `Foreign scale: ${data.scale.foreignKind}  |  US scale: ${data.scale.usKind}`,
    14,
    afterSemY + 16,
  );

  autoTable(doc, {
    startY: afterSemY + 20,
    head: [["Foreign Grade", "US Grade"]],
    body: data.scale.rows.map((r) => [r.foreignGrade, r.usGrade]),
    headStyles: { fillColor: NAVY, textColor: 255 },
    styles: { fontSize: 9 },
  });

  if (data.scale.usKind === "letter") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const y2 = (doc as any).lastAutoTable?.finalY ?? afterSemY + 40;
    doc.setFontSize(11);
    doc.text("US letter → GPA points", 14, y2 + 10);
    autoTable(doc, {
      startY: y2 + 14,
      head: [["Letter", "Points"]],
      body: Object.entries(data.letterToGpa).map(([k, v]) => [k, v.toFixed(2)]),
      headStyles: { fillColor: NAVY, textColor: 255 },
      styles: { fontSize: 9 },
    });
  }

  const filename = `gpa-report-${data.student.quId || data.student.name || "student"}.pdf`;
  doc.save(filename);
}

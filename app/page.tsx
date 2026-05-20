"use client";

import { useMemo, useState } from "react";
import defaultLetterScale from "./lib/defaultLetterScale.json";
import type { Course, GradingScale, StudentInfo } from "./lib/types";
import { calculateGpa } from "./lib/gpa";
import { downloadReport } from "./lib/exportPdf";
import { formatGpa } from "./lib/format";
import { ScaleEditor } from "./components/ScaleEditor";
import { CoursesTable } from "./components/CoursesTable";

const uid = () => Math.random().toString(36).slice(2, 10);

const initialScale: GradingScale = {
  foreignKind: "letter",
  usKind: "letter",
  rows: [
    { id: uid(), foreignGrade: "A", usGrade: "A" },
    { id: uid(), foreignGrade: "B", usGrade: "B" },
    { id: uid(), foreignGrade: "C", usGrade: "C" },
    { id: uid(), foreignGrade: "D", usGrade: "D" },
    { id: uid(), foreignGrade: "F", usGrade: "F" },
  ],
};

const initialCourses: Course[] = [
  { id: uid(), semester: "1", name: "", credits: "", grade: "" },
];

const initialStudent: StudentInfo = {
  name: "",
  country: "",
  quId: "",
  calculatedBy: "",
};

export default function Home() {
  const [student, setStudent] = useState<StudentInfo>(initialStudent);
  const [scale, setScale] = useState<GradingScale>(initialScale);
  const [letterToGpa, setLetterToGpa] = useState<Record<string, number>>(
    defaultLetterScale,
  );
  const [courses, setCourses] = useState<Course[]>(initialCourses);

  const { converted, gpa, totalCredits } = useMemo(
    () => calculateGpa(courses, scale, letterToGpa),
    [courses, scale, letterToGpa],
  );

  const handleDownload = () => {
    downloadReport({ student, scale, letterToGpa, converted, gpa });
  };

  const inputCls =
    "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#0F2D52] focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/20";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#0F2D52] text-white">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Office of International Admissions
            <span className="text-[#F1B82D]">.</span>
          </h1>
          <p className="mt-1 text-sm text-slate-200">
            Foreign-to-US GPA calculator for Quinnipiac University.
          </p>
        </div>
        <div className="h-1 bg-[#F1B82D]" />
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0F2D52]">Student information</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Name</span>
              <input
                className={inputCls}
                value={student.name}
                onChange={(e) => setStudent({ ...student, name: e.target.value })}
                placeholder="Jane Doe"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Country</span>
              <input
                className={inputCls}
                value={student.country}
                onChange={(e) => setStudent({ ...student, country: e.target.value })}
                placeholder="India"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">QU ID</span>
              <input
                className={inputCls}
                value={student.quId}
                onChange={(e) => setStudent({ ...student, quId: e.target.value })}
                placeholder="N12345678"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Calculated by (username)</span>
              <input
                className={inputCls}
                value={student.calculatedBy}
                onChange={(e) => setStudent({ ...student, calculatedBy: e.target.value })}
                placeholder="staff.username"
              />
            </label>
          </div>
        </section>

        <ScaleEditor
          scale={scale}
          letterToGpa={letterToGpa}
          onChange={setScale}
          onLetterToGpaChange={setLetterToGpa}
        />

        <CoursesTable
          courses={courses}
          converted={converted}
          scale={scale}
          onChange={setCourses}
        />

        <section className="rounded-xl border border-[#0F2D52] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-500">Current GPA</div>
              <div className="mt-1 inline-flex items-baseline rounded-md bg-[#0F2D52] px-4 py-2">
                <span className="text-4xl font-bold text-[#F1B82D]">
                  {gpa !== null ? formatGpa(gpa) : "—"}
                </span>
                <span className="ml-2 text-base text-slate-200">/4</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Across {totalCredits.toFixed(2)} credits · letter→GPA US scale
              </div>
            </div>
            <button
              onClick={handleDownload}
              className="rounded-md bg-[#0F2D52] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1B3F6D] focus:outline-none focus:ring-2 focus:ring-[#F1B82D]"
            >
              Download PDF report
            </button>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-5xl px-6 pb-8 text-center text-xs text-slate-400">
        Office of International Admissions · Quinnipiac University
      </footer>
    </div>
  );
}

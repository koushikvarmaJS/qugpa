"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import defaultLetterScale from "./lib/defaultLetterScale.json";
import type { Course, GradingScale, School, StudentInfo } from "./lib/types";
import { calculateGpa } from "./lib/gpa";
import { downloadReport } from "./lib/exportPdf";
import { formatGpa } from "./lib/format";
import { SchoolCard } from "./components/SchoolCard";
import { asset } from "./lib/basePath";

const uid = () => Math.random().toString(36).slice(2, 10);

const makeInitialScale = (): GradingScale => ({
  name: "",
  foreignKind: "letter",
  usKind: "letter",
  rows: [
    { id: uid(), foreignGrade: "A", usGrade: "A" },
    { id: uid(), foreignGrade: "B", usGrade: "B" },
    { id: uid(), foreignGrade: "C", usGrade: "C" },
    { id: uid(), foreignGrade: "D", usGrade: "D" },
    { id: uid(), foreignGrade: "F", usGrade: "F" },
  ],
});

const makeInitialCourses = (): Course[] => [
  { id: uid(), semester: "1", name: "", credits: "", grade: "" },
];

const makeInitialSchool = (): School => ({
  id: uid(),
  name: "",
  country: "",
  scale: makeInitialScale(),
  letterToGpa: { ...defaultLetterScale },
  courses: makeInitialCourses(),
});

const initialStudent: StudentInfo = {
  name: "",
  quId: "",
  calculatedBy: "",
};

export default function Home() {
  const [student, setStudent] = useState<StudentInfo>(initialStudent);
  const [schools, setSchools] = useState<School[]>(() => [makeInitialSchool()]);

  const schoolStats = useMemo(
    () =>
      schools.map((s) => ({
        school: s,
        ...calculateGpa(s.courses, s.scale, s.letterToGpa),
      })),
    [schools],
  );

  const cumulative = useMemo(() => {
    let totalPoints = 0;
    let totalCredits = 0;
    for (const s of schoolStats) {
      for (const c of s.converted) {
        if (c.gpaPoints !== null && c.credits !== null) {
          totalPoints += c.gpaPoints * c.credits;
          totalCredits += c.credits;
        }
      }
    }
    return {
      gpa: totalCredits > 0 ? totalPoints / totalCredits : null,
      totalCredits,
    };
  }, [schoolStats]);

  const updateSchool = (id: string, next: School) => {
    setSchools((prev) => prev.map((s) => (s.id === id ? next : s)));
  };

  const addSchool = () => {
    setSchools((prev) => [...prev, makeInitialSchool()]);
  };

  const removeSchool = (id: string) => {
    setSchools((prev) => prev.filter((s) => s.id !== id));
  };

  const handleDownload = async () => {
    await downloadReport({
      student,
      schools: schoolStats.map((s) => ({
        school: s.school,
        converted: s.converted,
        gpa: s.gpa,
        totalCredits: s.totalCredits,
      })),
      cumulativeGpa: cumulative.gpa,
      cumulativeCredits: cumulative.totalCredits,
    });
  };

  const inputCls =
    "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#0F2D52] focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/20";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#0F2D52] text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Office of International Admissions
              <span className="text-[#F1B82D]">.</span>
            </h1>
            <p className="mt-1 text-sm text-slate-200">
              Foreign-to-US GPA calculator for Quinnipiac University.
            </p>
          </div>
          <Image
            src={asset("/QUwhitebg.png")}
            alt="Quinnipiac University"
            width={1501}
            height={406}
            priority
            className="h-12 w-auto shrink-0 sm:h-14"
          />
        </div>
        <div className="h-1 bg-[#F1B82D]" />
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0F2D52]">Student information</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Name</span>
              <input
                className={inputCls}
                value={student.name}
                onChange={(e) => setStudent({ ...student, name: e.target.value })}
                placeholder="Bruce Wayne"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">QU ID</span>
              <input
                className={inputCls}
                value={student.quId}
                onChange={(e) => setStudent({ ...student, quId: e.target.value })}
                placeholder="2680540"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Calculated by (username)</span>
              <input
                className={inputCls}
                value={student.calculatedBy}
                onChange={(e) => setStudent({ ...student, calculatedBy: e.target.value })}
                placeholder="Matan Odell"
              />
            </label>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#0F2D52]">Foreign schools</h2>
              <p className="text-sm text-slate-500">
                Add a school for each transcript. Each has its own grading scale and courses.
              </p>
            </div>
            <button
              onClick={addSchool}
              className="rounded-md border border-[#0F2D52] bg-white px-3 py-1.5 text-sm font-medium text-[#0F2D52] transition hover:bg-[#0F2D52] hover:text-white"
            >
              + Add school
            </button>
          </div>

          {schoolStats.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              No schools yet. Click <span className="font-medium">+ Add school</span> to begin.
            </div>
          ) : (
            schoolStats.map((s, i) => (
              <SchoolCard
                key={s.school.id}
                school={s.school}
                index={i}
                converted={s.converted}
                gpa={s.gpa}
                totalCredits={s.totalCredits}
                defaultExpanded={i === 0}
                onChange={(next) => updateSchool(s.school.id, next)}
                onRemove={() => removeSchool(s.school.id)}
              />
            ))
          )}
        </section>

        <section className="rounded-xl border border-[#0F2D52] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-500">Cumulative GPA</div>
              <div className="mt-1 inline-flex items-baseline rounded-md bg-[#0F2D52] px-4 py-2">
                <span className="text-4xl font-bold text-[#F1B82D]">
                  {cumulative.gpa !== null ? formatGpa(cumulative.gpa) : "—"}
                </span>
                <span className="ml-2 text-base text-slate-200">/4</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Across {cumulative.totalCredits.toFixed(2)} credits · {schools.length} school
                {schools.length === 1 ? "" : "s"}
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

"use client";

import { useState } from "react";
import type { Course, GradingScale } from "../lib/types";
import type { ConvertedCourse } from "../lib/gpa";
import { sanitizeByKind, sanitizeNumeric } from "../lib/input";

interface Props {
  courses: Course[];
  converted: ConvertedCourse[];
  scale: GradingScale;
  onChange: (courses: Course[]) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const blankCourse = (): Course => ({
  id: uid(),
  semester: "",
  name: "",
  credits: "",
  grade: "",
});

export function CoursesTable({ courses, converted, scale, onChange }: Props) {
  const [bulkCount, setBulkCount] = useState("5");

  const update = (id: string, patch: Partial<Course>) => {
    if (patch.semester !== undefined) patch.semester = sanitizeNumeric(patch.semester);
    if (patch.credits !== undefined) patch.credits = sanitizeNumeric(patch.credits);
    if (patch.grade !== undefined) patch.grade = sanitizeByKind(patch.grade, scale.foreignKind);
    onChange(courses.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const addRow = () => onChange([...courses, blankCourse()]);
  const addManyRows = () => {
    const n = Math.max(1, Math.min(50, parseInt(bulkCount, 10) || 1));
    const extras = Array.from({ length: n }, blankCourse);
    onChange([...courses, ...extras]);
  };

  const removeRow = (id: string) => onChange(courses.filter((c) => c.id !== id));

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= courses.length) return;
    const next = [...courses];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const convertedById = new Map(converted.map((c) => [c.course.id, c]));

  const gradePlaceholder =
    scale.foreignKind === "letter" ? "A" : scale.foreignKind === "numeric" ? "85" : "85";

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[#0F2D52]">Courses</h2>
      <p className="mt-1 text-sm text-slate-500">
        Semester/year and credits accept numbers only. Grade accepts the {scale.foreignKind} format
        set above. Use the arrows to reorder.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-2 pr-1 font-medium w-12"></th>
              <th className="py-2 pr-3 font-medium w-24">Sem/Year</th>
              <th className="py-2 pr-3 font-medium">Course</th>
              <th className="py-2 pr-3 font-medium w-20">Credits</th>
              <th className="py-2 pr-3 font-medium w-28">Grade</th>
              <th className="py-2 pr-3 font-medium w-24">US</th>
              <th className="py-2 pr-3 font-medium w-24">Pts</th>
              <th className="py-2 pr-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c, i) => {
              const cc = convertedById.get(c.id);
              return (
                <tr key={c.id} className="border-t border-slate-100 align-top">
                  <td className="py-1.5 pr-1">
                    <div className="flex flex-col">
                      <button
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        aria-label="Move row up"
                        className="text-xs text-[#0F2D52] disabled:text-slate-300 hover:text-[#1B3F6D]"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => move(i, 1)}
                        disabled={i === courses.length - 1}
                        aria-label="Move row down"
                        className="text-xs text-[#0F2D52] disabled:text-slate-300 hover:text-[#1B3F6D]"
                      >
                        ▼
                      </button>
                    </div>
                  </td>
                  <td className="py-1.5 pr-3">
                    <input
                      inputMode="numeric"
                      className="w-full rounded-md border border-slate-300 px-2 py-1 focus:border-[#0F2D52] focus:outline-none focus:ring-1 focus:ring-[#0F2D52]"
                      value={c.semester}
                      onChange={(e) => update(c.id, { semester: e.target.value })}
                      placeholder="1"
                    />
                  </td>
                  <td className="py-1.5 pr-3">
                    <input
                      className="w-full rounded-md border border-slate-300 px-2 py-1 focus:border-[#0F2D52] focus:outline-none focus:ring-1 focus:ring-[#0F2D52]"
                      value={c.name}
                      onChange={(e) => update(c.id, { name: e.target.value })}
                      placeholder="Course name"
                    />
                  </td>
                  <td className="py-1.5 pr-3">
                    <input
                      inputMode="decimal"
                      className="w-full rounded-md border border-slate-300 px-2 py-1 focus:border-[#0F2D52] focus:outline-none focus:ring-1 focus:ring-[#0F2D52]"
                      value={c.credits}
                      onChange={(e) => update(c.id, { credits: e.target.value })}
                      placeholder="3"
                    />
                  </td>
                  <td className="py-1.5 pr-3">
                    <input
                      className="w-full rounded-md border border-slate-300 px-2 py-1 focus:border-[#0F2D52] focus:outline-none focus:ring-1 focus:ring-[#0F2D52]"
                      value={c.grade}
                      onChange={(e) => update(c.id, { grade: e.target.value })}
                      placeholder={gradePlaceholder}
                    />
                  </td>
                  <td className="py-1.5 pr-3 text-sm text-slate-700">
                    {cc?.usGrade ?? "—"}
                  </td>
                  <td className="py-1.5 pr-3 text-sm text-slate-700">
                    {cc?.gpaPoints !== undefined && cc?.gpaPoints !== null
                      ? cc.gpaPoints.toFixed(2)
                      : "—"}
                    {cc?.error && (
                      <div className="text-xs text-rose-600">{cc.error}</div>
                    )}
                  </td>
                  <td className="py-1.5 pr-3 text-right">
                    <button
                      onClick={() => removeRow(c.id)}
                      className="text-sm text-rose-600 hover:underline"
                      aria-label="Remove course"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={addRow}
            className="rounded-md border border-[#0F2D52] px-3 py-1.5 text-sm font-medium text-[#0F2D52] hover:bg-[#0F2D52] hover:text-white"
          >
            + Add course
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={addManyRows}
              className="rounded-md border border-[#0F2D52] px-3 py-1.5 text-sm font-medium text-[#0F2D52] hover:bg-[#0F2D52] hover:text-white"
            >
              + Add
            </button>
            <input
              inputMode="numeric"
              value={bulkCount}
              onChange={(e) => setBulkCount(e.target.value.replace(/[^\d]/g, ""))}
              className="w-14 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-[#0F2D52] focus:outline-none focus:ring-1 focus:ring-[#0F2D52]"
              aria-label="Number of rows to add"
            />
            <span className="text-sm text-slate-500">rows</span>
          </div>
        </div>
      </div>
    </section>
  );
}

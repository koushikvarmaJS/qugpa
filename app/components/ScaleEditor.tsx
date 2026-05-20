"use client";

import { useMemo, useState } from "react";
import type { GradingScale, ScaleRow, ForeignGradeKind } from "../lib/types";
import { sanitizeByKind } from "../lib/input";
import defaultLetterScale from "../lib/defaultLetterScale.json";
import altLetterScale from "../lib/altLetterScale.json";

interface GpaEntry {
  id: string;
  key: string;
  value: string;
}

interface Props {
  scale: GradingScale;
  letterToGpa: Record<string, number>;
  onChange: (s: GradingScale) => void;
  onLetterToGpaChange: (m: Record<string, number>) => void;
}

type Preset = "standard" | "alternate" | "custom";

const uid = () => Math.random().toString(36).slice(2, 10);

const presets: Record<"standard" | "alternate", Record<string, number>> = {
  standard: defaultLetterScale,
  alternate: altLetterScale,
};

function detectPreset(map: Record<string, number>): Preset {
  const eq = (a: Record<string, number>, b: Record<string, number>) => {
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    if (ak.length !== bk.length) return false;
    return ak.every((k) => b[k] === a[k]);
  };
  if (eq(map, presets.standard)) return "standard";
  if (eq(map, presets.alternate)) return "alternate";
  return "custom";
}

export function ScaleEditor({ scale, letterToGpa, onChange, onLetterToGpaChange }: Props) {
  const preset = useMemo(() => detectPreset(letterToGpa), [letterToGpa]);
  const [editing, setEditing] = useState(false);
  const [entries, setEntries] = useState<GpaEntry[]>([]);

  const entriesFromMap = (m: Record<string, number>): GpaEntry[] =>
    Object.entries(m).map(([k, v]) => ({ id: uid(), key: k, value: String(v) }));

  const toggleEdit = () => {
    if (!editing) {
      setEntries(entriesFromMap(letterToGpa));
    }
    setEditing(!editing);
  };

  const commitEntries = (next: GpaEntry[]) => {
    setEntries(next);
    const map: Record<string, number> = {};
    for (const e of next) {
      const k = e.key.trim();
      if (!k) continue;
      const v = parseFloat(e.value);
      map[k] = Number.isNaN(v) ? 0 : v;
    }
    onLetterToGpaChange(map);
  };

  const updateEntry = (id: string, patch: Partial<GpaEntry>) => {
    commitEntries(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const addEntry = () => {
    setEntries([...entries, { id: uid(), key: "", value: "0" }]);
  };

  const removeEntry = (id: string) => {
    commitEntries(entries.filter((e) => e.id !== id));
  };

  const updateRow = (id: string, patch: Partial<ScaleRow>) => {
    onChange({
      ...scale,
      rows: scale.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  };

  const setForeignKind = (k: ForeignGradeKind) => {
    onChange({
      ...scale,
      foreignKind: k,
      rows: scale.rows.map((r) => ({ ...r, foreignGrade: sanitizeByKind(r.foreignGrade, k) })),
    });
  };

  const addRow = () => {
    onChange({
      ...scale,
      rows: [...scale.rows, { id: uid(), foreignGrade: "", usGrade: "" }],
    });
  };

  const removeRow = (id: string) => {
    onChange({ ...scale, rows: scale.rows.filter((r) => r.id !== id) });
  };

  const applyPreset = (p: "standard" | "alternate") => {
    const next = { ...presets[p] };
    if (editing) setEntries(entriesFromMap(next));
    onLetterToGpaChange(next);
  };

  const foreignPlaceholder =
    scale.foreignKind === "letter"
      ? "e.g. A, B+, F"
      : scale.foreignKind === "numeric"
        ? "e.g. 85"
        : scale.foreignKind === "range"
          ? "e.g. 80-90"
          : scale.foreignKind === "alphanumeric"
            ? "e.g. A1, 1B"
            : "e.g. Distinction";

  const inputBase =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#0F2D52] focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/20";

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-[#0F2D52]">Grading scale</h2>
      <p className="mt-1 text-sm text-slate-500">
        Define how foreign grades map to the US letter scale. Inputs are restricted to the selected type.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="block font-medium text-slate-700">Foreign grade type</span>
          <select
            className={`${inputBase} mt-1`}
            value={scale.foreignKind}
            onChange={(e) => setForeignKind(e.target.value as ForeignGradeKind)}
          >
            <option value="letter">Letters (A, B+, …)</option>
            <option value="numeric">Numbers (e.g. 85)</option>
            <option value="range">Number range (e.g. 80-90)</option>
            <option value="alphanumeric">Alphanumeric (e.g. A1, 1B)</option>
            <option value="text">Text (e.g. Distinction)</option>
          </select>
        </label>

        <div className="block text-sm">
          <span className="block font-medium text-slate-700">US grade type</span>
          <div className={`${inputBase} mt-1 cursor-not-allowed bg-slate-50 text-slate-600`}>
            Letters (A, B+, …)
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-3 font-semibold">Foreign grade</th>
                <th className="pb-2 pr-3 font-semibold">US grade</th>
                <th className="pb-2 pr-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {scale.rows.map((r) => (
                <tr key={r.id} className="align-middle">
                  <td className="py-2 pr-3">
                    <input
                      className={inputBase}
                      placeholder={foreignPlaceholder}
                      value={r.foreignGrade}
                      onChange={(e) =>
                        updateRow(r.id, {
                          foreignGrade: sanitizeByKind(e.target.value, scale.foreignKind),
                        })
                      }
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      className={inputBase}
                      placeholder="e.g. A-"
                      value={r.usGrade}
                      onChange={(e) =>
                        updateRow(r.id, {
                          usGrade: sanitizeByKind(e.target.value, "letter"),
                        })
                      }
                    />
                  </td>
                  <td className="py-2 pl-1 text-right">
                    <button
                      onClick={() => removeRow(r.id)}
                      className="rounded-md px-2 py-1 text-sm text-rose-600 hover:bg-rose-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            onClick={addRow}
            className="rounded-md border border-[#0F2D52] px-3 py-1.5 text-sm font-medium text-[#0F2D52] transition hover:bg-[#0F2D52] hover:text-white"
          >
            + Add row
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-[#F1B82D]/50 bg-[#FFF8E1] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[#0F2D52]">US letter → GPA points</h3>
            <p className="mt-1 text-xs text-slate-600">
              Used to convert US letter grades into numeric GPA points. Choose a preset, or click the
              pencil to edit letters, values, and add custom grades.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border border-[#0F2D52]/30 bg-white p-0.5 text-xs">
              <button
                onClick={() => applyPreset("standard")}
                className={`rounded px-3 py-1.5 font-medium transition ${
                  preset === "standard"
                    ? "bg-[#0F2D52] text-white"
                    : "text-[#0F2D52] hover:bg-[#0F2D52]/10"
                }`}
              >
                Standard
              </button>
              <button
                onClick={() => applyPreset("alternate")}
                className={`rounded px-3 py-1.5 font-medium transition ${
                  preset === "alternate"
                    ? "bg-[#0F2D52] text-white"
                    : "text-[#0F2D52] hover:bg-[#0F2D52]/10"
                }`}
              >
                Alternate
              </button>
              {preset === "custom" && (
                <span className="rounded bg-slate-100 px-3 py-1.5 font-medium text-slate-600">
                  Custom
                </span>
              )}
            </div>
            <button
              onClick={toggleEdit}
              aria-label={editing ? "Done editing" : "Edit GPA mapping"}
              title={editing ? "Done" : "Edit"}
              className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                editing
                  ? "border-[#0F2D52] bg-[#0F2D52] text-white"
                  : "border-[#0F2D52]/40 bg-white text-[#0F2D52] hover:bg-[#0F2D52]/10"
              }`}
            >
              {editing ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 011.42-1.42L8.5 12.08l6.79-6.79a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Done
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4"
                  >
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L4 13.172V16h2.828l7.379-7.379-2.828-2.828z" />
                  </svg>
                  Edit
                </>
              )}
            </button>
          </div>
        </div>

        {editing ? (
          <>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {entries.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm"
                >
                  <input
                    className="w-16 rounded-md border border-slate-200 px-2 py-1 text-center font-mono text-sm font-semibold text-[#0F2D52] focus:border-[#0F2D52] focus:outline-none focus:ring-1 focus:ring-[#0F2D52]/20"
                    value={e.key}
                    onChange={(ev) =>
                      updateEntry(e.id, {
                        key: ev.target.value.replace(/[^A-Za-z+\-]/g, "").toUpperCase(),
                      })
                    }
                    placeholder="A"
                    aria-label="Letter grade"
                  />
                  <input
                    type="number"
                    step="0.1"
                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm focus:border-[#0F2D52] focus:outline-none focus:ring-1 focus:ring-[#0F2D52]/20"
                    value={e.value}
                    onChange={(ev) => updateEntry(e.id, { value: ev.target.value })}
                    aria-label="GPA points"
                  />
                  <button
                    onClick={() => removeEntry(e.id)}
                    className="rounded-md p-1 text-rose-600 hover:bg-rose-50"
                    aria-label="Remove grade"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={addEntry}
                className="rounded-md border border-[#0F2D52] px-3 py-1.5 text-sm font-medium text-[#0F2D52] transition hover:bg-[#0F2D52] hover:text-white"
              >
                + Add grade
              </button>
            </div>
          </>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Object.entries(letterToGpa).map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm"
              >
                <span className="font-mono text-sm font-semibold text-[#0F2D52]">{k}</span>
                <span className="font-mono text-sm text-slate-700">{v.toFixed(1)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

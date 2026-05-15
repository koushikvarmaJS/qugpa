"use client";

import type { GradingScale, ScaleRow, ForeignGradeKind, USScaleKind } from "../lib/types";
import { sanitizeByKind } from "../lib/input";

interface Props {
  scale: GradingScale;
  letterToGpa: Record<string, number>;
  onChange: (s: GradingScale) => void;
  onLetterToGpaChange: (m: Record<string, number>) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export function ScaleEditor({ scale, letterToGpa, onChange, onLetterToGpaChange }: Props) {
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

  const setUsKind = (k: USScaleKind) => {
    onChange({
      ...scale,
      usKind: k,
      rows: scale.rows.map((r) => ({ ...r, usGrade: sanitizeByKind(r.usGrade, k) })),
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

  const foreignPlaceholder =
    scale.foreignKind === "letter"
      ? "e.g. A, B+, F"
      : scale.foreignKind === "numeric"
        ? "e.g. 85"
        : "e.g. 80-90";

  const usPlaceholder = scale.usKind === "letter" ? "e.g. A-" : "e.g. 3.7";

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[#0F2D52]">Grading scale</h2>
      <p className="mt-1 text-sm text-slate-500">
        Define how foreign grades map to the US scale. Inputs are restricted to the selected type.
      </p>

      <div className="mt-4 flex flex-wrap gap-4">
        <label className="text-sm">
          <span className="block font-medium text-slate-700">Foreign grade type</span>
          <select
            className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-[#0F2D52] focus:outline-none focus:ring-1 focus:ring-[#0F2D52]"
            value={scale.foreignKind}
            onChange={(e) => setForeignKind(e.target.value as ForeignGradeKind)}
          >
            <option value="letter">Letters (A, B+, …)</option>
            <option value="numeric">Numbers (e.g. 85)</option>
            <option value="range">Number range (e.g. 80-90)</option>
          </select>
        </label>

        <label className="text-sm">
          <span className="block font-medium text-slate-700">US grade type</span>
          <select
            className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-[#0F2D52] focus:outline-none focus:ring-1 focus:ring-[#0F2D52]"
            value={scale.usKind}
            onChange={(e) => setUsKind(e.target.value as USScaleKind)}
          >
            <option value="letter">Letters (A, B+, …)</option>
            <option value="numeric">Numbers (e.g. 3.7)</option>
          </select>
        </label>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-2 pr-3 font-medium">Foreign grade</th>
              <th className="py-2 pr-3 font-medium">US grade</th>
              <th className="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {scale.rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="py-1.5 pr-3">
                  <input
                    className="w-full rounded-md border border-slate-300 px-2 py-1 focus:border-[#0F2D52] focus:outline-none focus:ring-1 focus:ring-[#0F2D52]"
                    placeholder={foreignPlaceholder}
                    value={r.foreignGrade}
                    onChange={(e) =>
                      updateRow(r.id, {
                        foreignGrade: sanitizeByKind(e.target.value, scale.foreignKind),
                      })
                    }
                  />
                </td>
                <td className="py-1.5 pr-3">
                  <input
                    className="w-full rounded-md border border-slate-300 px-2 py-1 focus:border-[#0F2D52] focus:outline-none focus:ring-1 focus:ring-[#0F2D52]"
                    placeholder={usPlaceholder}
                    value={r.usGrade}
                    onChange={(e) =>
                      updateRow(r.id, {
                        usGrade: sanitizeByKind(e.target.value, scale.usKind),
                      })
                    }
                  />
                </td>
                <td className="py-1.5 pr-3 text-right">
                  <button
                    onClick={() => removeRow(r.id)}
                    className="text-sm text-rose-600 hover:underline"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={addRow}
          className="mt-3 rounded-md border border-[#0F2D52] px-3 py-1.5 text-sm font-medium text-[#0F2D52] hover:bg-[#0F2D52] hover:text-white"
        >
          + Add row
        </button>
      </div>

      {scale.usKind === "letter" && (
        <div className="mt-6 rounded-md border border-[#F1B82D]/40 bg-[#FFF8E1] p-4">
          <h3 className="text-sm font-semibold text-[#0F2D52]">US letter → GPA points</h3>
          <p className="mt-1 text-xs text-slate-600">
            Used to convert US letter grades into numeric GPA points. Edit as needed.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Object.entries(letterToGpa).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="w-10 text-sm font-mono text-[#0F2D52]">{k}</span>
                <input
                  type="number"
                  step="0.1"
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  value={v}
                  onChange={(e) =>
                    onLetterToGpaChange({ ...letterToGpa, [k]: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

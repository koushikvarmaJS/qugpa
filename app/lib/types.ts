export type USScaleKind = "numeric" | "letter";
export type ForeignGradeKind = "letter" | "numeric" | "range";

export interface ScaleRow {
  id: string;
  foreignGrade: string;
  usGrade: string;
}

export interface GradingScale {
  foreignKind: ForeignGradeKind;
  usKind: USScaleKind;
  rows: ScaleRow[];
}

export interface Course {
  id: string;
  semester: string;
  name: string;
  credits: string;
  grade: string;
}

export interface StudentInfo {
  name: string;
  country: string;
  quId: string;
  calculatedBy: string;
}

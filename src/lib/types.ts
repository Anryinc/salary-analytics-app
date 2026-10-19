export type Source = 'HH' | 'GM';
export type RecordType = 'vacancy' | 'resume';

export interface RawRow {
  [key: string]: string | number | undefined;
}

export interface NormalizedPoint {
  id: string;
  source: Source;
  type: RecordType;
  position: string;
  company?: string;
  city?: string;
  salaryNet: number; // в рублях на руки
  uploadDate: string; // ISO
  uniquenessIndex?: string;
}

export interface GradeRange {
  name: string;
  min: number;
  max: number;
}

export interface Bin {
  from: number;
  to: number;
  label: string;
  vacancyCount: number;
  resumeCount: number;
  vacancyPct: number;
  resumePct: number;
  percentiles: {
    vacancies: number[];
    resumes: number[];
  };
}

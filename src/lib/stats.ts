import { computeGradeStats, percentile } from './binning';
import { GradeRange, NormalizedPoint } from './types';

export interface GradeRow {
  name: string;
  min: number;
  max: number;
  count: number;
  vacancies: number;
  resumes: number;
  values: number[];
  median: number;
}

export interface Summary {
  filteredTotal: number;
  inRange: number;
  vacancies: number;
  vacanciesHH: number;
  vacanciesGM: number;
  resumes: number;
  medianVacancy: number;
  medianResume: number;
  /** (медиана вакансий / медиана резюме − 1), null если нет данных */
  gap: number | null;
  top: GradeRow | null;
}

const sorted = (pts: NormalizedPoint[]) => pts.map(p => p.salaryNet).sort((a, b) => a - b);

export function gradeRows(points: NormalizedPoint[], grades: GradeRange[], perc: number[]): GradeRow[] {
  const base = computeGradeStats(points, grades, perc);
  return base.map(s => {
    const inR = points.filter(p => p.salaryNet >= s.min && p.salaryNet < s.max);
    return {
      ...s,
      vacancies: inR.filter(p => p.type === 'vacancy').length,
      resumes: inR.filter(p => p.type === 'resume').length,
      median: percentile(sorted(inR), 0.5),
    };
  });
}

/** KPI по отфильтрованным точкам внутри [grades[0].min, grades[last].max) */
export function summarize(points: NormalizedPoint[], grades: GradeRange[], rows: GradeRow[]): Summary {
  const lo = grades[0].min, hi = grades[grades.length - 1].max;
  const inside = points.filter(p => p.salaryNet >= lo && p.salaryNet < hi);
  const vac = inside.filter(p => p.type === 'vacancy');
  const res = inside.filter(p => p.type === 'resume');
  const mv = percentile(sorted(vac), 0.5), mr = percentile(sorted(res), 0.5);
  const top = rows.reduce<GradeRow | null>((best, r) => (r.count > 0 && (!best || r.count > best.count) ? r : best), null);
  return {
    filteredTotal: points.length,
    inRange: inside.length,
    vacancies: vac.length,
    vacanciesHH: vac.filter(p => p.source === 'HH').length,
    vacanciesGM: vac.filter(p => p.source === 'GM').length,
    resumes: res.length,
    medianVacancy: mv,
    medianResume: mr,
    gap: vac.length && res.length && mr > 0 ? mv / mr - 1 : null,
    top,
  };
}

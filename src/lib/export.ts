import { GradeRow, Summary } from './stats';
import { NormalizedPoint } from './types';
import { pLabel } from './format';

export interface ExportInput {
  rows: GradeRow[];
  percentiles: number[];
  summary: Summary;
  points: NormalizedPoint[];
  filters: { city: string; company: string; search: string; source: string; step: number };
}

const SEP = ';';
const cell = (v: string | number | undefined) => {
  const s = v === undefined ? '' : String(v);
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const line = (cells: (string | number | undefined)[]) => cells.map(cell).join(SEP);
const r = (n: number) => Math.round(n);

/** CSV (UTF-8 с BOM, разделитель «;» — открывается в Excel с русской локалью). */
export function buildExportCsv({ rows, percentiles, summary, points, filters }: ExportInput): string {
  const out: string[] = [];
  out.push(line(['Фильтры', `Город: ${filters.city || 'все'}`, `Компания: ${filters.company || 'все'}`, `Должность: ${filters.search || 'все'}`, `Источник: ${filters.source}`, `Шаг бина: ${filters.step}`]));
  out.push(line(['Итого', `Точек в грейдах: ${summary.inRange}`, `Вакансии: ${summary.vacancies}`, `Резюме: ${summary.resumes}`, `Медиана вакансий: ${r(summary.medianVacancy)}`, `Медиана резюме: ${r(summary.medianResume)}`]));
  out.push('');
  out.push(line(['Грейд', 'От, ₽', 'До, ₽', 'N', 'Вакансий', 'Резюме', 'Медиана, ₽', ...percentiles.map(p => `${pLabel(p)}, ₽`)]));
  rows.forEach(g => out.push(line([g.name, g.min, g.max, g.count, g.vacancies, g.resumes, r(g.median), ...g.values.map(r)])));
  out.push('');
  out.push(line(['Источник', 'Тип', 'Должность', 'Компания', 'Город', 'ЗП net, ₽', 'Дата загрузки']));
  points.forEach(p => out.push(line([p.source === 'GM' ? 'Getmatch' : 'HH', p.type === 'vacancy' ? 'Вакансия' : 'Резюме', p.position, p.company, p.city, p.salaryNet, p.uploadDate])));
  return '\uFEFF' + out.join('\r\n') + '\r\n';
}

export function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

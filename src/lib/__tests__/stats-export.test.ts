import { describe, it, expect } from 'vitest';
import { gradeRows, summarize } from '../stats';
import { buildExportCsv } from '../export';
import { DEFAULT_GRADES } from '../grades';
import { NormalizedPoint } from '../types';
import { detectSlot } from '../../components/Sidebar';

const pt = (salaryNet: number, type: 'vacancy' | 'resume', source: 'HH' | 'GM' = 'HH', extra: Partial<NormalizedPoint> = {}): NormalizedPoint => ({
  id: String(salaryNet) + type, source, type, position: 'Dev', salaryNet, uploadDate: '2026-11-13T20:00:00.000Z', ...extra,
});
const PTS = [pt(100000, 'resume'), pt(160000, 'resume'), pt(200000, 'vacancy'), pt(300000, 'vacancy'), pt(120000, 'vacancy'), pt(500000, 'vacancy', 'GM'), pt(900000, 'vacancy')];

describe('stats', () => {
  it('gradeRows: N, вакансии/резюме, медиана', () => {
    const rows = gradeRows(PTS, DEFAULT_GRADES, [0.15, 0.5, 0.85]);
    expect(rows.map(r => [r.name, r.count, r.vacancies, r.resumes, r.median])).toEqual([
      ['Intern', 0, 0, 0, 0], ['Junior', 2, 1, 1, 110000], ['Middle', 2, 1, 1, 180000], ['Senior', 1, 1, 0, 300000], ['Lead', 1, 1, 0, 500000],
    ]);
  });
  it('summarize: только точки внутри диапазона грейдов', () => {
    const rows = gradeRows(PTS, DEFAULT_GRADES, [0.5]);
    const s = summarize(PTS, DEFAULT_GRADES, rows);
    expect(s).toMatchObject({ filteredTotal: 7, inRange: 6, vacancies: 4, vacanciesHH: 3, vacanciesGM: 1, resumes: 2, medianVacancy: 250000, medianResume: 130000 });
    expect(s.gap).toBeCloseTo(250000 / 130000 - 1);
    expect(s.top!.name).toBe('Junior');
  });
  it('summarize: пусто → gap null, top null', () => {
    const s = summarize([], DEFAULT_GRADES, gradeRows([], DEFAULT_GRADES, [0.5]));
    expect(s.gap).toBeNull();
    expect(s.top).toBeNull();
    expect(s.medianVacancy).toBe(0);
  });
});

describe('buildExportCsv', () => {
  it('BOM, разделитель «;», экранирование', () => {
    const points = [pt(150000, 'vacancy', 'HH', { company: 'ООО "Ромашка"; филиал', city: 'Москва' })];
    const rows = gradeRows(points, DEFAULT_GRADES, [0.5]);
    const csv = buildExportCsv({ rows, percentiles: [0.5], summary: summarize(points, DEFAULT_GRADES, rows), points, filters: { city: '', company: '', search: '', source: 'Все', step: 10000 } });
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lines = csv.slice(1).trim().split('\r\n');
    expect(lines[0]).toBe('Фильтры;Город: все;Компания: все;Должность: все;Источник: Все;Шаг бина: 10000');
    expect(lines[3]).toBe('Грейд;От, ₽;До, ₽;N;Вакансий;Резюме;Медиана, ₽;P50, ₽');
    expect(lines).toContain('Middle;150000;250000;1;1;0;150000;150000');
    expect(lines[lines.length - 1]).toBe('HH;Вакансия;Dev;"ООО ""Ромашка""; филиал";Москва;150000;2026-11-13T20:00:00.000Z');
  });
});

describe('detectSlot', () => {
  it.each([
    ['hh_res.csv', 'resume-HH'], ['резюме.csv', 'resume-HH'], ['resumes_2026.csv', 'resume-HH'],
    ['gm_vac.csv', 'vacancy-GM'], ['getmatch.csv', 'vacancy-GM'], ['hh_vac.csv', 'vacancy-HH'], ['data.csv', 'vacancy-HH'],
  ])('%s → %s', (name, slot) => expect(detectSlot(name)).toBe(slot));
});

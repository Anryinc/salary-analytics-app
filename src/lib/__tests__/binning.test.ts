import { describe, it, expect } from 'vitest';
import { createBins, computeGradeStats } from '../binning';
import { NormalizedPoint } from '../types';

let n = 0;
const pt = (salaryNet: number, type: 'vacancy' | 'resume' = 'vacancy'): NormalizedPoint => ({
  id: String(n++), source: 'HH', type, position: 'Dev', salaryNet, uploadDate: '2026-11-13',
});

describe('createBins', () => {
  it.each([10000, 20000, 50000])('шаг %i: число бинов, границы и подписи', (step) => {
    const bins = createBins([], step);
    expect(bins).toHaveLength(600000 / step);
    expect(bins[0]).toMatchObject({ from: 0, to: step, label: `0–${step / 1000}т` });
    expect(bins[bins.length - 1].to).toBe(600000);
  });
  it('maxSalary настраивается', () => {
    expect(createBins([], 50000, 700000)).toHaveLength(14);
  });
  it('полуинтервалы [from, to)', () => {
    const bins = createBins([pt(9999), pt(10000), pt(19999), pt(20000)], 10000);
    expect(bins[0].vacancyCount).toBe(1);
    expect(bins[1].vacancyCount).toBe(2);
    expect(bins[2].vacancyCount).toBe(1);
  });
  it('счётчики и доли раздельно для вакансий и резюме', () => {
    const bins = createBins([pt(5000), pt(15000), pt(15000), pt(15000, 'resume'), pt(25000, 'resume'), pt(26000, 'resume'), pt(27000, 'resume')], 10000);
    expect(bins[0]).toMatchObject({ vacancyCount: 1, resumeCount: 0 });
    expect(bins[1]).toMatchObject({ vacancyCount: 2, resumeCount: 1 });
    expect(bins[0].vacancyPct).toBeCloseTo(100 / 3);
    expect(bins[1].vacancyPct).toBeCloseTo(200 / 3);
    expect(bins[1].resumePct).toBeCloseTo(25);
    expect(bins[2].resumePct).toBeCloseTo(75);
  });
  it('доли считаются от всех точек типа, включая те, что выше maxSalary', () => {
    const bins = createBins([pt(5000), pt(900000)], 10000);
    expect(bins[0].vacancyPct).toBe(50);
    expect(bins.reduce((s, b) => s + b.vacancyCount, 0)).toBe(1);
  });
  it('пустой вход — без NaN', () => {
    for (const b of createBins([], 10000)) {
      expect(b.vacancyPct).toBe(0);
      expect(b.resumePct).toBe(0);
      expect(b.percentiles.vacancies.every(v => v === 0)).toBe(true);
      expect(b.percentiles.resumes.every(v => v === 0)).toBe(true);
    }
  });
  it('перцентили 0.1..0.9 внутри бина — линейная интерполяция', () => {
    const bins = createBins([pt(10000), pt(12000), pt(14000), pt(16000), pt(18000)], 10000);
    // idx = (5-1)*p
    expect(bins[1].percentiles.vacancies).toHaveLength(9);
    expect(bins[1].percentiles.vacancies[4]).toBe(14000);          // p=0.5 → idx 2
    expect(bins[1].percentiles.vacancies[0]).toBeCloseTo(10800);   // p=0.1 → idx 0.4
    expect(bins[1].percentiles.vacancies[8]).toBeCloseTo(17200);   // p=0.9 → idx 3.6
    expect(bins[1].percentiles.resumes.every(v => v === 0)).toBe(true);
  });
  it('один элемент — все перцентили равны ему', () => {
    const bins = createBins([pt(33000, 'resume')], 10000);
    expect(bins[3].percentiles.resumes.every(v => v === 33000)).toBe(true);
  });
});

describe('computeGradeStats', () => {
  const pts = [50000, 90000, 100000, 120000, 140000, 150000, 200000, 250000].map(v => pt(v));
  const ranges = [{ name: 'Junior', min: 80000, max: 150000 }, { name: 'Middle', min: 150000, max: 250000 }, { name: 'Empty', min: 600000, max: 700000 }];
  const P = { 1: [0.5], 3: [0.15, 0.5, 0.85], 4: [0.15, 0.35, 0.65, 0.85], 5: [0.1, 0.3, 0.5, 0.7, 0.9] } as const;
  const interp = (s: number[], p: number) => { const i = (s.length - 1) * p, l = Math.floor(i), u = Math.ceil(i); return l === u ? s[l] : s[l] * (u - i) + s[u] * (i - l); };

  it('полуинтервал [min, max) и N', () => {
    const [j, m] = computeGradeStats(pts, ranges, [0.5]);
    expect(j).toMatchObject({ name: 'Junior', min: 80000, max: 150000, count: 4 });
    expect(m.count).toBe(2);
  });
  it.each([1, 3, 4, 5] as const)('%i уровней', (lv) => {
    const [j] = computeGradeStats(pts, ranges, [...P[lv]]);
    const s = [90000, 100000, 120000, 140000];
    expect(j.values).toHaveLength(lv);
    j.values.forEach((v, i) => expect(v).toBeCloseTo(interp(s, P[lv][i])));
  });
  it('конкретные значения для 3 уровней', () => {
    const [j] = computeGradeStats(pts, ranges, [0.15, 0.5, 0.85]);
    expect(j.values[0]).toBeCloseTo(94500);
    expect(j.values[1]).toBeCloseTo(110000);
    expect(j.values[2]).toBeCloseTo(131000);
  });
  it('пустой грейд — нули', () => {
    const e = computeGradeStats(pts, ranges, [0.15, 0.5, 0.85])[2];
    expect(e.count).toBe(0);
    expect(e.values).toEqual([0, 0, 0]);
  });
  it('учитывает и вакансии, и резюме', () => {
    const [j] = computeGradeStats([pt(100000), pt(110000, 'resume')], ranges, [0.5]);
    expect(j.count).toBe(2);
    expect(j.values[0]).toBe(105000);
  });
});

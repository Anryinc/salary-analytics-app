import { describe, it, expect } from 'vitest';
import { DEFAULT_GRADES, GRADE_PERCENTILES, boundariesOf, boundaryLimits, chartMaxOf, moveBoundary, MAX_BOUNDARY } from '../grades';

describe('grades', () => {
  it('грейды и уровни по умолчанию', () => {
    expect(DEFAULT_GRADES.map(g => [g.name, g.min, g.max])).toEqual([
      ['Intern', 0, 80000], ['Junior', 80000, 150000], ['Middle', 150000, 250000], ['Senior', 250000, 400000], ['Lead', 400000, 700000],
    ]);
    expect(GRADE_PERCENTILES).toEqual({ 1: [0.5], 3: [0.15, 0.5, 0.85], 4: [0.15, 0.35, 0.65, 0.85], 5: [0.1, 0.3, 0.5, 0.7, 0.9] });
  });
  it('boundariesOf — 6 границ', () => {
    expect(boundariesOf(DEFAULT_GRADES)).toEqual([0, 80000, 150000, 250000, 400000, 700000]);
  });
  it('moveBoundary двигает смежные грейды вместе, не мутируя исходник', () => {
    const g = moveBoundary(DEFAULT_GRADES, 3, 300000);
    expect(g[2].max).toBe(300000);
    expect(g[3].min).toBe(300000);
    expect(DEFAULT_GRADES[2].max).toBe(250000);
  });
  it('привязка к 5 000 и ограничения соседями', () => {
    expect(boundariesOf(moveBoundary(DEFAULT_GRADES, 2, 171200))[2]).toBe(170000);
    expect(boundaryLimits(DEFAULT_GRADES, 2)).toEqual([90000, 240000]);
    expect(boundariesOf(moveBoundary(DEFAULT_GRADES, 2, 0))[2]).toBe(90000);
    expect(boundariesOf(moveBoundary(DEFAULT_GRADES, 2, 999999))[2]).toBe(240000);
    expect(boundariesOf(moveBoundary(DEFAULT_GRADES, 0, -5000))[0]).toBe(0);
    expect(boundariesOf(moveBoundary(DEFAULT_GRADES, 5, 5e6))[5]).toBe(MAX_BOUNDARY);
    expect(boundariesOf(moveBoundary(DEFAULT_GRADES, 5, 5e6, 700000))[5]).toBe(700000);
  });
  it('chartMaxOf — не меньше 700 000 и покрывает последний грейд', () => {
    expect(chartMaxOf(DEFAULT_GRADES)).toBe(700000);
    expect(chartMaxOf(moveBoundary(DEFAULT_GRADES, 5, 850000))).toBe(850000);
  });
});

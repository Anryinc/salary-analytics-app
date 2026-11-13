import { GradeRange } from './types';

export const DEFAULT_GRADES: GradeRange[] = [
  { name: 'Intern', min: 0, max: 80000 },
  { name: 'Junior', min: 80000, max: 150000 },
  { name: 'Middle', min: 150000, max: 250000 },
  { name: 'Senior', min: 250000, max: 400000 },
  { name: 'Lead', min: 400000, max: 700000 },
];

export const GRADE_PERCENTILES: Record<number, number[]> = {
  1: [0.5],
  3: [0.15, 0.5, 0.85],
  4: [0.15, 0.35, 0.65, 0.85],
  5: [0.1, 0.3, 0.5, 0.7, 0.9],
};

export const GRADE_COLORS = ['#38bdf8', '#22c55e', '#4f46e5', '#f59e0b', '#ec4899'];

/** Шаг перемещения границы (мышь — привязка, клавиатура — шаг), ₽ */
export const BOUNDARY_STEP = 5000;
/** Минимальная ширина грейда, ₽ */
export const MIN_GRADE_WIDTH = 10000;
/** Верхний предел последней границы, ₽ */
export const MAX_BOUNDARY = 1_000_000;
/** Минимальная правая граница шкалы графика, ₽ */
export const CHART_MIN_MAX = 700000;

/** Границы как массив из N+1 значений: [g0.min, g0.max = g1.min, …, gLast.max] */
export function boundariesOf(grades: GradeRange[]): number[] {
  return [grades[0].min, ...grades.map(g => g.max)];
}

/** Допустимый диапазон для границы i (без пересечения соседей). */
export function boundaryLimits(grades: GradeRange[], i: number): [number, number] {
  const b = boundariesOf(grades);
  const lo = i === 0 ? 0 : b[i - 1] + MIN_GRADE_WIDTH;
  const hi = i === b.length - 1 ? MAX_BOUNDARY : b[i + 1] - MIN_GRADE_WIDTH;
  return [lo, hi];
}

/**
 * Перемещает границу i в value (с привязкой к BOUNDARY_STEP и ограничением
 * соседями). Соседние грейды остаются смежными: g[i-1].max === g[i].min.
 */
export function moveBoundary(grades: GradeRange[], i: number, value: number, upper = MAX_BOUNDARY): GradeRange[] {
  const [lo, hi] = boundaryLimits(grades, i);
  const snapped = Math.round(value / BOUNDARY_STEP) * BOUNDARY_STEP;
  const v = Math.min(Math.min(hi, upper), Math.max(lo, snapped));
  return grades.map((g, gi) => ({
    ...g,
    min: gi === i ? v : g.min,
    max: gi === i - 1 ? v : g.max,
  }));
}

export function chartMaxOf(grades: GradeRange[]): number {
  return Math.max(CHART_MIN_MAX, grades[grades.length - 1].max);
}

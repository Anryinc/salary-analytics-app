import { Bin, NormalizedPoint } from './types';

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] * (upper - idx) + sorted[upper] * (idx - lower);
}

export function createBins(points: NormalizedPoint[], step: number, maxSalary = 600000): Bin[] {
  const bins: Bin[] = [];
  const vacancies = points.filter(p => p.type === 'vacancy');
  const resumes = points.filter(p => p.type === 'resume');
  const totalV = vacancies.length || 1;
  const totalR = resumes.length || 1;

  for (let from = 0; from < maxSalary; from += step) {
    const to = from + step;
    const vIn = vacancies.filter(p => p.salaryNet >= from && p.salaryNet < to).map(p => p.salaryNet).sort((a, b) => a - b);
    const rIn = resumes.filter(p => p.salaryNet >= from && p.salaryNet < to).map(p => p.salaryNet).sort((a, b) => a - b);

    const perc = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

    bins.push({
      from,
      to,
      label: `${from / 1000}–${to / 1000}т`,
      vacancyCount: vIn.length,
      resumeCount: rIn.length,
      vacancyPct: (vIn.length / totalV) * 100,
      resumePct: (rIn.length / totalR) * 100,
      percentiles: {
        vacancies: perc.map(p => percentile(vIn, p)),
        resumes: perc.map(p => percentile(rIn, p)),
      },
    });
  }

  return bins;
}

export function computeGradeStats(
  points: NormalizedPoint[],
  ranges: { name: string; min: number; max: number }[],
  percentiles: number[]
) {
  return ranges.map(range => {
    const inRange = points.filter(p => p.salaryNet >= range.min && p.salaryNet < range.max).map(p => p.salaryNet).sort((a, b) => a - b);
    return {
      name: range.name,
      min: range.min,
      max: range.max,
      count: inRange.length,
      values: percentiles.map(p => percentile(inRange, p)),
    };
  });
}

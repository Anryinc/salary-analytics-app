import { Summary } from '../lib/stats';
import { fmtK, fmtNum } from '../lib/format';

export default function KpiCards({ s, lo, hi }: { s: Summary; lo: number; hi: number }) {
  const cards = [
    { id: 'in-range', l: 'Точек в грейдах', v: fmtNum(s.inRange), sub: `из ${fmtNum(s.filteredTotal)} · ${fmtNum(lo / 1000)}–${fmtK(hi)}` },
    { id: 'vacancies', l: 'Вакансии', v: fmtNum(s.vacancies), sub: `HH ${fmtNum(s.vacanciesHH)} · Getmatch ${fmtNum(s.vacanciesGM)}` },
    { id: 'resumes', l: 'Резюме', v: fmtNum(s.resumes), sub: 'HH, в диапазоне грейдов' },
    { id: 'top', l: 'Самый массовый грейд', v: s.top ? s.top.name : '—', sub: s.top ? `${fmtNum(s.top.count)} точек · медиана ${fmtK(s.top.median)}` : 'нет данных' },
    { id: 'gap', l: 'Разрыв ожиданий', v: s.gap === null ? '—' : `${s.gap >= 0 ? '+' : '−'}${Math.abs(Math.round(s.gap * 100))}%`, sub: 'медиана вакансий к резюме' },
  ];
  return (
    <section className="kpis" aria-label="Ключевые показатели">
      {cards.map(c => (
        <div key={c.id} className="card kpi" data-testid={`kpi-${c.id}`}>
          <div className="kpi-l">{c.l}</div>
          <div className="kpi-v">{c.v}</div>
          <div className="kpi-s">{c.sub}</div>
        </div>
      ))}
    </section>
  );
}

import { useEffect, useRef, useState, KeyboardEvent, PointerEvent as RPointerEvent } from 'react';
import { Bin, GradeRange } from '../lib/types';
import { GradeRow, Summary } from '../lib/stats';
import { BOUNDARY_STEP, GRADE_COLORS, boundariesOf, boundaryLimits } from '../lib/grades';
import { fmtK, fmtNum, fmtRub, pLabel } from '../lib/format';

interface Props {
  bins: Bin[];
  step: number;
  grades: GradeRange[];
  rows: GradeRow[];
  percentiles: number[];
  summary: Summary;
  chartMax: number;
  totalPoints: number;
  filteredPoints: number;
  /** Сдвинуть границу i к значению value (₽); upper — предел для указателя */
  onMoveBoundary: (i: number, value: number, upper?: number) => void;
}

const pct = (v: number, max: number) => `${(Math.max(0, Math.min(v, max)) / max) * 100}%`;
const fmtPct = (v: number) => `${v.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%`;

export default function Distribution(p: Props) {
  const { bins, grades, rows, percentiles, summary, chartMax } = p;
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ i: number; left: number; width: number; max: number } | null>(null);
  const [dragging, setDragging] = useState(-1);
  const [focused, setFocused] = useState(-1);
  const [hoverBin, setHoverBin] = useState(-1);
  const bounds = boundariesOf(grades);
  const move = useRef(p.onMoveBoundary);
  move.current = p.onMoveBoundary;

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d || d.width <= 0) return;
      move.current(d.i, ((e.clientX - d.left) / d.width) * d.max, d.max);
    };
    const onUp = () => { if (drag.current) { drag.current = null; setDragging(-1); } };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  const startDrag = (i: number) => (e: RPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).focus();
    const r = trackRef.current!.getBoundingClientRect();
    drag.current = { i, left: r.left, width: r.width, max: chartMax };
    setDragging(i);
  };
  const onKey = (i: number) => (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    p.onMoveBoundary(i, bounds[i] + (e.key === 'ArrowLeft' ? -BOUNDARY_STEP : BOUNDARY_STEP));
  };

  const yMax = Math.max(2, Math.ceil(Math.max(0, ...bins.map(b => Math.max(b.vacancyPct, b.resumePct))) / 2) * 2);
  const yTicks = Array.from({ length: yMax / 2 + 1 }, (_, i) => i * 2);
  const tickStep = chartMax > 1_000_000 ? 100000 : 50000;
  const xTicks = Array.from({ length: Math.floor(chartMax / tickStep) + 1 }, (_, i) => i * tickStep);
  const binW = (p.step / chartMax) * 100;
  const hb = hoverBin >= 0 ? bins[hoverBin] : null;
  const empty = p.totalPoints === 0 ? 'Загрузите CSV-файлы слева — здесь появится распределение зарплат'
    : p.filteredPoints === 0 ? 'Под выбранные фильтры не попала ни одна точка' : null;
  const names = (i: number) => i === 0 ? `Нижняя граница ${grades[0].name}` : i === bounds.length - 1 ? `Верхняя граница ${grades[grades.length - 1].name}` : `Граница ${grades[i - 1].name} / ${grades[i].name}`;
  const lastPerc = percentiles[percentiles.length - 1];

  return (
    <section className="card dist" aria-label="Распределение зарплат и лестница грейдов">
      <div className="dist-head">
        <div>
          <h3>Распределение зарплат и лестница грейдов</h3>
          <p className="hint">Тяните ручки ‖ над графиком влево/вправо (или стрелки ← → на клавиатуре) — границы грейдов, перцентили и KPI пересчитываются сразу</p>
        </div>
        <div className="leg"><span style={{ ['--c' as string]: '#4f46e5' }}>Вакансии</span><span style={{ ['--c' as string]: '#c7d2fe' }}>Резюме</span></div>
      </div>

      <div className="dist-body">
        <div className="plot-overlay" aria-hidden>
          <div className="zone out" style={{ left: 0, width: pct(bounds[0], chartMax) }} />
          {grades.map((g, i) => (
            <div key={g.name} className={`zone ${dragging === i || dragging === i + 1 ? 'active' : ''}`}
              style={{ left: pct(g.min, chartMax), width: `calc(${pct(g.max, chartMax)} - ${pct(g.min, chartMax)})`, background: GRADE_COLORS[i] }} />
          ))}
          <div className="zone out" style={{ left: pct(bounds[bounds.length - 1], chartMax), right: 0 }} />
          {bounds.map((b, i) => <div key={i} className={`bline ${dragging === i ? 'active' : ''}`} style={{ left: pct(b, chartMax) }} />)}
        </div>

        {/* ручки границ */}
        <div className="row track-row">
          <div className="lcol small">Границы грейдов</div>
          <div className="track" ref={trackRef} data-testid="boundary-track">
            {grades.map((g, i) => (
              <span key={g.name} className="zone-name" style={{ left: `calc((${pct(g.min, chartMax)} + ${pct(g.max, chartMax)}) / 2)`, color: GRADE_COLORS[i] }}>{g.name}</span>
            ))}
            {bounds.map((b, i) => {
              const [lo, hi] = boundaryLimits(grades, i);
              const active = dragging === i || focused === i;
              return (
                <div key={i} role="slider" tabIndex={0} aria-label={names(i)} aria-valuemin={lo} aria-valuemax={hi} aria-valuenow={b}
                  aria-valuetext={fmtRub(b)} data-testid={`handle-${i}`}
                  className={`handle ${active ? 'active' : ''} ${dragging === i ? 'dragging' : ''}`} style={{ left: pct(b, chartMax) }}
                  onPointerDown={startDrag(i)} onKeyDown={e => { setFocused(i); onKey(i)(e); }} onBlur={() => setFocused(-1)}>
                  <span className="grip" />
                  {active && <span className="pill">◀ {fmtRub(b)} ▶</span>}
                </div>
              );
            })}
          </div>
          <div className="rcol" />
        </div>

        {/* гистограмма */}
        <div className="row hist-row">
          <div className="lcol yaxis">
            {yTicks.map(t => <span key={t} style={{ bottom: `${(t / yMax) * 100}%` }}>{t}%</span>)}
          </div>
          <div className="plot" data-testid="histogram" onMouseLeave={() => setHoverBin(-1)}>
            {yTicks.map(t => <div key={t} className="grid" style={{ bottom: `${(t / yMax) * 100}%` }} />)}
            {bins.map((b, i) => (
              <div key={b.from} className={`bin ${hoverBin === i ? 'hover' : ''}`} style={{ left: pct(b.from, chartMax), width: `${binW}%` }}
                onMouseEnter={() => setHoverBin(i)} data-testid="bin">
                <i className="bar res" style={{ height: `${(b.resumePct / yMax) * 100}%` }} />
                <i className="bar vac" style={{ height: `${(b.vacancyPct / yMax) * 100}%` }} />
              </div>
            ))}
            {summary.vacancies > 0 && <div className="median vac" style={{ left: pct(summary.medianVacancy, chartMax) }} />}
            {summary.resumes > 0 && <div className="median res" style={{ left: pct(summary.medianResume, chartMax) }} />}
            {hb && (
              <div className="tip" role="tooltip" style={{ left: pct(hb.from + p.step / 2, chartMax), transform: `translateX(${(hb.from + p.step / 2) / chartMax < 0.15 ? '-10%' : (hb.from + p.step / 2) / chartMax > 0.85 ? '-90%' : '-50%'})` }}>
                <b>{fmtNum(hb.from)} – {fmtNum(hb.to)} ₽</b>
                <span><i className="sw vac" />Вакансии: {hb.vacancyCount} ({fmtPct(hb.vacancyPct)})</span>
                <span><i className="sw res" />Резюме: {hb.resumeCount} ({fmtPct(hb.resumePct)})</span>
              </div>
            )}
            {empty && <div className="empty">{empty}</div>}
          </div>
          <div className="rcol medians">
            <div><span>Медиана вакансий</span><b className="c-vac" data-testid="median-vacancy">{summary.vacancies ? fmtRub(summary.medianVacancy) : '—'}</b></div>
            <div><span>Медиана резюме</span><b className="c-res" data-testid="median-resume">{summary.resumes ? fmtRub(summary.medianResume) : '—'}</b></div>
          </div>
        </div>
        <div className="row axis-row">
          <div className="lcol" />
          <div className="xaxis">{xTicks.map(t => <span key={t} style={{ left: pct(t, chartMax) }}>{t ? `${t / 1000}т` : '0'}</span>)}</div>
          <div className="rcol" />
        </div>

        {/* лестница грейдов */}
        <div className="row ladder-head">
          <div className="lcol"><h3>Лестница грейдов</h3></div>
          <div className="small ladder-legend">{percentiles.length === 1 ? 'риска — медиана (P50)' : `полоса — ${pLabel(percentiles[0])}…${pLabel(lastPerc)}${percentiles.includes(0.5) ? ', тёмная риска — P50' : ''}, светлые риски — промежуточные уровни`}</div>
          <div className="rcol small right">
            {percentiles.map(pLabel).join(' · ')}, тыс. ₽
          </div>
        </div>
        {rows.map((g, i) => {
          const a = g.values[0], z = g.values[g.values.length - 1];
          return (
            <div className="row ladder-row" key={g.name} data-testid={`grade-${g.name}`}>
              <div className="lcol gname">
                <i className="gbar" style={{ background: GRADE_COLORS[i] }} />
                <div><b>{g.name}</b><span data-testid="grade-range">{fmtK(g.min)} – {fmtK(g.max)} · <span data-testid="grade-n">N {fmtNum(g.count)}</span></span></div>
              </div>
              <div className="ltrack">
                <div className="base" />
                {g.count > 0 && percentiles.length > 1 && (
                  <div className="range" style={{ left: pct(a, chartMax), width: `calc(${pct(z, chartMax)} - ${pct(a, chartMax)})`, background: GRADE_COLORS[i] }} />
                )}
                {g.count > 0 && g.values.map((v, j) => {
                  const p50 = percentiles[j] === 0.5;
                  if (!p50 && (j === 0 || j === g.values.length - 1)) return null;
                  return <div key={j} className={`tick ${p50 ? 'p50' : ''}`} style={{ left: pct(v, chartMax) }} title={`${pLabel(percentiles[j])}: ${fmtRub(v)}`} />;
                })}
              </div>
              <div className="rcol gval">
                {g.count > 0 ? (
                  <>
                    <b data-testid="grade-median">{fmtRub(g.median)}</b>
                    <span data-testid="grade-perc" title={g.values.map((v, j) => `${pLabel(percentiles[j])}: ${fmtRub(v)}`).join(', ')}>{g.values.map(v => fmtNum(Math.round(v / 1000))).join(' · ')}{'\u00a0т'}</span>
                  </>
                ) : <span className="muted" data-testid="grade-median">нет данных</span>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

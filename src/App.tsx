import { useMemo, useState } from 'react';
import Papa from 'papaparse';
import { GradeRange, NormalizedPoint, RawRow } from './lib/types';
import { normalizeRows } from './lib/normalizer';
import { createBins } from './lib/binning';
import { DEFAULT_GRADES, GRADE_PERCENTILES, chartMaxOf, moveBoundary } from './lib/grades';
import { gradeRows, summarize } from './lib/stats';
import { buildExportCsv, downloadCsv } from './lib/export';
import { fmtUploadDate } from './lib/format';
import Sidebar, { SLOTS, SlotId, SlotState, SourceFilter } from './components/Sidebar';
import KpiCards from './components/KpiCards';
import Distribution from './components/Distribution';

const emptySlots = (): Record<SlotId, SlotState> => ({
  'resume-HH': { files: [], points: 0 },
  'vacancy-HH': { files: [], points: 0 },
  'vacancy-GM': { files: [], points: 0 },
});

export default function App() {
  const [points, setPoints] = useState<NormalizedPoint[]>([]);
  const [slots, setSlots] = useState(emptySlots);
  const [step, setStep] = useState(10000);
  const [gradeCount, setGradeCount] = useState(3);
  const [grades, setGrades] = useState<GradeRange[]>(DEFAULT_GRADES);
  const [filterCity, setFilterCity] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [search, setSearch] = useState('');
  const [source, setSource] = useState<SourceFilter>('all');

  const filtered = useMemo(() => {
    return points.filter(p => {
      if (source !== 'all' && p.source !== source) return false;
      if (filterCity && !(p.city || '').toLowerCase().includes(filterCity.toLowerCase())) return false;
      if (filterCompany && !(p.company || '').toLowerCase().includes(filterCompany.toLowerCase())) return false;
      if (search && !p.position.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [points, filterCity, filterCompany, search, source]);

  const chartMax = chartMaxOf(grades);
  const perc = GRADE_PERCENTILES[gradeCount] || GRADE_PERCENTILES[3];
  const bins = useMemo(() => createBins(filtered, step, chartMax), [filtered, step, chartMax]);
  const rows = useMemo(() => gradeRows(filtered, grades, perc), [filtered, grades, perc]);
  const summary = useMemo(() => summarize(filtered, grades, rows), [filtered, grades, rows]);
  const lastUpload = points.reduce<string | null>((m, p) => (!m || p.uploadDate > m ? p.uploadDate : m), null);

  const handleFiles = (files: File[], slotId: SlotId) => {
    const slot = SLOTS.find(s => s.id === slotId)!;
    files.forEach(file => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const rows = result.data as RawRow[];
          const uploadDate = new Date().toISOString();
          const newPoints = normalizeRows(rows, slot.type, slot.source, uploadDate);
          setPoints(prev => [...prev, ...newPoints]);
          setSlots(prev => ({ ...prev, [slotId]: { files: [...prev[slotId].files, file.name], points: prev[slotId].points + newPoints.length } }));
        },
      });
    });
  };

  const exportCsv = () => {
    const csv = buildExportCsv({
      rows, percentiles: perc, summary, points: filtered,
      filters: { city: filterCity, company: filterCompany, search, source: source === 'all' ? 'Все' : source === 'GM' ? 'Getmatch' : 'HH', step },
    });
    downloadCsv(csv, `salary-analytics-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="app">
      <Sidebar
        slots={slots} total={points.length} filtered={filtered.length}
        onFiles={handleFiles} onClear={() => { setPoints([]); setSlots(emptySlots()); }}
        city={filterCity} setCity={setFilterCity} company={filterCompany} setCompany={setFilterCompany}
        search={search} setSearch={setSearch} source={source} setSource={setSource}
        step={step} setStep={setStep} gradeCount={gradeCount} setGradeCount={setGradeCount}
      />
      <main className="main">
        <div className="top">
          <div>
            <h2>Обзор рынка</h2>
            <p className="muted">{lastUpload ? `Данные от ${fmtUploadDate(lastUpload)}` : 'Данные не загружены'} · все суммы — net, ₽ на руки</p>
          </div>
          <div className="actions">
            <button type="button" className="btn" onClick={() => setGrades(DEFAULT_GRADES)}>Сбросить границы</button>
            <button type="button" className="btn primary" onClick={exportCsv}>Экспорт CSV</button>
          </div>
        </div>
        <KpiCards s={summary} lo={grades[0].min} hi={grades[grades.length - 1].max} />
        <Distribution
          bins={bins} step={step} grades={grades} rows={rows} percentiles={perc} summary={summary} chartMax={chartMax}
          totalPoints={points.length} filteredPoints={filtered.length}
          onMoveBoundary={(i, v, upper) => setGrades(g => moveBoundary(g, i, v, upper))}
        />
      </main>
    </div>
  );
}

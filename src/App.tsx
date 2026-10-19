import { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceArea } from 'recharts';
import { NormalizedPoint, RawRow } from './lib/types';
import { normalizeRows } from './lib/normalizer';
import { createBins, computeGradeStats } from './lib/binning';

const DEFAULT_GRADES = [
  { name: 'Intern', min: 0, max: 80000 },
  { name: 'Junior', min: 80000, max: 150000 },
  { name: 'Middle', min: 150000, max: 250000 },
  { name: 'Senior', min: 250000, max: 400000 },
  { name: 'Lead', min: 400000, max: 700000 },
];

const GRADE_PERCENTILES: Record<number, number[]> = {
  1: [0.5],
  3: [0.15, 0.5, 0.85],
  4: [0.15, 0.35, 0.65, 0.85],
  5: [0.1, 0.3, 0.5, 0.7, 0.9],
};

export default function App() {
  const [points, setPoints] = useState<NormalizedPoint[]>([]);
  const [step, setStep] = useState(10000);
  const [gradeCount, setGradeCount] = useState(3);
  const [grades, setGrades] = useState(DEFAULT_GRADES);
  const [filterCity, setFilterCity] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return points.filter(p => {
      if (filterCity && !(p.city || '').toLowerCase().includes(filterCity.toLowerCase())) return false;
      if (filterCompany && !(p.company || '').toLowerCase().includes(filterCompany.toLowerCase())) return false;
      if (search && !p.position.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [points, filterCity, filterCompany, search]);

  const bins = useMemo(() => createBins(filtered, step), [filtered, step]);
  const gradeStats = useMemo(() => {
    const perc = GRADE_PERCENTILES[gradeCount] || GRADE_PERCENTILES[3];
    return computeGradeStats(filtered, grades, perc);
  }, [filtered, grades, gradeCount]);

  const chartData = bins.map(b => ({
    name: b.label,
    vacancies: b.vacancyPct,
    resumes: b.resumePct,
    from: b.from,
    to: b.to,
  }));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, type: 'vacancy' | 'resume', source: 'HH' | 'GM') => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data as RawRow[];
        const uploadDate = new Date().toISOString();
        const newPoints = normalizeRows(rows, type, source, uploadDate);
        setPoints(prev => [...prev, ...newPoints]);
      },
    });
  };

  const updateGrade = (idx: number, field: 'min' | 'max', value: string) => {
    const num = Number(value) || 0;
    setGrades(prev => prev.map((g, i) => i === idx ? { ...g, [field]: num } : g));
  };

  return (
    <div>
      <h1>Аналитика зарплат</h1>

      <div className="card">
        <h3>Загрузка данных</h3>
        <div>
          <label>Резюме HH: <input type="file" accept=".csv" onChange={e => handleFile(e, 'resume', 'HH')} /></label><br/>
          <label>Вакансии HH: <input type="file" accept=".csv" onChange={e => handleFile(e, 'vacancy', 'HH')} /></label><br/>
          <label>Вакансии Getmatch: <input type="file" accept=".csv" onChange={e => handleFile(e, 'vacancy', 'GM')} /></label>
        </div>
        <p>Загружено точек: {points.length} (после фильтров: {filtered.length})</p>
      </div>

      <div className="card">
        <h3>Фильтры</h3>
        <input placeholder="Город" value={filterCity} onChange={e => setFilterCity(e.target.value)} />
        <input placeholder="Компания" value={filterCompany} onChange={e => setFilterCompany(e.target.value)} />
        <input placeholder="Поиск по должности" value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ marginTop: 8 }}>
          Шаг бина:
          <select value={step} onChange={e => setStep(Number(e.target.value))}>
            <option value={10000}>10 тыс.</option>
            <option value={20000}>20 тыс.</option>
            <option value={50000}>50 тыс.</option>
          </select>
          &nbsp; Кол-во уровней грейда:
          <select value={gradeCount} onChange={e => setGradeCount(Number(e.target.value))}>
            <option value={1}>1</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
            <option value={5}>5</option>
          </select>
        </div>
      </div>

      <div className="card">
        <h3>Границы грейдов (ручные)</h3>
        {grades.map((g, i) => (
          <div key={g.name} style={{ marginBottom: 8 }}>
            <strong>{g.name}</strong>:&nbsp;
            <input type="number" value={g.min} onChange={e => updateGrade(i, 'min', e.target.value)} style={{ width: 100 }} />
            &nbsp;—&nbsp;
            <input type="number" value={g.max} onChange={e => updateGrade(i, 'max', e.target.value)} style={{ width: 100 }} />
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Сводка по грейдам</h3>
        <table border={1} cellPadding={6} style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th>Грейд</th>
              <th>Min</th>
              <th>Max</th>
              <th>N</th>
              {(GRADE_PERCENTILES[gradeCount] || []).map((_, i) => <th key={i}>Грейд {i+1}</th>)}
            </tr>
          </thead>
          <tbody>
            {gradeStats.map(s => (
              <tr key={s.name}>
                <td>{s.name}</td>
                <td>{s.min.toLocaleString()}</td>
                <td>{s.max.toLocaleString()}</td>
                <td>{s.count}</td>
                {s.values.map((v, i) => <td key={i}>{Math.round(v).toLocaleString()}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Распределение (вакансии ярче, резюме полупрозрачные)</h3>
        <ResponsiveContainer width="100%" height={420}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
            <YAxis unit="%" />
            <Tooltip />
            <Legend />
            {grades.map((g, i) => (
              <ReferenceArea
                key={g.name}
                x1={chartData.find(d => d.from >= g.min)?.name}
                x2={chartData.find(d => d.to <= g.max)?.name}
                fill={['#93c5fd', '#86efac', '#fde047', '#fdba74', '#f9a8d4'][i % 5]}
                fillOpacity={0.25}
                label={{ value: g.name, position: 'insideTop' }}
              />
            ))}
            <Bar dataKey="vacancies" name="Вакансии" fill="#2563eb" />
            <Bar dataKey="resumes" name="Резюме" fill="#93c5fd" fillOpacity={0.5} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

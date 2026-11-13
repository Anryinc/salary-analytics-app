import { useState, DragEvent } from 'react';
import { RecordType, Source } from '../lib/types';
import { fmtNum } from '../lib/format';

export type SlotId = 'resume-HH' | 'vacancy-HH' | 'vacancy-GM';
export type SourceFilter = 'all' | Source;

export const SLOTS: { id: SlotId; title: string; type: RecordType; source: Source }[] = [
  { id: 'resume-HH', title: 'Резюме HH', type: 'resume', source: 'HH' },
  { id: 'vacancy-HH', title: 'Вакансии HH', type: 'vacancy', source: 'HH' },
  { id: 'vacancy-GM', title: 'Вакансии Getmatch', type: 'vacancy', source: 'GM' },
];

/** Автоопределение слота по имени файла: резюме → HH-резюме, gm/getmatch → GM, иначе HH-вакансии. */
export function detectSlot(fileName: string): SlotId {
  const n = fileName.toLowerCase();
  if (/(^|[^a-z])(res|resume|cv)|резюм/.test(n)) return 'resume-HH';
  if (/gm|getmatch|гетматч/.test(n)) return 'vacancy-GM';
  return 'vacancy-HH';
}

export interface SlotState { files: string[]; points: number }

interface Props {
  slots: Record<SlotId, SlotState>;
  total: number;
  filtered: number;
  onFiles: (files: File[], slot: SlotId) => void;
  onClear: () => void;
  city: string; setCity: (v: string) => void;
  company: string; setCompany: (v: string) => void;
  search: string; setSearch: (v: string) => void;
  source: SourceFilter; setSource: (v: SourceFilter) => void;
  step: number; setStep: (v: number) => void;
  gradeCount: number; setGradeCount: (v: number) => void;
}

function Segmented<T extends string | number>({ label, options, value, onChange }: {
  label: string; options: { v: T; l: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(o => (
        <button key={String(o.v)} type="button" className={o.v === value ? 'on' : ''} aria-pressed={o.v === value} onClick={() => onChange(o.v)}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

const csvFiles = (list: FileList | null) => Array.from(list || []);

export default function Sidebar(p: Props) {
  const [over, setOver] = useState<string | null>(null);
  const [extraSlot, setExtraSlot] = useState<'auto' | SlotId>('auto');

  const drop = (e: DragEvent, slot: SlotId | 'extra') => {
    e.preventDefault();
    setOver(null);
    const files = csvFiles(e.dataTransfer.files);
    if (slot !== 'extra') return p.onFiles(files, slot);
    files.forEach(f => p.onFiles([f], extraSlot === 'auto' ? detectSlot(f.name) : extraSlot));
  };
  const dragProps = (id: string) => ({
    onDragOver: (e: DragEvent) => { e.preventDefault(); setOver(id); },
    onDragLeave: () => setOver(null),
  });

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-logo" aria-hidden>₽</span>
        <h1>Аналитика зарплат</h1>
        <span className="app-version" title={`commit ${__APP_COMMIT__}`}>v{__APP_VERSION__}</span>
      </div>

      <h4>Загрузка данных</h4>
      {SLOTS.map(s => {
        const st = p.slots[s.id];
        const ok = st.files.length > 0;
        return (
          <label key={s.id} className={`drop ${ok ? 'ok' : ''} ${over === s.id ? 'over' : ''}`} {...dragProps(s.id)} onDrop={e => drop(e, s.id)}>
            <span className={`src-ic ${s.source}`}>{s.source === 'GM' ? 'GM' : 'HH'}</span>
            <span className="drop-text">
              <b>{s.title}</b>
              <span>{ok ? `${st.files.join(', ')} · ${fmtNum(st.points)} точек` : 'Перетащите CSV или выберите файл'}</span>
            </span>
            {ok && <span className="chk" aria-label="загружено">✓</span>}
            <input type="file" accept=".csv,text/csv" multiple aria-label={s.title} className="visually-hidden"
              onChange={e => { p.onFiles(csvFiles(e.target.files), s.id); e.target.value = ''; }} />
          </label>
        );
      })}
      <div className={`drop extra ${over === 'extra' ? 'over' : ''}`} {...dragProps('extra')} onDrop={e => drop(e, 'extra')}>
        <label className="extra-pick">
          + Перетащите ещё CSV или выберите файл
          <input type="file" accept=".csv,text/csv" multiple aria-label="Дополнительный CSV" className="visually-hidden"
            onChange={e => { csvFiles(e.target.files).forEach(f => p.onFiles([f], extraSlot === 'auto' ? detectSlot(f.name) : extraSlot)); e.target.value = ''; }} />
        </label>
        <select aria-label="Тип дополнительного файла" value={extraSlot} onChange={e => setExtraSlot(e.target.value as 'auto' | SlotId)}>
          <option value="auto">Тип: определить по имени</option>
          {SLOTS.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      </div>
      <div className="loaded">
        <span>Загружено точек: {p.total} (после фильтров: {p.filtered})</span>
        {p.total > 0 && <button type="button" className="link" onClick={p.onClear}>Очистить данные</button>}
      </div>

      <h4>Фильтры</h4>
      <input className="field" placeholder="Город" aria-label="Город" value={p.city} onChange={e => p.setCity(e.target.value)} />
      <input className="field" placeholder="Компания" aria-label="Компания" value={p.company} onChange={e => p.setCompany(e.target.value)} />
      <input className="field" placeholder="Поиск по должности" aria-label="Поиск по должности" value={p.search} onChange={e => p.setSearch(e.target.value)} />
      <div className="lbl">Источник</div>
      <Segmented label="Источник" value={p.source} onChange={p.setSource}
        options={[{ v: 'all', l: 'Все' }, { v: 'HH', l: 'HH' }, { v: 'GM', l: 'Getmatch' }]} />

      <h4>Параметры</h4>
      <div className="lbl">Шаг бина</div>
      <Segmented label="Шаг бина" value={p.step} onChange={p.setStep}
        options={[{ v: 10000, l: '10 тыс.' }, { v: 20000, l: '20 тыс.' }, { v: 50000, l: '50 тыс.' }]} />
      <div className="lbl">Уровней внутри грейда</div>
      <Segmented label="Уровней внутри грейда" value={p.gradeCount} onChange={p.setGradeCount}
        options={[1, 3, 4, 5].map(v => ({ v, l: String(v) }))} />
    </aside>
  );
}

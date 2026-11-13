// Сценарии UI. Инварианты из baseline-тестов (до редизайна) сохранены:
// заголовок/версия, накопление точек, фильтры город/компания/должность,
// шаг бина, уровни 1/3/4/5 с теми же перцентилями, влияние границ на диапазон и N.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

const csv = (rows: string[][]) =>
  ['индекс,уникальность,должность,Компания,город,ЗП', ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
const file = (name: string, body: string) => new File([body], name, { type: 'text/csv' });

const RES = csv([
  ['r1', '1', 'Python-разработчик', '', 'Москва', '100000 ₽ на руки'],
  ['r2', '1', 'QA-инженер', '', 'Казань', '160000 ₽ на руки'],
]);
const VAC = csv([
  ['v1', '1', 'Python-разработчик', 'Яндекс', 'Москва', 'от 200000 до 300000 ₽ на руки'],
  ['v2', '1', 'Frontend-разработчик', 'Сбер', 'Санкт-Петербург', '120000 ₽ на руки'],
  ['v3', '2', 'Дубль', 'Сбер', 'Москва', '999000 ₽'],
]);
const GM = csv([['g1', '1', 'Python Lead', 'Ozon', 'Москва', '500000 ₽ на руки']]);

const norm = (s: string | null | undefined) => (s || '').replace(/\s/g, ' ').trim();
const loadedText = () => norm(screen.getByText(/Загружено точек:/).textContent);

async function loadAll() {
  const user = userEvent.setup();
  render(<App />);
  await user.upload(screen.getByLabelText('Резюме HH'), file('hh_res.csv', RES));
  await screen.findByText(/Загружено точек: 2 /);
  await user.upload(screen.getByLabelText('Вакансии HH'), file('hh_vac.csv', VAC));
  await screen.findByText(/Загружено точек: 5 /);
  await user.upload(screen.getByLabelText('Вакансии Getmatch'), file('gm_vac.csv', GM));
  await screen.findByText(/Загружено точек: 6 \(после фильтров: 6\)/);
  return user;
}

const grade = (name: string) => screen.getByTestId(`grade-${name}`);
const range = (name: string) => norm(within(grade(name)).getByTestId('grade-range').textContent);
const median = (name: string) => norm(within(grade(name)).getByTestId('grade-median').textContent);
/** Точные значения перцентилей грейда в рублях (из title) */
const percs = (name: string) =>
  norm(within(grade(name)).getByTestId('grade-perc').getAttribute('title')).split(', ');
const kpi = (id: string) => norm(screen.getByTestId(`kpi-${id}`).textContent);
const group = (label: string) => within(screen.getByRole('group', { name: label }));
const handle = (i: number) => screen.getByTestId(`handle-${i}`);

/** Трек ручек: 700 px ↔ 0…700 000 ₽ (1 px = 1000 ₽) */
function mockTrack() {
  const track = screen.getByTestId('boundary-track');
  track.getBoundingClientRect = () => ({ left: 0, width: 700, top: 0, height: 32, right: 700, bottom: 32, x: 0, y: 0, toJSON: () => ({}) });
}
function drag(i: number, toPx: number) {
  fireEvent.pointerDown(handle(i), { clientX: 0 });
  act(() => { window.dispatchEvent(new PointerEvent('pointermove', { clientX: toPx })); });
  act(() => { window.dispatchEvent(new PointerEvent('pointerup', { clientX: toPx })); });
}

afterEach(() => vi.restoreAllMocks());

describe('App — оболочка', () => {
  it('заголовок, бейдж версии с commit-подсказкой', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Аналитика зарплат' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Обзор рынка' })).toBeInTheDocument();
    const badge = screen.getByText('v0.1.0');
    expect(badge).toHaveAttribute('title', 'commit dev');
  });

  it('пустое состояние до загрузки, интерактивная оболочка видна', () => {
    render(<App />);
    expect(screen.getByText('Загрузите CSV-файлы слева — здесь появится распределение зарплат')).toBeInTheDocument();
    expect(screen.getByText(/Данные не загружены/)).toBeInTheDocument();
    expect(screen.getAllByRole('slider')).toHaveLength(6);
    expect(median('Middle')).toBe('нет данных');
    expect(kpi('gap')).toContain('—');
  });

  it('нет отдельных числовых полей для границ грейдов', () => {
    render(<App />);
    expect(screen.queryAllByRole('spinbutton')).toHaveLength(0);
    expect(document.querySelectorAll('input[type="number"]')).toHaveLength(0);
  });

  it('гистограмма покрывает весь диапазон грейдов 0…700 тыс. (createBins с chartMax)', () => {
    render(<App />);
    expect(screen.getAllByTestId('bin')).toHaveLength(70);
  });
});

describe('App — загрузка', () => {
  it('3 CSV накапливают точки (вилка → 2 точки, дубль пропущен), карточки показывают файл и N', async () => {
    await loadAll();
    expect(loadedText()).toBe('Загружено точек: 6 (после фильтров: 6)');
    expect(norm(screen.getByLabelText('Вакансии HH').closest('label')!.textContent)).toContain('hh_vac.csv · 3 точек');
    expect(screen.getAllByLabelText('загружено')).toHaveLength(3);
    expect(screen.queryByText(/Загрузите CSV-файлы/)).not.toBeInTheDocument();
    expect(screen.getByText(/Данные от /)).toBeInTheDocument();
  });

  it('повторная загрузка в тот же слот добавляет точки', async () => {
    const user = await loadAll();
    await user.upload(screen.getByLabelText('Вакансии Getmatch'), file('gm2.csv', csv([['g2', '1', 'Dev', 'VK', 'Казань', '250000']])));
    await screen.findByText(/Загружено точек: 7 /);
    expect(norm(screen.getByLabelText('Вакансии Getmatch').closest('label')!.textContent)).toContain('gm_vac.csv, gm2.csv · 2 точек');
  });

  it('дополнительная зона: автоопределение слота по имени и ручной выбор типа', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.upload(screen.getByLabelText('Дополнительный CSV'), file('getmatch_extra.csv', GM));
    await screen.findByText(/Загружено точек: 1 /);
    expect(norm(screen.getByLabelText('Вакансии Getmatch').closest('label')!.textContent)).toContain('getmatch_extra.csv');
    await user.selectOptions(screen.getByLabelText('Тип дополнительного файла'), 'resume-HH');
    await user.upload(screen.getByLabelText('Дополнительный CSV'), file('data.csv', RES));
    await screen.findByText(/Загружено точек: 3 /);
    expect(kpi('resumes')).toContain('2');
  });

  it('«Очистить данные» сбрасывает загруженные точки', async () => {
    const user = await loadAll();
    await user.click(screen.getByRole('button', { name: 'Очистить данные' }));
    expect(loadedText()).toBe('Загружено точек: 0 (после фильтров: 0)');
    expect(screen.getByText(/Загрузите CSV-файлы/)).toBeInTheDocument();
  });
});

describe('App — фильтры', () => {
  it('город/компания/должность — регистронезависимо', async () => {
    const user = await loadAll();
    await user.type(screen.getByPlaceholderText('Город'), 'москва');
    expect(loadedText()).toContain('после фильтров: 4)');
    await user.type(screen.getByPlaceholderText('Компания'), 'ЯНДЕКС');
    expect(loadedText()).toContain('после фильтров: 2)');
    await user.clear(screen.getByPlaceholderText('Город'));
    await user.clear(screen.getByPlaceholderText('Компания'));
    await user.type(screen.getByPlaceholderText('Поиск по должности'), 'PYTHON');
    expect(loadedText()).toContain('после фильтров: 4)');
  });

  it('источник Все / HH / Getmatch', async () => {
    const user = await loadAll();
    await user.click(group('Источник').getByRole('button', { name: 'Getmatch' }));
    expect(loadedText()).toContain('после фильтров: 1)');
    expect(kpi('vacancies')).toContain('HH 0 · Getmatch 1');
    await user.click(group('Источник').getByRole('button', { name: 'HH' }));
    expect(loadedText()).toContain('после фильтров: 5)');
    await user.click(group('Источник').getByRole('button', { name: 'Все' }));
    expect(loadedText()).toContain('после фильтров: 6)');
  });

  it('фильтр без совпадений — пустое состояние', async () => {
    const user = await loadAll();
    await user.type(screen.getByPlaceholderText('Город'), 'Владивосток');
    expect(screen.getByText('Под выбранные фильтры не попала ни одна точка')).toBeInTheDocument();
    expect(screen.getAllByRole('slider')).toHaveLength(6);
  });
});

describe('App — параметры', () => {
  it('шаг бина 10/20/50 тыс. меняет число бинов', async () => {
    const user = await loadAll();
    const g = group('Шаг бина');
    for (const [label, count] of [['20 тыс.', 35], ['50 тыс.', 14], ['10 тыс.', 70]] as const) {
      await user.click(g.getByRole('button', { name: label }));
      expect(g.getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getAllByTestId('bin')).toHaveLength(count);
    }
  });

  it('уровни грейда 1/3/4/5 пересчитывают перцентили (Middle: 160к, 200к)', async () => {
    const user = await loadAll();
    const g = group('Уровней внутри грейда');
    expect(range('Middle')).toBe('150 т – 250 т · N 2');
    expect(percs('Middle')).toEqual(['P15: 166 000 ₽', 'P50: 180 000 ₽', 'P85: 194 000 ₽']);
    expect(median('Middle')).toBe('180 000 ₽');
    await user.click(g.getByRole('button', { name: '1' }));
    expect(percs('Middle')).toEqual(['P50: 180 000 ₽']);
    await user.click(g.getByRole('button', { name: '4' }));
    expect(percs('Middle')).toEqual(['P15: 166 000 ₽', 'P35: 174 000 ₽', 'P65: 186 000 ₽', 'P85: 194 000 ₽']);
    expect(median('Middle')).toBe('180 000 ₽');
    await user.click(g.getByRole('button', { name: '5' }));
    expect(percs('Middle')).toEqual(['P10: 164 000 ₽', 'P30: 172 000 ₽', 'P50: 180 000 ₽', 'P70: 188 000 ₽', 'P90: 196 000 ₽']);
  });
});

describe('App — KPI', () => {
  it('KPI по точкам внутри [min первого, max последнего грейда)', async () => {
    await loadAll();
    expect(kpi('in-range')).toContain('6');
    expect(kpi('vacancies')).toContain('HH 3 · Getmatch 1');
    expect(kpi('resumes')).toContain('2');
    expect(kpi('top')).toContain('Junior'); // Junior и Middle по 2 — берётся первый
    expect(kpi('gap')).toContain('+92%'); // 250 000 / 130 000 − 1
    expect(norm(screen.getByTestId('median-vacancy').textContent)).toBe('250 000 ₽');
    expect(norm(screen.getByTestId('median-resume').textContent)).toBe('130 000 ₽');
  });
});

describe('App — границы грейдов на графике', () => {
  it('клавиатура: стрелки двигают границу на 5 000 ₽ и пересчитывают диапазоны и N', async () => {
    const user = await loadAll();
    expect(range('Junior')).toBe('80 т – 150 т · N 2');
    handle(2).focus();
    for (let i = 0; i < 4; i++) await user.keyboard('{ArrowRight}');
    expect(handle(2)).toHaveAttribute('aria-valuenow', '170000');
    expect(range('Junior')).toBe('80 т – 170 т · N 3');
    expect(range('Middle')).toBe('170 т – 250 т · N 1');
    expect(kpi('top')).toContain('Junior');
    expect(kpi('top')).toContain('3 точек');
    await user.keyboard('{ArrowLeft}');
    expect(handle(2)).toHaveAttribute('aria-valuenow', '165000');
  });

  it('перетаскивание мышью: Middle/Senior 250 → 300 → 305 тыс. пересчитывает лестницу и KPI', async () => {
    await loadAll();
    mockTrack();
    expect(range('Senior')).toBe('250 т – 400 т · N 1');
    drag(3, 300);
    expect(handle(3)).toHaveAttribute('aria-valuenow', '300000');
    // полуинтервал: 300 000 остаётся в Senior
    expect(range('Middle')).toBe('150 т – 300 т · N 2');
    expect(range('Senior')).toBe('300 т – 400 т · N 1');
    drag(3, 305);
    expect(range('Middle')).toBe('150 т – 305 т · N 3');
    expect(range('Senior')).toBe('305 т – 400 т · N 0');
    expect(percs('Middle')).toEqual(['P15: 172 000 ₽', 'P50: 200 000 ₽', 'P85: 270 000 ₽']);
    expect(median('Senior')).toBe('нет данных');
    expect(kpi('top')).toContain('Middle');
    expect(kpi('top')).toContain('3 точек');
  });

  it('привязка к 5 000 ₽ и запрет пересечения соседей (мин. ширина 10 000 ₽)', async () => {
    await loadAll();
    mockTrack();
    drag(3, 301.7); // 301 700 → 300 000
    expect(handle(3)).toHaveAttribute('aria-valuenow', '300000');
    drag(3, 50); // левее Middle.min — упирается в 150 000 + 10 000
    expect(handle(3)).toHaveAttribute('aria-valuenow', '160000');
    drag(0, 900); // нижняя граница Intern не заходит за 80 000 − 10 000
    expect(handle(0)).toHaveAttribute('aria-valuenow', '70000');
  });

  it('крайние границы меняют диапазон подсчёта KPI', async () => {
    await loadAll();
    mockTrack();
    drag(5, 450); // Lead max → 450 000, точка 500 000 выпадает
    expect(range('Lead')).toBe('400 т – 450 т · N 0');
    expect(median('Lead')).toBe('нет данных');
    expect(kpi('in-range')).toContain('5');
    expect(kpi('vacancies')).toContain('HH 3 · Getmatch 0');
    drag(0, 110); // Intern min → 70 000 (предел), точек < 70 000 нет
    expect(kpi('in-range')).toContain('5');
  });

  it('«Сбросить границы» возвращает значения по умолчанию', async () => {
    const user = await loadAll();
    mockTrack();
    drag(3, 300);
    drag(1, 50);
    await user.click(screen.getByRole('button', { name: 'Сбросить границы' }));
    expect(screen.getAllByRole('slider').map(s => s.getAttribute('aria-valuenow'))).toEqual(['0', '80000', '150000', '250000', '400000', '700000']);
    expect(range('Senior')).toBe('250 т – 400 т · N 1');
  });
});

describe('App — экспорт', () => {
  it('«Экспорт CSV» скачивает UTF-8 CSV с BOM, грейдами и точками', async () => {
    const user = await loadAll();
    let blob: Blob | null = null;
    const create = vi.fn((b: Blob) => { blob = b; return 'blob:x'; });
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await user.click(screen.getByRole('button', { name: 'Экспорт CSV' }));
    expect(click).toHaveBeenCalledOnce();
    expect(blob!.type).toBe('text/csv;charset=utf-8');
    const buf = new Uint8Array(await new Promise<ArrayBuffer>(res => {
      const r = new FileReader(); r.onload = () => res(r.result as ArrayBuffer); r.readAsArrayBuffer(blob!);
    }));
    expect([...buf.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const text = new TextDecoder().decode(buf.slice(3));
    expect(text).toContain('Грейд;От, ₽;До, ₽;N;Вакансий;Резюме;Медиана, ₽;P15, ₽;P50, ₽;P85, ₽');
    expect(text).toContain('Middle;150000;250000;2;1;1;180000;166000;180000;194000');
    expect(text).toContain('Getmatch;Вакансия;Python Lead;Ozon;Москва;500000;');
    expect(text.trim().split('\r\n')).toHaveLength(2 + 1 + 1 + 5 + 1 + 1 + 6);
  });
});

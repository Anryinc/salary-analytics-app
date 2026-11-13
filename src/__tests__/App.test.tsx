// Базовые (baseline) тесты UI до редизайна: фиксируют текущее поведение.
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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

async function loadAll() {
  const user = userEvent.setup();
  render(<App />);
  await user.upload(screen.getByLabelText(/Резюме HH/), file('hh_res.csv', RES));
  await screen.findByText(/Загружено точек: 2 /);
  await user.upload(screen.getByLabelText(/Вакансии HH/), file('hh_vac.csv', VAC));
  await screen.findByText(/Загружено точек: 5 /);
  await user.upload(screen.getByLabelText(/Вакансии Getmatch/), file('gm_vac.csv', GM));
  await screen.findByText(/Загружено точек: 6 \(после фильтров: 6\)/);
  return user;
}
const row = (name: string) => screen.getAllByRole('row').find(r => within(r).queryByText(name, { selector: 'td' }))!;
const cells = (name: string) => within(row(name)).getAllByRole('cell').map(c => c.textContent);

describe('App (baseline)', () => {
  it('показывает заголовок и бейдж версии', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Аналитика зарплат' })).toBeInTheDocument();
    expect(screen.getByText('v0.1.0')).toBeInTheDocument();
  });

  it('загрузка 3 CSV накапливает точки (вилка → 2 точки, дубль пропущен)', async () => {
    await loadAll();
    expect(screen.getByText('Загружено точек: 6 (после фильтров: 6)')).toBeInTheDocument();
  });

  it('фильтры город/компания/должность — регистронезависимо', async () => {
    const user = await loadAll();
    await user.type(screen.getByPlaceholderText('Город'), 'москва');
    expect(screen.getByText(/после фильтров: 4\)/)).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('Компания'), 'ЯНДЕКС');
    expect(screen.getByText(/после фильтров: 2\)/)).toBeInTheDocument();
    await user.clear(screen.getByPlaceholderText('Город'));
    await user.clear(screen.getByPlaceholderText('Компания'));
    await user.type(screen.getByPlaceholderText('Поиск по должности'), 'PYTHON');
    expect(screen.getByText(/после фильтров: 4\)/)).toBeInTheDocument();
  });

  it('шаг бина 10/20/50 тыс. переключается', async () => {
    const user = await loadAll();
    const sel = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
    for (const v of ['20000', '50000', '10000']) {
      await user.selectOptions(sel, v);
      expect(sel.value).toBe(v);
    }
  });

  it('уровни грейда 1/3/4/5 меняют колонки и перцентили', async () => {
    const user = await loadAll();
    const sel = screen.getAllByRole('combobox')[1];
    // Middle [150k,250k): 160000, 200000 → P15/P50/P85
    expect(cells('Middle')).toEqual(['Middle', '150,000', '250,000', '2', '166,000', '180,000', '194,000']);
    await user.selectOptions(sel, '1');
    expect(cells('Middle').slice(4)).toEqual(['180,000']);
    await user.selectOptions(sel, '4');
    expect(cells('Middle').slice(4)).toEqual(['166,000', '174,000', '186,000', '194,000']);
    await user.selectOptions(sel, '5');
    expect(cells('Middle').slice(4)).toEqual(['164,000', '172,000', '180,000', '188,000', '196,000']);
    expect(screen.getAllByRole('columnheader').map(h => h.textContent).slice(4)).toEqual(['Грейд 1', 'Грейд 2', 'Грейд 3', 'Грейд 4', 'Грейд 5']);
  });

  it('изменение границ грейда меняет диапазон и N', async () => {
    const user = await loadAll();
    expect(cells('Junior').slice(0, 4)).toEqual(['Junior', '80,000', '150,000', '2']);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs).toHaveLength(10);
    await user.clear(inputs[3]); // Junior max
    await user.type(inputs[3], '170000');
    expect(cells('Junior').slice(0, 4)).toEqual(['Junior', '80,000', '170,000', '3']);
  });
});

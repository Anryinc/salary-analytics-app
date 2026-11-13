import { describe, it, expect } from 'vitest';
import { normalizeRows } from '../normalizer';
import { RawRow } from '../types';

const DATE = '2026-11-13T20:00:00.000Z';
const one = (row: RawRow, type: 'vacancy' | 'resume' = 'vacancy', source: 'HH' | 'GM' = 'HH') =>
  normalizeRows([row], type, source, DATE);

describe('normalizeRows — источники и типы', () => {
  it('резюме HH', () => {
    const [p] = one({ индекс: 'r1', ЗП: '150 000 ₽ на руки', должность: 'QA', город: 'Казань' }, 'resume', 'HH');
    expect(p).toEqual({
      id: 'r1-0', source: 'HH', type: 'resume', position: 'QA', company: undefined, city: 'Казань',
      salaryNet: 150000, uploadDate: DATE, uniquenessIndex: 'r1',
    });
  });
  it('вакансии HH', () => {
    const [p] = one({ индекс: 'v1', ЗП: '200000', должность: 'Dev', Компания: 'Яндекс', город: 'Москва' }, 'vacancy', 'HH');
    expect(p).toMatchObject({ source: 'HH', type: 'vacancy', company: 'Яндекс', city: 'Москва', salaryNet: 200000 });
  });
  it('вакансии Getmatch', () => {
    const [p] = one({ индекс: 'g1', ЗП: '300000', должность: 'Lead', Компания: 'Ozon' }, 'vacancy', 'GM');
    expect(p).toMatchObject({ source: 'GM', type: 'vacancy', company: 'Ozon', city: undefined, salaryNet: 300000 });
  });
  it('сохраняет uploadDate', () => {
    expect(one({ индекс: 'a', ЗП: '1000' })[0].uploadDate).toBe(DATE);
  });
});

describe('normalizeRows — алиасы колонок', () => {
  it.each(['ЗП', 'зп', 'salary'])('зарплата: %s', (col) => {
    expect(one({ индекс: 'a', [col]: '123456' })[0].salaryNet).toBe(123456);
  });
  it.each(['должность', 'вакансия', 'position'])('должность: %s', (col) => {
    expect(one({ индекс: 'a', ЗП: '5000', [col]: 'Аналитик' })[0].position).toBe('Аналитик');
  });
  it.each(['Компания', 'компания', 'company'])('компания: %s', (col) => {
    expect(one({ индекс: 'a', ЗП: '5000', [col]: 'Сбер' })[0].company).toBe('Сбер');
  });
  it.each(['город', 'city'])('город: %s', (col) => {
    expect(one({ индекс: 'a', ЗП: '5000', [col]: 'Пермь' })[0].city).toBe('Пермь');
  });
  it('без должности — пустая строка, без компании/города — undefined', () => {
    const [p] = one({ индекс: 'a', ЗП: '5000' });
    expect(p.position).toBe('');
    expect(p.company).toBeUndefined();
    expect(p.city).toBeUndefined();
  });
  it.each(['индекс', 'index'])('индекс: %s', (col) => {
    const [p] = one({ [col]: 'ID7', ЗП: '5000' });
    expect(p.id).toBe('ID7-0');
    expect(p.uniquenessIndex).toBe('ID7');
  });
  it('при отсутствии индекса используется колонка уникальность', () => {
    const [p] = one({ уникальность: '1', ЗП: '5000' });
    expect(p.uniquenessIndex).toBe('1');
  });
  it('без индекса вообще — случайный уникальный индекс, строки не склеиваются', () => {
    const pts = normalizeRows([{ ЗП: '5000' }, { ЗП: '6000' }], 'vacancy', 'HH', DATE);
    expect(pts).toHaveLength(2);
    expect(pts[0].uniquenessIndex).not.toBe(pts[1].uniquenessIndex);
  });
});

describe('normalizeRows — валюты и налог', () => {
  it.each([
    ['1000 $', 90000],
    ['1000 €', 100000],
    ['100000 ₸', 20000],
    ['100000 ₽', 100000],
    ['100000', 100000],
  ])('%s → %i ₽', (zp, expected) => {
    expect(one({ индекс: 'a', ЗП: zp })[0].salaryNet).toBe(expected);
  });
  it.each(['до вычета налогов', 'gross', 'GROSS', 'до налогов'])('gross-маркер "%s" → −13%%', (m) => {
    expect(one({ индекс: 'a', ЗП: `100000 ₽ ${m}` })[0].salaryNet).toBe(87000);
  });
  it.each(['на руки', 'net'])('net-маркер "%s" — без вычета', (m) => {
    expect(one({ индекс: 'a', ЗП: `100000 ₽ ${m}` })[0].salaryNet).toBe(100000);
  });
  it('gross и net одновременно → считается net (isGross && !isNet)', () => {
    expect(one({ индекс: 'a', ЗП: '100000 gross / net' })[0].salaryNet).toBe(100000);
  });
  it('gross в валюте: сначала курс, потом налог, с округлением', () => {
    expect(one({ индекс: 'a', ЗП: '1001 $ gross' })[0].salaryNet).toBe(Math.round(1001 * 90 * 0.87));
  });
});

describe('normalizeRows — разбор чисел и вилок', () => {
  it('оба конца вилки — отдельные точки с id index-0 / index-1', () => {
    const pts = one({ индекс: 'f', ЗП: 'от 100 000 до 150 000 ₽ на руки' });
    expect(pts.map(p => [p.id, p.salaryNet])).toEqual([['f-0', 100000], ['f-1', 150000]]);
  });
  it('числа <= 100 игнорируются, 101 — учитывается', () => {
    expect(one({ индекс: 'a', ЗП: '100' })).toHaveLength(0);
    expect(one({ индекс: 'a', ЗП: '101' })[0].salaryNet).toBe(101);
    expect(one({ индекс: 'a', ЗП: 'опыт 3 года, 90000' }).map(p => p.salaryNet)).toEqual([90000]);
  });
  it('пробелы внутри чисел и десятичная запятая', () => {
    expect(one({ индекс: 'a', ЗП: '2 500,50 $' })[0].salaryNet).toBe(Math.round(2500.5 * 90));
  });
  it('пустая / нечисловая зарплата — строка пропускается', () => {
    expect(one({ индекс: 'a', ЗП: '' })).toHaveLength(0);
    expect(one({ индекс: 'a', ЗП: 'по договорённости' })).toHaveLength(0);
    expect(one({ индекс: 'a' })).toHaveLength(0);
  });
});

describe('normalizeRows — дедупликация', () => {
  it('уникальность > 1 — строка пропускается', () => {
    expect(one({ индекс: 'a', уникальность: '2', ЗП: '5000' })).toHaveLength(0);
    expect(one({ индекс: 'a', count: 3, ЗП: '5000' })).toHaveLength(0);
    expect(one({ индекс: 'a', уникальность: '1', ЗП: '5000' })).toHaveLength(1);
  });
  it('повтор индекса внутри файла — пропускается', () => {
    const pts = normalizeRows(
      [{ индекс: 'x', ЗП: '5000' }, { индекс: 'x', ЗП: '7000' }, { индекс: 'y', ЗП: '8000' }],
      'vacancy', 'HH', DATE,
    );
    expect(pts.map(p => p.salaryNet)).toEqual([5000, 8000]);
  });
});

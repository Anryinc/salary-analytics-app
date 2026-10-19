import { NormalizedPoint, RawRow, RecordType, Source } from './types';

const RATES: Record<string, number> = {
  '$': 90,
  '€': 100,
  '₸': 0.2,
  '₽': 1,
};

const TAX = 0.13;

function extractNumbersAndCurrency(text: string): { values: number[]; currency: string; isGross: boolean } {
  if (!text) return { values: [], currency: '₽', isGross: false };
  const lower = text.toLowerCase();
  const isGross = lower.includes('до вычета') || lower.includes('gross') || lower.includes('до налогов');
  const isNet = lower.includes('на руки') || lower.includes('net');

  let currency = '₽';
  if (text.includes('$')) currency = '$';
  else if (text.includes('€')) currency = '€';
  else if (text.includes('₸')) currency = '₸';

  const nums = (text.match(/\d[\d\s]*(?:,\d+)?/g) || [])
    .map(n => parseFloat(n.replace(/\s/g, '').replace(',', '.')))
    .filter(n => !isNaN(n) && n > 100);

  return { values: nums, currency, isGross: isGross && !isNet };
}

function toNetRub(value: number, currency: string, isGross: boolean): number {
  let rub = value * (RATES[currency] || 1);
  if (isGross) rub = rub * (1 - TAX);
  return Math.round(rub);
}

export function normalizeRows(
  rows: RawRow[],
  type: RecordType,
  source: Source,
  uploadDate: string
): NormalizedPoint[] {
  const points: NormalizedPoint[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const index = String(row['индекс'] || row['index'] || row['уникальность'] || Math.random());
    const uniqueness = Number(row['уникальность'] || row['count'] || 1);
    if (uniqueness > 1 || seen.has(index)) continue;
    seen.add(index);

    const salaryText = String(row['ЗП'] || row['зп'] || row['salary'] || '');
    const { values, currency, isGross } = extractNumbersAndCurrency(salaryText);
    if (values.length === 0) continue;

    const position = String(row['должность'] || row['вакансия'] || row['position'] || '');
    const company = String(row['Компания'] || row['компания'] || row['company'] || '');
    const city = String(row['город'] || row['city'] || '');

    values.forEach((v, i) => {
      points.push({
        id: `${index}-${i}`,
        source,
        type,
        position,
        company: company || undefined,
        city: city || undefined,
        salaryNet: toNetRub(v, currency, isGross),
        uploadDate,
        uniquenessIndex: index,
      });
    });
  }

  return points;
}

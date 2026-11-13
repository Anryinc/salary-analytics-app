/** 180000 → "180 000" (неразрывные пробелы, ru-RU) */
export const fmtNum = (n: number) => Math.round(n).toLocaleString('ru-RU');
/** 180000 → "180 000 ₽" */
export const fmtRub = (n: number) => `${fmtNum(n)}\u00a0₽`;
/** 180000 → "180 т" */
export const fmtK = (n: number) => `${Math.round(n / 1000)}\u00a0т`;
export const pLabel = (p: number) => `P${Math.round(p * 100)}`;

export function fmtUploadDate(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

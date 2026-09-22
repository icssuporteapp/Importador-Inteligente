import { ParsedCell } from '../models';

export function parseNumber(value: unknown, culture: 'pt-BR' | 'en-US'): number {
  if (typeof value === 'number') { if (!Number.isFinite(value)) throw new Error('Número inválido.'); return value; }
  const text = String(value).trim();
  const pattern = culture === 'pt-BR' ? /^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/ : /^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/;
  if (!pattern.test(text)) throw new Error(`Número inválido para ${culture === 'pt-BR' ? 'o formato brasileiro' : 'o formato internacional'}.`);
  const number = Number(culture === 'pt-BR' ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, ''));
  if (!Number.isFinite(number)) throw new Error('Número inválido.');
  return number;
}
export function parseBoolean(value: unknown): boolean {
  const text = String(value).trim().toLowerCase();
  if (['sim', 'yes', 'true', '1'].indexOf(text) >= 0) return true;
  if (['não', 'nao', 'no', 'false', '0'].indexOf(text) >= 0) return false;
  throw new Error('Use Sim ou Não, Yes ou No, True ou False, 1 ou 0.');
}
export interface DateValue { iso: string; needsZone: boolean }
export function parseDate(cell: ParsedCell, culture: 'pt-BR' | 'en-US', date1904: boolean, dateOnly: boolean): DateValue {
  let year: number, month: number, day: number, hour = 0, minute = 0, second = 0;
  if (typeof cell.value === 'number') {
    const serial = cell.value;
    if (!Number.isFinite(serial) || serial < 0 || (!date1904 && Math.floor(serial) === 60)) throw new Error('Data serial do Excel inválida.');
    const base = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 31);
    const date = new Date(base + Math.round((serial - (!date1904 && serial >= 60 ? 1 : 0)) * 86400000));
    year = date.getUTCFullYear(); month = date.getUTCMonth() + 1; day = date.getUTCDate(); hour = date.getUTCHours(); minute = date.getUTCMinutes(); second = date.getUTCSeconds();
    // SharePoint exports date-only fields as Excel serials that may contain a timezone-generated
    // fraction (for example 21:00), while the cell format and displayed value contain only a date.
    if (dateOnly && cell.text && !/\d{1,2}:\d{2}/.test(cell.text)) hour = minute = second = 0;
  } else {
    const text = String(cell.value).trim();
    const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:\d{2})?)?$/.exec(text);
    const regional = /^(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(text);
    if (!iso && !regional) throw new Error('Data inválida. Use o formato selecionado ou ISO.');
    const match = (iso || regional)!;
    year = Number(iso ? match[1] : match[3]); month = Number(iso ? match[2] : culture === 'pt-BR' ? match[2] : match[1]); day = Number(iso ? match[3] : culture === 'pt-BR' ? match[1] : match[2]);
    hour = Number(match[4] || 0); minute = Number(match[5] || 0); second = Number(match[6] || 0);
    const check = new Date(Date.UTC(year, month - 1, day));
    if (check.getUTCFullYear() !== year || check.getUTCMonth() + 1 !== month || check.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59) throw new Error('Data ou horário inexistente.');
    if (iso?.[7]) {
      if (dateOnly) throw new Error('Campo sem horário: informe apenas a data, sem fuso.');
      const instant = new Date(text.replace(' ', 'T'));
      if (!Number.isFinite(instant.getTime())) throw new Error('Fuso ou data inválida.');
      return { iso: instant.toISOString(), needsZone: false };
    }
  }
  if (year < 1900 || year > 8900) throw new Error('Data fora do intervalo suportado pelo SharePoint.');
  if (dateOnly && (hour || minute || second)) throw new Error('Campo sem horário: remova a hora da célula.');
  const pad = (value: number): string => value < 10 ? `0${value}` : String(value);
  return { iso: `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}`, needsZone: true };
}

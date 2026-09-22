import { AppConfiguration, ColumnDefinition, ListDefinition, ParsedCell, ParsedSheet, Payload, ReferenceCache, ValidationError, ValidationOptions, ValidationResult } from '../models';
import { Gateway } from './contracts';
import { parseBoolean, parseDate, parseNumber } from './conversions';
import { mapLimit, message, pause, referenceKey, splitValues } from './utils';

export interface ColumnAssignment { field: ColumnDefinition; sourceIndex: number }

export function mapColumns(sheet: ParsedSheet, list: ListDefinition, options: ValidationOptions): (ColumnDefinition | undefined)[] {
  const writable = list.columns.filter(c => !c.hidden && !c.readOnly);
  if (options.targetMapping) {
    const columns: (ColumnDefinition | undefined)[] = sheet.headers.map(() => undefined);
    for (const assignment of mapTargets(sheet, list, options)) if (!columns[assignment.sourceIndex]) columns[assignment.sourceIndex] = assignment.field;
    return columns;
  }
  return sheet.headers.map((header, index) => {
    const explicit = options.mapping[index];
    if (Object.prototype.hasOwnProperty.call(options.mapping, index)) return explicit ? writable.find(c => c.internalName === explicit) : undefined;
    const candidates = writable.filter(c => c.header.toLocaleLowerCase() === header.trim().toLocaleLowerCase());
    return candidates.length === 1 ? candidates[0] : undefined;
  });
}
export function mapTargets(sheet: ParsedSheet, list: ListDefinition, options: ValidationOptions): ColumnAssignment[] {
  if (!options.targetMapping) {
    const assignments: ColumnAssignment[] = [];
    mapColumns(sheet, list, options).forEach((field, sourceIndex) => { if (field) assignments.push({ field, sourceIndex }); });
    return assignments;
  }
  const writable = list.columns.filter(c => !c.hidden && !c.readOnly);
  const assignments: ColumnAssignment[] = [];
  for (const field of writable) {
    if (Object.prototype.hasOwnProperty.call(options.targetMapping, field.internalName)) {
      const sourceIndex = options.targetMapping![field.internalName];
      if (sourceIndex >= 0 && sourceIndex < sheet.headers.length) assignments.push({ field, sourceIndex });
      continue;
    }
    const candidates = sheet.headers.map((header, sourceIndex) => ({ header, sourceIndex })).filter(item => item.header.trim().toLocaleLowerCase() === field.header.toLocaleLowerCase());
    if (candidates.length === 1) assignments.push({ field, sourceIndex: candidates[0].sourceIndex });
  }
  return assignments;
}
const blank = (cell: ParsedCell): boolean => cell.value === null || String(cell.value).trim() === '';
const isReference = (field: ColumnDefinition): boolean => ['Lookup', 'LookupMulti', 'User', 'UserMulti'].indexOf(field.kind) >= 0;
const isMulti = (field: ColumnDefinition): boolean => ['LookupMulti', 'UserMulti', 'MultiChoice'].indexOf(field.kind) >= 0;
const hasDefault = (field: ColumnDefinition): boolean => field.defaultValue !== undefined && field.defaultValue !== '' && !field.defaultValue.startsWith('=');

export class ValidationService {
  public constructor(private gateway: Gateway, private config: AppConfiguration) {}
  public async validate(sheet: ParsedSheet, list: ListDefinition, options: ValidationOptions, progress?: (percent: number) => void): Promise<ValidationResult> {
    const errors: ValidationError[] = []; const rows = []; const assignments = mapTargets(sheet, list, options);
    const add = (line: number, column: string, value: string, text: string, severity: 'error' | 'warning' = 'error'): void => { errors.push({ line, column, value, message: text, severity }); };
    const seenHeaders = new Set<string>(); const mapped = new Set<string>(); const assignedSources = new Set(assignments.map(item => item.sourceIndex));
    for (const index of Array.from(assignedSources)) {
      const header = sheet.headers[index]; const normalized = header.toLocaleLowerCase();
      if (!header) add(0, `Coluna ${index + 1}`, '', 'Cabeçalho vazio.');
      if (seenHeaders.has(normalized)) add(0, header, '', 'Cabeçalho duplicado.'); seenHeaders.add(normalized);
    }
    for (const assignment of assignments) {
      if (mapped.has(assignment.field.internalName)) add(0, assignment.field.header, '', 'Duas colunas estão mapeadas para o mesmo campo.');
      mapped.add(assignment.field.internalName);
    }
    const knownListHeaders = new Set(list.columns.map(field => field.header.trim().toLocaleLowerCase()));
    const ignored = sheet.headers.map((header, index) => ({ header: header || `Coluna ${index + 1}`, index }))
      .filter(item => !assignedSources.has(item.index) && !knownListHeaders.has(item.header.trim().toLocaleLowerCase()));
    if (ignored.length === 1) add(0, ignored[0].header, '', 'Coluna do Excel não mapeada; será ignorada.', 'warning');
    if (ignored.length > 1) add(0, 'Colunas ignoradas', '', `${ignored.length} colunas do Excel não mapeadas serão ignoradas: ${ignored.slice(0, 12).map(item => item.header).join('; ')}${ignored.length > 12 ? '; ...' : ''}.`, 'warning');
    for (const field of list.columns.filter(c => c.required && !c.readOnly && !c.hidden)) {
      if (!mapped.has(field.internalName) && !hasDefault(field)) add(0, field.header, '', `Coluna obrigatória "${field.header}" não encontrada ou sem padrão aplicável.`);
    }
    for (const field of list.columns.filter(c => c.kind === 'Unsupported' && !c.readOnly && !c.hidden)) add(0, field.header, '', `Suporte parcial: ${field.nativeType}. Campos não suportados preenchidos serão bloqueados.`, 'warning');
    if (!list.canAdd) add(0, '', '', 'Você não tem permissão para adicionar itens à lista.');
    if (errors.some(e => e.line === 0 && e.severity === 'error')) return this.result(sheet, list, errors, []);

    const references: ReferenceCache = new Map(); const dates = new Map<string, { value?: string; error?: string }>();
    const referenceWork = new Map<string, { field: ColumnDefinition; value: string }>();
    // Resolve distinct references and dates first. The row validation pass never performs REST calls.
    for (const row of sheet.rows) {
      for (const assignment of assignments) {
        const field = assignment.field; const cell = row.cells[assignment.sourceIndex]; if (blank(cell) || cell.formula || cell.error) continue;
        if (isReference(field)) {
          try { for (const value of isMulti(field) ? splitValues(String(cell.value)) : [String(cell.value).trim()]) referenceWork.set(referenceKey(field.internalName, value), { field, value }); } catch { /* Row pass emits the precise error. */ }
        }
        if (field.kind === 'DateTime') {
          try { const date = parseDate(cell, options.culture, sheet.date1904, !!field.dateOnly); if (date.needsZone) dates.set(date.iso, {}); } catch { /* Row pass emits the precise error. */ }
        }
      }
      if (row.line % 250 === 0) await pause(0);
    }
    let completed = 0; const workCount = referenceWork.size + dates.size;
    await mapLimit(Array.from(referenceWork.entries()), this.config.concurrency, async ([key, item]) => {
      try { references.set(key, await this.gateway.resolve(list, item.field, item.value)); } catch (error) { references.set(key, { error: message(error) }); }
      progress?.(Math.round(++completed / Math.max(1, workCount) * 40));
    });
    await mapLimit(Array.from(dates.keys()), this.config.concurrency, async local => {
      try { dates.set(local, { value: await this.gateway.localToUtc(list, local) }); } catch (error) { dates.set(local, { error: message(error) }); }
      progress?.(Math.round(++completed / Math.max(1, workCount) * 40));
    });
    const uniqueValues = new Map<string, Map<string, number>>();
    for (let rowIndex = 0; rowIndex < sheet.rows.length; rowIndex++) {
      const row = sheet.rows[rowIndex]; const payload: Payload = {}; const startErrors = errors.length;
      if (list.contentTypeId) payload.ContentTypeId = list.contentTypeId;
      for (const assignment of assignments) {
        const field = assignment.field; const cell = row.cells[assignment.sourceIndex];
        try {
          if (cell.formula) throw new Error('Fórmula não permitida. Cole o resultado como valor antes de validar.');
          if (cell.error) throw new Error('A célula contém um erro do Excel.');
          if (blank(cell)) {
            if (field.required && !hasDefault(field)) throw new Error('Campo obrigatório na configuração atual da lista.');
            if (hasDefault(field)) continue;
            if (field.kind !== 'Unsupported') payload[isReference(field) ? `${field.internalName}Id` : field.internalName] = isMulti(field) ? { results: [] } : null;
            continue;
          }
          const value = this.convert(field, cell, sheet, options, references, dates);
          if (field.unique) {
            const seen = uniqueValues.get(field.internalName) || new Map<string, number>();
            const key = JSON.stringify(value).toLocaleLowerCase();
            if (seen.has(key)) throw new Error(`Valor duplicado no arquivo; primeira ocorrência na linha ${seen.get(key)}.`);
            seen.set(key, row.line); uniqueValues.set(field.internalName, seen);
          }
          payload[isReference(field) ? `${field.internalName}Id` : field.internalName] = value;
        } catch (error) { add(row.line, field.header, cell.text, message(error)); }
      }
      if (errors.length === startErrors) rows.push({ line: row.line, payload });
      if (rowIndex % 100 === 0) { progress?.(40 + Math.round((rowIndex + 1) / sheet.rows.length * 60)); await pause(0); }
    }
    progress?.(100); return this.result(sheet, list, errors, rows);
  }
  private convert(field: ColumnDefinition, cell: ParsedCell, sheet: ParsedSheet, options: ValidationOptions, references: ReferenceCache, dates: Map<string, { value?: string; error?: string }>): unknown {
    const text = String(cell.value).trim();
    switch (field.kind) {
      case 'Text': case 'Note': {
        const value = typeof cell.value === 'string' ? cell.value : cell.text;
        if (field.maxLength && value.length > field.maxLength) throw new Error(`Limite de ${field.maxLength} caracteres excedido.`);
        return value;
      }
      case 'Number': case 'Currency': {
        const value = parseNumber(cell.value, options.culture);
        if (field.min !== undefined && value < field.min) throw new Error(`Valor mínimo: ${field.min}.`);
        if (field.max !== undefined && value > field.max) throw new Error(`Valor máximo: ${field.max}.`);
        if (field.decimals !== undefined && field.decimals >= 0 && field.decimals < 15 && Math.abs(value - Number(value.toFixed(field.decimals))) > 1e-9) throw new Error(`Use até ${field.decimals} casas decimais.`);
        return value;
      }
      case 'Boolean': return parseBoolean(cell.value);
      case 'DateTime': {
        const date = parseDate(cell, options.culture, sheet.date1904, !!field.dateOnly);
        if (!date.needsZone) return date.iso;
        const converted = dates.get(date.iso); if (!converted?.value) throw new Error(converted?.error || 'Não foi possível converter o fuso do site.');
        return converted.value;
      }
      case 'Choice': case 'MultiChoice': {
        const values = field.kind === 'MultiChoice' ? splitValues(text) : [text];
        for (const value of values) if (!field.fillInChoice && (field.choices || []).indexOf(value) < 0) throw new Error(`Valor "${value}" não permitido. Valores: ${(field.choices || []).join('; ')}.`);
        return field.kind === 'MultiChoice' ? { results: Array.from(new Set(values)) } : values[0];
      }
      case 'Lookup': case 'LookupMulti': case 'User': case 'UserMulti': {
        const values = isMulti(field) ? splitValues(text) : [text];
        const ids = values.map(value => { const item = references.get(referenceKey(field.internalName, value)); if (!item?.id) throw new Error(item?.error || 'Referência não encontrada.'); return item.id; });
        return isMulti(field) ? { results: Array.from(new Set(ids)) } : ids[0];
      }
      default: throw new Error(`Tipo ${field.nativeType} ainda não suportado. Não é possível importar este valor.`);
    }
  }
  private result(sheet: ParsedSheet, list: ListDefinition, errors: ValidationError[], rows: ValidationResult['rows']): ValidationResult {
    const structural = errors.some(e => !e.line && e.severity === 'error');
    const invalid = structural ? sheet.rows.length : new Set(errors.filter(e => e.line && e.severity === 'error').map(e => e.line)).size;
    return { total: sheet.rows.length, valid: sheet.rows.length - invalid, invalid, errors, rows, schemaVersion: list.schemaVersion, fingerprint: sheet.fingerprint, validatedAt: new Date().toISOString() };
  }
}

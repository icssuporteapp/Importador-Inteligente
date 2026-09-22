import * as XLSX from 'xlsx';
import { AppConfiguration, ParsedCell, ParsedSheet, ValidationError, ImportResult, ListDefinition } from '../models';
import { newId } from './utils';
import { validationErrorRows } from './validationPresentation';

/** Preserve raw coordinates and formulas before object conversion; SheetJS otherwise renames duplicate headers. */
export class ExcelParserService {
  public read(data: ArrayBuffer, fileName: string, config: AppConfiguration): XLSX.WorkBook {
    if (!/\.(xlsx|xls)$/i.test(fileName)) throw new Error('Selecione um arquivo XLSX ou XLS.');
    if (data.byteLength > config.maxFileMb * 1024 * 1024) throw new Error(`O arquivo excede ${config.maxFileMb} MB.`);
    try { return XLSX.read(data, { type: 'array', cellFormula: true, cellNF: true, cellText: true, cellDates: false, sheetRows: config.maxRows + 2 }); }
    catch { throw new Error('Não foi possível ler o Excel. Verifique se não está protegido ou corrompido.'); }
  }
  public parse(book: XLSX.WorkBook, name: string, config: AppConfiguration): ParsedSheet {
    const sheet = book.Sheets[name]; if (!sheet) throw new Error('Aba não encontrada.');
    const declared = sheet['!fullref'] || sheet['!ref']; if (!declared) throw new Error('A aba está vazia.');
    const range = XLSX.utils.decode_range(declared);
    if (range.e.r > config.maxRows) throw new Error(`A aba excede ${config.maxRows} linhas após o cabeçalho. Remova linhas formatadas além dos dados.`);
    if (range.e.c >= config.maxColumns) throw new Error(`A aba excede ${config.maxColumns} colunas.`);
    const getCell = (r: number, c: number): ParsedCell => {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined;
      return { value: cell?.v === undefined ? null : cell.v as string | number | boolean, text: cell ? XLSX.utils.format_cell(cell) : '', formula: cell?.f, error: cell?.t === 'e' };
    };
    const headers: string[] = [];
    for (let c = 0; c <= range.e.c; c++) {
      const cell = getCell(0, c);
      if (cell.formula || cell.error) throw new Error(`Cabeçalho inválido na coluna ${c + 1}. Use texto simples.`);
      headers.push(cell.text.trim());
    }
    const rows = [];
    for (let r = 1; r <= range.e.r; r++) {
      const cells = headers.map((_, c) => getCell(r, c));
      if (cells.some(cell => cell.formula || cell.error || (cell.value !== null && String(cell.value).trim() !== ''))) rows.push({ line: r + 1, cells });
    }
    if (!rows.length) throw new Error('A aba não contém registros para importar.');
    return { name, headers, rows, date1904: !!book.Workbook?.WBProps?.date1904, fingerprint: newId() };
  }
  public exportErrors(errors: ValidationError[]): void {
    this.download('Erros de validação.xlsx', validationErrorRows(errors), 'Erros');
  }
  public exportImport(result: ImportResult): void {
    this.download('Resultado da importação.xlsx', [['Execução', 'Linha', 'Status', 'HTTP', 'ID criado', 'Mensagem'], ...result.rows.map(r => [result.executionId, r.line, { imported: 'Importado', failed: 'Falhou', unknown: 'Resultado desconhecido', pending: 'Não enviado' }[r.status], r.httpStatus || '', r.id || '', r.message || ''])], 'Resultado');
  }
  public template(list: ListDefinition, lookup: Record<string, { values: string[]; truncated: boolean }>): void {
    const book = XLSX.utils.book_new();
    const fields = list.columns.filter(c => !c.readOnly && !c.hidden && c.kind !== 'Unsupported');
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([fields.map(c => c.header)]), 'Dados');
    const instructions: (string | number)[][] = [['Coluna', 'Tipo', 'Obrigatório', 'Valores e formato', 'Valor padrão', 'Observação']];
    for (const field of list.columns.filter(c => !c.readOnly && !c.hidden)) {
      const options = lookup[field.internalName];
      const format = field.kind.startsWith('User') ? 'E-mail ou UPN; grupos: GRUPO:Nome (quando permitido)' : field.kind.startsWith('Lookup') ? 'ID:123 ou descrição única' : field.kind === 'DateTime' ? (field.dateOnly ? 'dd/MM/yyyy ou yyyy-MM-dd' : 'dd/MM/yyyy HH:mm:ss ou ISO com fuso explícito') : field.kind === 'Boolean' ? 'Sim; Não; Yes; No; True; False; 1; 0' : field.kind === 'Number' || field.kind === 'Currency' ? 'Número Excel ou texto no formato brasileiro, por exemplo 1.234,56' : '';
      instructions.push([field.header, field.nativeType, field.required ? 'Sim' : 'Não', (field.choices || []).join('; ') || format, field.defaultValue || '', field.kind === 'Unsupported' ? 'Tipo ainda não suportado. Não preencher; obrigatório sem padrão impede importar.' : options?.truncated ? 'Catálogo parcial; use ID para valores não exibidos.' : 'Múltiplos: separar por ;. Para ; literal usar \\;. Para barra literal usar \\\\.']);
      // One option per row avoids Excel's 32,767-character cell limit on large lookup catalogs.
      for (const value of options?.values || []) instructions.push([field.header, 'Opção de lookup', '', value, '', '']);
    }
    const sheet = XLSX.utils.aoa_to_sheet(instructions); sheet['!cols'] = [28, 20, 14, 65, 22, 65].map(wch => ({ wch }));
    XLSX.utils.book_append_sheet(book, sheet, 'Instruções');
    XLSX.writeFile(book, `Template ${list.title.replace(/[\\/:*?"<>|]/g, '-')}.xlsx`);
  }
  private download(name: string, rows: (string | number)[][], sheetName: string): void {
    const book = XLSX.utils.book_new(); const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet['!cols'] = rows[0].map(() => ({ wch: 30 }));
    // aoa_to_sheet stores strings as strings, including strings starting with =,+,-,@.
    XLSX.utils.book_append_sheet(book, sheet, sheetName); XLSX.writeFile(book, name);
  }
}

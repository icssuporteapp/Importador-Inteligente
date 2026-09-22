import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { DEFAULT_CONFIG } from '../src/models';
import { ExcelParserService } from '../src/services/ExcelParserService';
test('preserva cabeçalhos duplicados, linha física e fórmula', () => {
  const workbook = XLSX.utils.book_new(); const worksheet = XLSX.utils.aoa_to_sheet([['Projeto', 'Projeto'], ['A', 'B'], [], ['C', { f: '1+1', v: 2 }]]);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');
  const parsed = new ExcelParserService().parse(workbook, 'Dados', DEFAULT_CONFIG);
  assert.deepEqual(parsed.headers, ['Projeto', 'Projeto']); assert.deepEqual(parsed.rows.map(r => r.line), [2, 4]); assert.equal(parsed.rows[1].cells[1].formula, '1+1');
});

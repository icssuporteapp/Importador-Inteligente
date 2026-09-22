import test from 'node:test';
import assert from 'node:assert/strict';
import { validationErrorRows } from '../src/services/validationPresentation';

test('relatório diferencia erro de linha e problema estrutural e informa a correção', () => {
  const rows = validationErrorRows([
    { line: 0, column: 'ID', value: '', message: 'Coluna do Excel não mapeada; será ignorada.', severity: 'warning' },
    { line: 17, column: 'Status', value: 'X', message: 'Valor não permitido.', severity: 'error' }
  ]);
  assert.deepEqual(rows[0], ['Local', 'Linha do Excel', 'Coluna / cabeçalho', 'Valor', 'Problema', 'Como corrigir', 'Severidade']);
  assert.equal(rows[1][0], 'Cabeçalho / mapeamento'); assert.equal(rows[1][1], '');
  assert.equal(rows[2][0], 'Linha 17'); assert.equal(rows[2][1], 17);
  assert.match(String(rows[2][5]), /linha indicada/i);
});

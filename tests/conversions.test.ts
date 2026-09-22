import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBoolean, parseDate, parseNumber } from '../src/services/conversions';

test('converte números conforme a cultura sem adivinhar formato ambíguo', () => {
  assert.equal(parseNumber('1.234,56', 'pt-BR'), 1234.56);
  assert.equal(parseNumber('1,234.56', 'en-US'), 1234.56);
  assert.throws(() => parseNumber('1,234.56', 'pt-BR'));
  assert.throws(() => parseNumber('1.234,56', 'en-US'));
});
test('converte todos os booleanos documentados e não confunde zero com vazio', () => {
  for (const value of ['Sim', 'Yes', 'TRUE', 1]) assert.equal(parseBoolean(value), true);
  for (const value of ['Não', 'nao', 'No', 'false', 0]) assert.equal(parseBoolean(value), false);
  assert.throws(() => parseBoolean('talvez'));
});
test('interpreta a mesma data segundo a cultura escolhida', () => {
  const cell = { value: '03/04/2026', text: '03/04/2026' };
  assert.equal(parseDate(cell, 'pt-BR', false, true).iso, '2026-04-03T00:00:00');
  assert.equal(parseDate(cell, 'en-US', false, true).iso, '2026-03-04T00:00:00');
  assert.throws(() => parseDate({ value: '31/02/2026', text: '' }, 'pt-BR', false, true));
});
test('trata o salto fictício de 1900 e datas seriais', () => {
  assert.throws(() => parseDate({ value: 60, text: '29/02/1900' }, 'pt-BR', false, true));
  assert.equal(parseDate({ value: 61, text: '01/03/1900' }, 'pt-BR', false, true).iso, '1900-03-01T00:00:00');
});
test('normaliza a hora técnica de uma data sem horário exportada pelo SharePoint', () => {
  const serialWithTime = 46097.875;
  assert.equal(parseDate({ value: serialWithTime, text: '3/16/26' }, 'pt-BR', false, true).iso, '2026-03-16T00:00:00');
  assert.throws(() => parseDate({ value: serialWithTime, text: '16/03/2026 21:00' }, 'pt-BR', false, true));
});

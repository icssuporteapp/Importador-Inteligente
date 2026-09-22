import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, Gateway, ListDefinition, ParsedSheet, SearchResult } from '../src/models';
import { mapColumns, ValidationService } from '../src/services/ValidationService';

const list: ListDefinition = { id: 'a', title: 'Projetos', siteUrl: 'https://tenant.sharepoint.com/sites/teste', canAdd: true, contentTypes: [], schemaVersion: 'v1', timeZoneId: 0, timeZoneDescription: 'UTC', columns: [
  { id: '1', internalName: 'Title', title: 'Projeto', header: 'Projeto', kind: 'Text', nativeType: 'Text', required: true, readOnly: false, hidden: false, maxLength: 20 },
  { id: '2', internalName: 'Status', title: 'Status', header: 'Status', kind: 'Choice', nativeType: 'Choice', required: true, readOnly: false, hidden: false, choices: ['Em andamento', 'Concluído'] },
  { id: '3', internalName: 'Ativo', title: 'Ativo', header: 'Ativo', kind: 'Boolean', nativeType: 'Boolean', required: false, readOnly: false, hidden: false },
  { id: '4', internalName: 'Responsavel', title: 'Responsável', header: 'Responsável', kind: 'User', nativeType: 'User', required: false, readOnly: false, hidden: false }
] };
const gateway: Gateway = {
  search: async (): Promise<SearchResult> => ({ lists: [], warnings: [] }), schema: async () => list,
  resolve: async (_list, _field, value) => value === 'ana@ics.org.br' ? { id: 7 } : { error: 'Usuário não encontrado.' },
  lookupOptions: async () => ({ values: [], truncated: false }), localToUtc: async (_list, value) => `${value}Z`, checkAudit: async () => undefined, audit: async () => undefined, batch: async () => []
};
const sheet = (headers: string[], rows: unknown[][]): ParsedSheet => ({ name: 'Dados', headers, date1904: false, fingerprint: 'f1', rows: rows.map((values, index) => ({ line: index + 2, cells: values.map(value => ({ value: value as any, text: String(value ?? '') })) })) });

test('valida linha e cria payload SharePoint sem consultas por registro', async () => {
  const service = new ValidationService(gateway, DEFAULT_CONFIG);
  const result = await service.validate(sheet(['Projeto', 'Status', 'Ativo', 'Responsável'], [['Alfa', 'Concluído', 'Não', 'ana@ics.org.br']]), list, { culture: 'pt-BR', mapping: {} });
  assert.equal(result.invalid, 0); assert.equal(result.valid, 1);
  assert.deepEqual(result.rows[0].payload, { Title: 'Alfa', Status: 'Concluído', Ativo: false, ResponsavelId: 7 });
});
test('detecta cabeçalho duplicado como erro estrutural', async () => {
  const result = await new ValidationService(gateway, DEFAULT_CONFIG).validate(sheet(['Projeto', 'Projeto'], [['A', 'B']]), list, { culture: 'pt-BR', mapping: { 1: 'Status' } });
  assert.equal(result.invalid, 1); assert.ok(result.errors.some(e => e.message.includes('duplicado')));
});
test('rejeita opção e usuário inexistente na mesma linha', async () => {
  const result = await new ValidationService(gateway, DEFAULT_CONFIG).validate(sheet(['Projeto', 'Status', 'Responsável'], [['A', 'Finalizado', 'x@ics.org.br']]), list, { culture: 'pt-BR', mapping: {} });
  assert.equal(result.invalid, 1); assert.equal(result.errors.filter(e => e.line === 2 && e.severity === 'error').length, 2);
});
test('permite remover explicitamente um mapeamento automático', () => {
  const parsed = sheet(['Projeto'], [['Alfa']]);
  assert.equal(mapColumns(parsed, list, { culture: 'pt-BR', mapping: {} })[0]?.internalName, 'Title');
  assert.equal(mapColumns(parsed, list, { culture: 'pt-BR', mapping: { 0: '' } })[0], undefined);
});
test('ignora coluna extra do Excel com aviso sem invalidar o registro', async () => {
  const result = await new ValidationService(gateway, DEFAULT_CONFIG).validate(sheet(['Projeto', 'Status', 'ID'], [['Alfa', 'Concluído', 25]]), list, { culture: 'pt-BR', mapping: {} });
  assert.equal(result.invalid, 0); assert.equal(result.valid, 1);
  assert.ok(result.errors.some(e => e.column === 'ID' && e.severity === 'warning' && e.message.includes('ignorada')));
  assert.deepEqual(result.rows[0].payload, { Title: 'Alfa', Status: 'Concluído' });
});
test('ignora silenciosamente colunas somente leitura exportadas pela própria lista', async () => {
  const exported: ListDefinition = { ...list, columns: [...list.columns,
    { id: 'system-id', internalName: 'ID', title: 'ID', header: 'ID', kind: 'Number', nativeType: 'Counter', required: false, readOnly: true, hidden: false }
  ] };
  const result = await new ValidationService(gateway, DEFAULT_CONFIG).validate(sheet(['Projeto', 'Status', 'ID'], [['Alfa', 'Concluído', 25]]), exported, { culture: 'pt-BR', mapping: {} });
  assert.equal(result.invalid, 0); assert.equal(result.valid, 1); assert.equal(result.errors.length, 0);
});
test('mapeamento automático considera somente o campo editável quando há título repetido', () => {
  const repeated: ListDefinition = { ...list, columns: [
    { id: 'system', internalName: 'LinkTitle', title: 'Projeto', header: 'Projeto', kind: 'Unsupported', nativeType: 'Computed', required: false, readOnly: true, hidden: false },
    ...list.columns
  ] };
  assert.equal(mapColumns(sheet(['Projeto'], [['Alfa']]), repeated, { culture: 'pt-BR', mapping: {} })[0]?.internalName, 'Title');
});
test('permite usar a mesma coluna do Excel em mais de um campo de destino', async () => {
  const repeatedSource: ListDefinition = { ...list, columns: [...list.columns,
    { id: '5', internalName: 'ProjetoCopia', title: 'Projeto cópia', header: 'Projeto cópia', kind: 'Text', nativeType: 'Text', required: false, readOnly: false, hidden: false }
  ] };
  const result = await new ValidationService(gateway, DEFAULT_CONFIG).validate(sheet(['Projeto', 'Status'], [['Alfa', 'Concluído']]), repeatedSource, {
    culture: 'pt-BR', mapping: {}, targetMapping: { Title: 0, ProjetoCopia: 0, Status: 1, Ativo: -1, Responsavel: -1 }
  });
  assert.equal(result.invalid, 0);
  assert.deepEqual(result.rows[0].payload, { Title: 'Alfa', ProjetoCopia: 'Alfa', Status: 'Concluído' });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { AuditEvent, DEFAULT_CONFIG, ImportRowResult, ListDefinition, SearchResult, ValidatedRow, ValidationResult } from '../src/models';
import { Gateway } from '../src/services/contracts';
import { ImportService } from '../src/services/ImportService';

const list: ListDefinition = { id: '1', title: 'Teste', siteUrl: 'https://tenant.sharepoint.com/sites/teste', columns: [], canAdd: true, contentTypes: [], schemaVersion: 'v1', timeZoneId: 0, timeZoneDescription: 'UTC' };
const validation: ValidationResult = { total: 2, valid: 2, invalid: 0, errors: [], rows: [{ line: 2, payload: { Title: 'A' } }, { line: 3, payload: { Title: 'B' } }], schemaVersion: 'v1', fingerprint: 'f', validatedAt: new Date().toISOString() };
function gateway(overrides: Partial<Gateway> = {}): Gateway {
  return { search: async (): Promise<SearchResult> => ({ lists: [], warnings: [] }), schema: async () => list, resolve: async () => ({ id: 1 }), lookupOptions: async () => ({ values: [], truncated: false }), localToUtc: async (_list, value) => value, checkAudit: async () => undefined, audit: async (_event: AuditEvent) => undefined, batch: async (_list: ListDefinition, rows: ValidatedRow[]): Promise<ImportRowResult[]> => rows.map((row, index) => ({ line: row.line, status: 'imported', id: index + 1 })), ...overrides };
}
test('conclui importação somente depois de revalidar schema e auditoria', async () => {
  const events: string[] = [];
  const service = new ImportService(gateway({ audit: async event => { events.push(event.status); } }), { ...DEFAULT_CONFIG, auditSiteUrl: 'https://tenant.sharepoint.com/sites/auditoria', batchSize: 1 });
  const result = await service.run(list, validation, 'dados.xlsx', () => undefined, () => false);
  assert.equal(result.status, 'Importado'); assert.equal(result.imported, 2); assert.deepEqual(events, ['Iniciado', 'Em andamento', 'Em andamento', 'Importado']);
});
test('importa sem exigir lista de auditoria quando nenhuma URL foi configurada', async () => {
  let auditCalls = 0;
  const service = new ImportService(gateway({ checkAudit: async () => { auditCalls++; throw new Error('não deveria chamar'); }, audit: async () => { auditCalls++; } }), DEFAULT_CONFIG);
  const result = await service.run(list, validation, 'dados.xlsx', () => undefined, () => false);
  assert.equal(result.status, 'Importado'); assert.equal(result.imported, 2); assert.equal(auditCalls, 0);
});
test('bloqueia validação quando o schema mudou', async () => {
  const service = new ImportService(gateway({ schema: async () => ({ ...list, schemaVersion: 'v2' }) }), DEFAULT_CONFIG);
  await assert.rejects(() => service.run(list, validation, 'dados.xlsx', () => undefined, () => false), /estrutura da lista mudou/i);
});
test('não repete automaticamente resultado desconhecido', async () => {
  let calls = 0;
  const service = new ImportService(gateway({ batch: async (_list, rows) => { calls++; return rows.map(row => ({ line: row.line, status: 'unknown', message: 'incerto' })); } }), DEFAULT_CONFIG);
  const result = await service.run(list, validation, 'dados.xlsx', () => undefined, () => false);
  assert.equal(result.status, 'Resultado desconhecido'); assert.equal(calls, 1); assert.equal(result.unknown, 2);
});
test('importa somente as linhas válidas quando a opção foi escolhida', async () => {
  const partial: ValidationResult = { ...validation, valid: 1, invalid: 1, rows: [validation.rows[0]], errors: [{ line: 3, column: 'Título', value: '', message: 'Campo obrigatório.', severity: 'error' }] };
  const service = new ImportService(gateway(), DEFAULT_CONFIG);
  const result = await service.run(list, partial, 'dados.xlsx', () => undefined, () => false, true);
  assert.equal(result.status, 'Parcial'); assert.equal(result.imported, 1); assert.equal(result.skipped, 1); assert.deepEqual(result.rows.map(row => row.line), [2]);
});
test('não permite importação parcial com erro estrutural', async () => {
  const structural: ValidationResult = { ...validation, valid: 1, invalid: 1, rows: [validation.rows[0]], errors: [{ line: 0, column: 'Título', value: '', message: 'Mapeamento ausente.', severity: 'error' }] };
  await assert.rejects(() => new ImportService(gateway(), DEFAULT_CONFIG).run(list, structural, 'dados.xlsx', () => undefined, () => false, true), /problemas estruturais/i);
});

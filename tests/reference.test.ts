import test from 'node:test';
import assert from 'node:assert/strict';
import { ListDefinition } from '../src/models';
import { ReferenceService, sharePointDateValue } from '../src/services/ReferenceService';
import { RestClient } from '../src/services/RestClient';

const list: ListDefinition = { id: '1', title: 'Teste', siteUrl: 'https://tenant.sharepoint.com/sites/teste', columns: [], canAdd: true, contentTypes: [], schemaVersion: 'v1', timeZoneId: 8, timeZoneDescription: 'Brasília' };

test('usa resposta OData verbose nas funções clássicas de fuso do SharePoint', async () => {
  const rest = new RestClient(list.siteUrl); const accepts: string[] = [];
  rest.request = async (_site, path, options) => {
    accepts.push(String((options.headers as Record<string, string>)?.Accept));
    const localToUtc = path.includes('localTimeToUTC'); const primary = path.includes('2026-03-08T03%3A00%3A00Z');
    const value = localToUtc ? '2026-03-08T03:00:00Z' : primary ? '2026-03-08T00:00:00' : '2026-03-08T01:00:00';
    const name = localToUtc ? 'LocalTimeToUTC' : 'UtcToLocalTime';
    return new Response(JSON.stringify({ d: { [name]: value } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const converted = await new ReferenceService(rest).localToUtc(list, '2026-03-08T00:00:00');
  assert.equal(converted, '2026-03-08T03:00:00.000Z');
  assert.ok(accepts.every(value => value === 'application/json;odata=verbose'));
});

test('lê formatos simples, aninhados e legados de data retornados pelo SharePoint', () => {
  assert.equal(sharePointDateValue({ d: { LocalTimeToUTC: { value: '2026-01-25T03:00:00Z' } } }), '2026-01-25T03:00:00Z');
  assert.equal(sharePointDateValue({ value: '2026-01-25T00:00:00' }), '2026-01-25T00:00:00');
  assert.equal(sharePointDateValue('/Date(1769310000000)/'), '2026-01-25T03:00:00.000Z');
  assert.equal(sharePointDateValue({ value: 'texto' }), undefined);
});

test('resolve pelo nome visível uma pessoa exportada pelo SharePoint', async () => {
  const rest = new RestClient(list.siteUrl);
  rest.get = async (_site, path) => {
    assert.match(path, /siteusers/); assert.match(path, /Luiza%20Souza/);
    return { value: [{ Id: 19, Title: 'Luiza Souza', PrincipalType: 1 }] };
  };
  const field: any = { internalName: 'ReferenciaTecnica', kind: 'User', peopleOnly: true, selectionGroup: 0 };
  assert.deepEqual(await new ReferenceService(rest).resolve(list, field, 'Luiza Souza'), { id: 19 });
});

test('pede identificador quando o nome visível corresponde a mais de uma pessoa', async () => {
  const rest = new RestClient(list.siteUrl);
  rest.get = async () => ({ value: [{ Id: 1 }, { Id: 2 }] });
  const field: any = { internalName: 'ReferenciaTecnica', kind: 'User', peopleOnly: true, selectionGroup: 0 };
  const result = await new ReferenceService(rest).resolve(list, field, 'Nome Repetido');
  assert.match(result.error || '', /ambíguo/);
});

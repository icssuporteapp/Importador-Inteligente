import test from 'node:test';
import assert from 'node:assert/strict';
import { BatchTransport, parseBatch } from '../src/services/BatchTransport';
const rows = [{ line: 2, payload: {} }, { line: 3, payload: {} }];
test('correlaciona respostas fora de ordem pelo Content-ID', () => {
  const response = `--r\r\nContent-Type: application/http\r\nContent-ID: 2\r\n\r\nHTTP/1.1 400 Bad Request\r\n\r\n{"error":{"message":"Inválido"}}\r\n--r\r\nContent-Type: application/http\r\nContent-ID: 1\r\n\r\nHTTP/1.1 201 Created\r\n\r\n{"Id":42}\r\n--r--`;
  const result = parseBatch(response, rows);
  assert.equal(result[0].status, 'imported'); assert.equal(result[0].id, 42);
  assert.equal(result[1].status, 'failed'); assert.equal(result[1].message, 'Inválido');
});
test('marca resposta ausente como desconhecida', () => {
  const result = parseBatch('HTTP/1.1 201 Created\r\n\r\n{"Id":9}', rows);
  assert.equal(result[0].status, 'imported'); assert.equal(result[1].status, 'unknown');
});
test('trata erro estruturado de servidor como rejeição confirmada', () => {
  const result = parseBatch('HTTP/1.1 500 Internal Server Error\r\n\r\n{"error":{"message":{"value":"Campo incompatível."}}}', [rows[0]]);
  assert.equal(result[0].status, 'failed'); assert.equal(result[0].httpStatus, 500); assert.equal(result[0].message, 'Campo incompatível.');
});
test('envia diretamente quando há somente uma linha', async () => {
  let path = '';
  const transport = new BatchTransport({ digest: async () => 'digest', request: async (_site: string, value: string) => { path = value; return new Response('', { status: 201, headers: { Location: "https://tenant.sharepoint.com/sites/teste/_api/web/lists/items(77)" } }); } } as any);
  const result = await transport.send({ id: '00000000-0000-0000-0000-000000000001', title: 'Lista', siteUrl: 'https://tenant.sharepoint.com/sites/teste' } as any, [rows[0]]);
  assert.match(path, /items$/); assert.deepEqual(result, [{ line: 2, status: 'imported', id: 77, httpStatus: 201, message: undefined }]);
});
test('considera sucesso sem corpo como importado mesmo sem ID', async () => {
  const transport = new BatchTransport({ digest: async () => 'digest', request: async () => new Response(null, { status: 204 }) } as any);
  const result = await transport.send({ id: '00000000-0000-0000-0000-000000000001', siteUrl: 'https://tenant.sharepoint.com/sites/teste' } as any, [rows[0]]);
  assert.equal(result[0].status, 'imported'); assert.equal(result[0].httpStatus, 204); assert.match(result[0].message || '', /não retornou o ID/);
});
test('preserva mensagem e HTTP de rejeição na gravação direta', async () => {
  const response = new Response(JSON.stringify({ error: { message: { value: 'Valor duplicado.' } } }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  const transport = new BatchTransport({ digest: async () => 'digest', request: async () => response } as any);
  const result = await transport.send({ id: '00000000-0000-0000-0000-000000000001', siteUrl: 'https://tenant.sharepoint.com/sites/teste' } as any, [rows[0]]);
  assert.equal(result[0].status, 'failed'); assert.equal(result[0].httpStatus, 500); assert.equal(result[0].message, 'Valor duplicado.');
});

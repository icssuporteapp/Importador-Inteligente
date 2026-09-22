import { ImportRowResult, ListDefinition, ValidatedRow } from '../models';
import { guid, RestClient, RestError, retryDelay } from './RestClient';
import { message, newId } from './utils';

/** Unknown outcomes must not be retried: a dropped response can follow a successful insert. */
export function parseBatch(text: string, rows: ValidatedRow[]): ImportRowResult[] {
  const matches: RegExpExecArray[] = []; const expression = /HTTP\/1\.[01] \d{3}/g; let found: RegExpExecArray | null;
  while ((found = expression.exec(text)) !== null) matches.push(found);
  const results: ImportRowResult[] = rows.map(r => ({ line: r.line, status: 'unknown', message: 'Resposta de lote incompleta. Reconcilie os itens antes de reenviar.' }));
  const occupied = new Set<number>();
  matches.forEach((match, sequence) => {
    const start = match.index || 0; const end = matches[sequence + 1]?.index || text.length;
    const prefixStart = matches[sequence - 1]?.index || 0;
    const prefix = text.slice(prefixStart, start); const piece = text.slice(start, end);
    const contentId = Number(/(?:^|\r?\n)Content-ID:\s*(\d+)\s*(?:\r?\n)/i.exec(prefix)?.[1]);
    const index = Number.isInteger(contentId) && contentId >= 1 && contentId <= rows.length ? contentId - 1 : sequence;
    if (index >= rows.length || occupied.has(index)) return;
    occupied.add(index);
    const status = Number(/^HTTP\/1\.[01] (\d{3})/.exec(piece)?.[1]);
    const bodyMatch = /\r?\n\r?\n([\s\S]*?)(?:\r?\n--|$)/.exec(piece);
    let body: any;
    try { body = bodyMatch ? JSON.parse(bodyMatch[1].trim()) : undefined; } catch { body = undefined; }
    const id = body?.Id || body?.ID || body?.d?.Id || body?.d?.ID;
    if (status >= 200 && status < 300 && typeof id === 'number') { results[index] = { line: rows[index].line, status: 'imported', id, httpStatus: status }; return; }
    if (status >= 200 && status < 300) { results[index] = { line: rows[index].line, status: 'unknown', httpStatus: status, message: 'Gravação retornou sucesso sem ID. Confira a lista antes de repetir.' }; return; }
    const retryHeader = /\r?\nRetry-After:\s*([^\r\n]+)/i.exec(piece)?.[1];
    const retryAfterMs = retryDelay(new Headers(retryHeader ? { 'Retry-After': retryHeader } : {}));
    const serverMessage = body?.error?.message?.value || body?.error?.message || body?.['odata.error']?.message?.value;
    // A structured SharePoint error confirms rejection; an opaque 5xx remains uncertain.
    if (status >= 500 && status !== 503 && typeof serverMessage !== 'string') { results[index] = { line: rows[index].line, status: 'unknown', httpStatus: status, message: `Falha de servidor com resultado incerto (HTTP ${status}). Verifique a lista.` }; return; }
    results[index] = { line: rows[index].line, status: 'failed', httpStatus: status, retryAfterMs, message: typeof serverMessage === 'string' ? serverMessage : `Registro rejeitado pelo SharePoint (HTTP ${status}).` };
  });
  return results;
}
export class BatchTransport {
  public constructor(private rest: RestClient) {}
  public async send(list: ListDefinition, rows: ValidatedRow[]): Promise<ImportRowResult[]> {
    if (rows.length === 1) {
      try {
        const digest = await this.rest.digest(list.siteUrl);
        const response = await this.rest.request(list.siteUrl, `web/lists(guid'${guid(list.id)}')/items`, { method: 'POST', headers: { 'Content-Type': 'application/json;odata=nometadata', Accept: 'application/json;odata=nometadata', 'X-RequestDigest': digest }, body: JSON.stringify(rows[0].payload) }, false);
        const responseText = await response.text(); let body: any;
        try { body = responseText.trim() ? JSON.parse(responseText) : undefined; } catch { body = undefined; }
        if (response.ok) {
          const data = body?.d || body; const entity = response.headers.get('OData-EntityId') || response.headers.get('Location') || '';
          const headerId = /items\((\d+)\)/i.exec(entity)?.[1]; const id = data?.Id || data?.ID || (headerId ? Number(headerId) : undefined);
          return [{ line: rows[0].line, status: 'imported', id: typeof id === 'number' ? id : undefined, httpStatus: response.status, message: typeof id === 'number' ? undefined : 'Importado; o SharePoint não retornou o ID do item.' }];
        }
        const serverMessage = body?.error?.message?.value || body?.error?.message || body?.['odata.error']?.message?.value;
        const confirmed = typeof serverMessage === 'string' || [400, 401, 403, 404, 409, 412, 413, 422, 429, 503].indexOf(response.status) >= 0;
        return [{ line: rows[0].line, status: confirmed ? 'failed' : 'unknown', httpStatus: response.status, retryAfterMs: retryDelay(response.headers), message: typeof serverMessage === 'string' ? serverMessage : `O SharePoint ${confirmed ? 'rejeitou' : 'não confirmou'} a gravação (HTTP ${response.status}).` }];
      } catch (error) {
        if (error instanceof RestError) {
          const rejected = [400, 401, 403, 404, 409, 412, 413, 422, 429, 503].indexOf(error.status) >= 0;
          return [{ line: rows[0].line, status: rejected ? 'failed' : 'unknown', httpStatus: error.status, retryAfterMs: error.retryAfterMs, message: `${message(error)} (HTTP ${error.status})` }];
        }
        return [{ line: rows[0].line, status: 'unknown', message: `Não foi possível interpretar a resposta: ${message(error)} Confira a lista antes de reenviar.` }];
      }
    }
    const digest = await this.rest.digest(list.siteUrl); // Failure before sending is a known non-write.
    const boundary = `batch_${newId()}`; const lines: string[] = [];
    // One changeset per record permits independent per-row responses and avoids cross-item rollback assumptions.
    rows.forEach((row, index) => {
      const change = `changeset_${newId()}`;
      lines.push(`--${boundary}`, `Content-Type: multipart/mixed; boundary=${change}`, '', `--${change}`, 'Content-Type: application/http', 'Content-Transfer-Encoding: binary', `Content-ID: ${index + 1}`, '', `POST ${list.siteUrl}/_api/web/lists(guid'${guid(list.id)}')/items HTTP/1.1`, 'Content-Type: application/json;odata=nometadata', 'Accept: application/json;odata=nometadata', '', JSON.stringify(row.payload), `--${change}--`, '');
    });
    lines.push(`--${boundary}--`, '');
    try {
      const response = await this.rest.request(list.siteUrl, '$batch', { method: 'POST', headers: { 'Content-Type': `multipart/mixed; boundary=${boundary}`, 'X-RequestDigest': digest }, body: lines.join('\r\n') }, false);
      if (!response.ok) {
        const knownRejected = [400, 401, 403, 404, 413, 429, 503].indexOf(response.status) >= 0;
        return rows.map(row => ({ line: row.line, status: knownRejected ? 'failed' : 'unknown', httpStatus: response.status, retryAfterMs: retryDelay(response.headers), message: `Lote ${knownRejected ? 'rejeitado' : 'sem confirmação'} (HTTP ${response.status}).` }));
      }
      return parseBatch(await response.text(), rows);
    } catch { return rows.map(row => ({ line: row.line, status: 'unknown', message: 'Conexão interrompida. O item pode ter sido gravado; reconcilie antes de reenviar.' })); }
  }
}

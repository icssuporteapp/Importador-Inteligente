import { assertSite, pause } from './utils';
export class RestError extends Error {
  public constructor(public status: number, text: string, public retryAfterMs = 0) { super(text); }
}
export function retryDelay(headers: Headers): number {
  const raw = headers.get('Retry-After'); if (!raw) return 1000;
  const seconds = Number(raw); return Number.isFinite(seconds) ? Math.max(0, seconds * 1000) : Math.max(0, Date.parse(raw) - Date.now()) || 1000;
}
export class RestClient {
  private digests = new Map<string, { value: string; expires: number }>();
  public constructor(public contextUrl: string) {}
  public site(url: string): string { return assertSite(url, this.contextUrl); }
  public async request(site: string, path: string, options: RequestInit = {}, retryRead = true): Promise<Response> {
    const base = this.site(site); const target = new URL(path.startsWith('https:') ? path : `${base}/_api/${path}`);
    this.site(target.origin + target.pathname);
    if (!target.pathname.toLowerCase().includes('/_api/')) throw new Error('Endpoint SharePoint inválido.');
    const isRead = !options.method || options.method === 'GET';
    for (let attempt = 0; ; attempt++) {
      const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 60000);
      let response: Response;
      try { response = await fetch(target.href, { ...options, credentials: 'same-origin', signal: controller.signal, headers: { Accept: 'application/json;odata=nometadata', ...options.headers } }); }
      finally { clearTimeout(timer); }
      if (isRead && retryRead && [429, 503].indexOf(response.status) >= 0 && attempt < 2) { await pause(retryDelay(response.headers)); continue; }
      return response;
    }
  }
  public async get<T = any>(site: string, path: string): Promise<T> { return this.json<T>(await this.request(site, path)); }
  public async post<T = any>(site: string, path: string, body: unknown): Promise<T> {
    const digest = await this.digest(site);
    const response = await this.request(site, path, { method: 'POST', headers: { 'Content-Type': 'application/json;odata=nometadata', 'X-RequestDigest': digest }, body: JSON.stringify(body) }, false);
    return this.json<T>(response);
  }
  public async all<T = any>(site: string, path: string, limit = 50000): Promise<T[]> {
    const results: T[] = []; let next: string | undefined = path;
    while (next) {
      const page: any = await this.get(site, next); const data = page.d || page;
      results.push(...(data.results || data.value || [])); next = data['@odata.nextLink'] || data['odata.nextLink'] || data.__next;
      if (next && results.length >= limit) throw new Error(`Consulta excedeu ${limit} resultados; reduza o escopo de pesquisa.`);
    }
    return results;
  }
  public async digest(site: string): Promise<string> {
    const key = this.site(site); const current = this.digests.get(key);
    if (current && current.expires > Date.now()) return current.value;
    const data: any = await this.json(await this.request(site, 'contextinfo', { method: 'POST' }, false));
    const info = data.GetContextWebInformation || data;
    if (!info.FormDigestValue) throw new Error('Não foi possível obter o contexto de gravação.');
    this.digests.set(key, { value: info.FormDigestValue, expires: Date.now() + Math.max(0, Number(info.FormDigestTimeoutSeconds) - 60) * 1000 });
    return info.FormDigestValue;
  }
  public async json<T>(response: Response): Promise<T> {
    if (!response.ok) {
      // Never expose server payloads, tokens or cell contents in application logs.
      const friendly = response.status === 403 ? 'Acesso negado pelo SharePoint.' : response.status === 404 ? 'Recurso não encontrado no SharePoint.' : response.status === 429 || response.status === 503 ? 'SharePoint temporariamente ocupado. Tente novamente.' : `O SharePoint rejeitou a operação (HTTP ${response.status}).`;
      throw new RestError(response.status, friendly, retryDelay(response.headers));
    }
    if (response.status === 204) return undefined as T;
    const data = await response.json(); return (data.d || data) as T;
  }
}
export const odata = (text: string): string => text.replace(/'/g, "''");
export const guid = (value: string): string => { const clean = value.replace(/[{}]/g, ''); if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) throw new Error('Identificador da lista inválido.'); return clean; };
export const can = (permissions: { Low: string | number; High: string | number }, bit: number): boolean => bit <= 32 ? (Number(permissions.Low) & (1 << (bit - 1))) !== 0 : (Number(permissions.High) & (1 << (bit - 33))) !== 0;

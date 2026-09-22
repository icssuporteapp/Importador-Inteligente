export const message = (error: unknown): string => error instanceof Error ? error.message : 'Não foi possível concluir a operação.';
export const pause = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
export function splitValues(value: string): string[] {
  const values: string[] = []; let current = ''; let escaped = false;
  for (const char of value) {
    if (escaped) { if (char !== ';' && char !== '\\') throw new Error('Use \\; para ponto e vírgula e \\\\ para barra.'); current += char; escaped = false; }
    else if (char === '\\') escaped = true;
    else if (char === ';') { values.push(current.trim()); current = ''; }
    else current += char;
  }
  if (escaped) throw new Error('Escape incompleto no final do valor.');
  values.push(current.trim());
  if (values.some(v => !v)) throw new Error('Há um valor vazio entre os separadores.');
  return values;
}
export const referenceKey = (field: string, value: string): string => JSON.stringify([field, value.trim().toLocaleLowerCase()]);
export async function mapLimit<T, R>(items: T[], concurrency: number, action: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length); let index = 0;
  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), items.length) }, async () => {
    while (index < items.length) { const current = index++; results[current] = await action(items[current]); }
  }));
  return results;
}
export function newId(): string { return crypto.randomUUID(); }
export function assertSite(url: string, contextUrl: string): string {
  const parsed = new URL(url, contextUrl); const context = new URL(contextUrl);
  if (parsed.protocol !== 'https:' || parsed.origin !== context.origin || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error('Configure um site HTTPS na mesma origem SharePoint da solução.');
  return parsed.href.replace(/\/$/, '');
}

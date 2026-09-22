import { ColumnDefinition, ListDefinition, ReferenceResolution } from '../models';
import { guid, odata, RestClient, RestError } from './RestClient';
import { message } from './utils';

export function sharePointDateValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const dotNet = /^\/Date\((-?\d+)(?:[+-]\d{4})?\)\/$/.exec(value);
    if (dotNet) return new Date(Number(dotNet[1])).toISOString();
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/.test(value)) return value;
    return undefined;
  }
  if (!value || typeof value !== 'object') return undefined;
  for (const nested of Object.keys(value as Record<string, unknown>).map(key => (value as Record<string, unknown>)[key])) {
    const date = sharePointDateValue(nested); if (date) return date;
  }
  return undefined;
}
export class ReferenceService {
  private lookupWebs = new Map<string, string>();
  public constructor(private rest: RestClient) {}
  private async lookupSite(list: ListDefinition, field: ColumnDefinition): Promise<string> {
    if (!field.lookupWeb || /^\{?0{8}-0{4}-0{4}-0{4}-0{12}\}?$/.test(field.lookupWeb)) return list.siteUrl;
    const key = `${list.siteUrl}|${field.lookupWeb}`;
    const cached = this.lookupWebs.get(key); if (cached) return cached;
    const web = await this.rest.get(list.siteUrl, `site/openWebById('${guid(field.lookupWeb)}')?$select=Url`);
    const url = this.rest.site(web.Url); this.lookupWebs.set(key, url); return url;
  }
  public async resolve(list: ListDefinition, field: ColumnDefinition, value: string): Promise<ReferenceResolution> {
    try {
      if (field.kind.startsWith('Lookup')) {
        const site = await this.lookupSite(list, field); const id = guid(field.lookupList || '');
        const explicit = /^ID:([1-9]\d*)$/i.exec(value); const display = field.lookupField || 'Title';
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(display)) throw new Error('Coluna relacionada não suportada para consulta. Use uma coluna de referência padrão.');
        if (explicit) { const item = await this.rest.get(site, `web/lists(guid'${id}')/items(${Number(explicit[1])})?$select=Id`); return { id: item.Id }; }
        const rows = await this.rest.get(site, `web/lists(guid'${id}')/items?$select=Id&$filter=${encodeURIComponent(`${display} eq '${odata(value)}'`)}&$top=2`);
        const items = rows.value || rows.results || [];
        if (items.length !== 1) return { error: items.length ? 'Referência ambígua. Use ID: seguido do número do item.' : 'Item não encontrado na lista relacionada.' };
        return { id: items[0].Id };
      }
      let principal: any;
      if (/^GRUPO:/i.test(value)) {
        if (field.peopleOnly || field.selectionGroup) return { error: 'O campo permite somente pessoas ou restringe a seleção a membros de um grupo.' };
        principal = await this.rest.get(list.siteUrl, `web/sitegroups/getByName('${encodeURIComponent(odata(value.slice(6).trim()))}')?$select=Id,Title`);
      } else {
        if (value.includes('@') || value.includes('|')) {
          principal = await this.rest.post(list.siteUrl, 'web/ensureuser', { logonName: value });
        } else {
          // SharePoint exports Person fields using the visible title, not the UPN.
          const response = await this.rest.get(list.siteUrl, `web/siteusers?$select=Id,Title,LoginName,Email,PrincipalType&$filter=${encodeURIComponent(`Title eq '${odata(value)}'`)}&$top=2`);
          const matches = response.value || response.results || [];
          if (matches.length !== 1) return { error: matches.length ? 'Nome de pessoa ambíguo. Informe e-mail ou UPN.' : 'Pessoa não encontrada neste site. Informe e-mail ou UPN.' };
          principal = matches[0];
        }
        if (field.peopleOnly && principal.PrincipalType !== 1) return { error: 'O campo permite somente pessoas.' };
        if (field.selectionGroup) {
          const members = await this.rest.get(list.siteUrl, `web/sitegroups/getById(${field.selectionGroup})/users?$select=Id&$filter=Id eq ${principal.Id}`);
          if (!(members.value || members.results || []).length) return { error: 'Usuário não pertence ao grupo permitido pelo campo.' };
        }
      }
      return principal.Id ? { id: principal.Id } : { error: 'Principal não resolvido pelo SharePoint.' };
    } catch (error) {
      if (error instanceof RestError && error.status === 404) return { error: field.kind.startsWith('Lookup') ? 'Item ou lista relacionada não encontrado.' : 'Usuário ou grupo não encontrado.' };
      return { error: message(error) };
    }
  }
  public async options(list: ListDefinition, field: ColumnDefinition, limit: number): Promise<{ values: string[]; truncated: boolean }> {
    const site = await this.lookupSite(list, field); const display = field.lookupField || 'Title';
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(display)) throw new Error('Campo de lookup não suportado para catálogo.');
    const values: string[] = []; let next: string | undefined = `web/lists(guid'${guid(field.lookupList || '')}')/items?$select=Id,${display}&$top=${Math.min(500, limit + 1)}&$orderby=Id`;
    while (next && values.length <= limit) {
      const page: any = await this.rest.get(site, next);
      for (const item of page.value || page.results || []) values.push(`ID:${item.Id} — ${String(item[display] ?? '')}`);
      next = page['@odata.nextLink'] || page['odata.nextLink'] || page.__next;
    }
    return { values: values.slice(0, limit), truncated: !!next || values.length > limit };
  }
  public async localToUtc(list: ListDefinition, localIso: string): Promise<string> {
    const prefix = 'web/RegionalSettings/TimeZone';
    const convert = async (operation: string, value: string): Promise<string> => {
      // The classic TimeZone functions can reject odata=nometadata with HTTP 406 on SharePoint Online.
      const response = await this.rest.request(list.siteUrl, `${prefix}/${operation}(@date)?@date='${encodeURIComponent(value)}'`, { headers: { Accept: 'application/json;odata=verbose' } });
      const result = await this.rest.json<Record<string, unknown>>(response);
      const output = sharePointDateValue(result);
      if (!output) throw new Error('O SharePoint não retornou uma data válida na conversão do fuso horário.'); return output;
    };
    const utc = await convert('localTimeToUTC', localIso); const back = await convert('utcToLocalTime', utc);
    if (back.slice(0, 19) !== localIso) throw new Error('Horário inexistente no fuso do site. Informe ISO com fuso explícito.');
    // Detect DST folds instead of silently selecting one of two possible instants.
    for (const delta of [-60, 60, -30, 30]) {
      const alternate = new Date(Date.parse(utc) + delta * 60000).toISOString();
      if ((await convert('utcToLocalTime', alternate)).slice(0, 19) === localIso) throw new Error('Horário ambíguo no fuso do site. Informe ISO com fuso explícito.');
    }
    return new Date(utc).toISOString();
  }
}

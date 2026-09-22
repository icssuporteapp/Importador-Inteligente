import { AppConfiguration, ListReference, SearchResult } from '../models';
import { can, guid, RestClient } from './RestClient';
import { mapLimit } from './utils';
export class SearchService {
  public constructor(private rest: RestClient, private config: AppConfiguration) {}
  private resultSite(spWebUrl: string, path: string): string {
    if (spWebUrl) return this.rest.site(spWebUrl);
    const result = new URL(path); const marker = result.pathname.toLocaleLowerCase().indexOf('/lists/');
    if (marker < 0) throw new Error('O resultado não contém o endereço de uma lista do SharePoint.');
    result.pathname = marker === 0 ? '/' : result.pathname.slice(0, marker); result.search = ''; result.hash = '';
    return this.rest.site(result.href);
  }
  public async search(query: string): Promise<SearchResult> {
    const text = query.trim(); if (text.length < 2) throw new Error('Digite pelo menos dois caracteres.');
    const lists = new Map<string, ListReference>(); const warnings: string[] = [];
    const sites = Array.from(new Set([this.rest.contextUrl, ...this.config.sites.map(s => s.url)]));
    const add = (list: ListReference): void => { lists.set(`${list.siteUrl.toLowerCase()}|${list.id.toLowerCase()}`, list); };
    await mapLimit(sites, this.config.concurrency, async site => {
      try {
        const items = await this.rest.all(site, 'web/lists?$select=Id,Title,Hidden,BaseTemplate,EffectiveBasePermissions&$filter=Hidden eq false and BaseTemplate eq 100&$top=200');
        for (const item of items) if (item.Title.toLocaleLowerCase().includes(text.toLocaleLowerCase()) && item.EffectiveBasePermissions && can(item.EffectiveBasePermissions, 1)) add({ id: guid(item.Id), title: item.Title, siteUrl: this.rest.site(site), siteTitle: this.config.sites.find(s => s.url === site)?.name });
      } catch { warnings.push('Não foi possível consultar um dos sites configurados. A busca está incompleta.'); }
    });
    try {
      // Strip KQL operators; user text is a search term, never executable query syntax.
      // Underscore and hyphen are common in list titles and are safe KQL term characters.
      const normalized = text.replace(/[^A-Za-zÀ-ÿ0-9_\-\s]/g, ' ').trim();
      const terms = normalized.split(/\s+/).filter(Boolean).slice(0, 8);
      if (terms.length) {
        const candidates: ListReference[] = []; let start = 0;
        while (start < 1000) {
          const titleQuery = terms.length === 1 ? `Title:${terms[0]}*` : `(Title:\"${terms.join(' ')}\" OR (${terms.map(t => `Title:${t}*`).join(' AND ')}))`;
          const kql = `contentclass:STS_List_GenericList AND ${titleQuery}`;
          const data = await this.rest.get(this.rest.contextUrl, `search/query?querytext='${encodeURIComponent(kql)}'&selectproperties='Title,SPWebUrl,ListId,Path'&rowlimit=100&startrow=${start}&trimduplicates=false`);
          const relevant = (data.query || data).PrimaryQueryResult?.RelevantResults;
          const rawRows = relevant?.Table?.Rows?.results || relevant?.Table?.Rows || [];
          for (const row of rawRows) {
            const cells = row.Cells.results || row.Cells; const get = (key: string): string => cells.find((c: any) => c.Key === key)?.Value || '';
            try { candidates.push({ id: guid(get('ListId')), title: get('Title'), siteUrl: this.resultSite(get('SPWebUrl'), get('Path')) }); } catch { /* Ignore search hits outside the supported origin or without a list ID. */ }
          }
          start += rawRows.length;
          if (!rawRows.length || start >= Number(relevant?.TotalRows || 0)) break;
          if (start >= 1000) warnings.push('Há muitos resultados de pesquisa. Refine o nome para encontrar outras listas.');
        }
        await mapLimit(candidates, this.config.concurrency, async candidate => {
          try {
            const info = await this.rest.get(candidate.siteUrl, `web/lists(guid'${candidate.id}')?$select=Id,Title,Hidden,BaseTemplate,EffectiveBasePermissions`);
            if (!info.Hidden && info.BaseTemplate === 100 && can(info.EffectiveBasePermissions, 1)) add({ ...candidate, title: info.Title });
          } catch { /* Search is security trimmed, but permissions can change since indexing. */ }
        });
      }
    } catch { warnings.push('A pesquisa indexada não está disponível. Os resultados dos sites configurados continuam disponíveis.'); }
    return { lists: Array.from(lists.values()).sort((a, b) => a.title.localeCompare(b.title)), warnings: Array.from(new Set(warnings)) };
  }
}

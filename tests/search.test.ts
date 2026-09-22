import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG } from '../src/models';
import { RestClient } from '../src/services/RestClient';
import { SearchService } from '../src/services/SearchService';

test('usa o Path quando a pesquisa do SharePoint não informa SPWebUrl', async () => {
  const id = '306aa5ad-b904-4eb3-9a27-57ee2adae17e';
  const contextUrl = 'https://climaesociedade.sharepoint.com/sites/origem';
  const rest = {
    contextUrl,
    site: (url: string): string => new RestClient(contextUrl).site(url),
    all: async (): Promise<unknown[]> => [],
    get: async (site: string, path: string): Promise<any> => {
      if (path.startsWith('search/query')) return { PrimaryQueryResult: { RelevantResults: { TotalRows: 1, Table: { Rows: [{ Cells: [
        { Key: 'Title', Value: 'iCS - DIT - ConectaICS_Base' },
        { Key: 'SPWebUrl', Value: null },
        { Key: 'ListId', Value: id },
        { Key: 'Path', Value: 'https://climaesociedade.sharepoint.com/sites/ti/Lists/ConectaICS_Base/AllItems.aspx' }
      ] }] } } } };
      assert.equal(site, 'https://climaesociedade.sharepoint.com/sites/ti');
      assert.match(path, new RegExp(id));
      return { Id: id, Title: 'ConectaICS_Base', Hidden: false, BaseTemplate: 100, EffectiveBasePermissions: { Low: '1', High: '0' } };
    }
  } as unknown as RestClient;

  const result = await new SearchService(rest, { ...DEFAULT_CONFIG, sites: [] }).search('ConectaICS_Base');

  assert.deepEqual(result.lists, [{ id, title: 'ConectaICS_Base', siteUrl: 'https://climaesociedade.sharepoint.com/sites/ti' }]);
  assert.deepEqual(result.warnings, []);
});

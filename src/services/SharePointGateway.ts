import { spfi, SPFx } from '@pnp/sp';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { AppConfiguration, AuditEvent, ColumnDefinition, ImportRowResult, ListDefinition, ListReference, ReferenceResolution, SearchResult, ValidatedRow } from '../models';
import { Gateway } from './contracts';
import { RestClient } from './RestClient';
import { SearchService } from './SearchService';
import { SharePointSchemaService } from './SharePointSchemaService';
import { ReferenceService } from './ReferenceService';
import { AuditService } from './AuditService';
import { BatchTransport } from './BatchTransport';
export class SharePointGateway implements Gateway {
  private searchService: SearchService; private schemas: SharePointSchemaService; private references: ReferenceService; private audits: AuditService; private batches: BatchTransport;
  public constructor(context: WebPartContext, config: AppConfiguration) {
    const rest = new RestClient(context.pageContext.web.absoluteUrl);
    this.searchService = new SearchService(rest, config);
    this.schemas = new SharePointSchemaService(rest, url => spfi(url).using(SPFx(context)));
    this.references = new ReferenceService(rest); this.audits = new AuditService(rest, config.auditSiteUrl || rest.contextUrl); this.batches = new BatchTransport(rest);
  }
  public search(query: string): Promise<SearchResult> { return this.searchService.search(query); }
  public schema(list: ListReference, contentTypeId?: string): Promise<ListDefinition> { return this.schemas.load(list, contentTypeId); }
  public resolve(list: ListDefinition, field: ColumnDefinition, value: string): Promise<ReferenceResolution> { return this.references.resolve(list, field, value); }
  public lookupOptions(list: ListDefinition, field: ColumnDefinition, limit: number): Promise<{ values: string[]; truncated: boolean }> { return this.references.options(list, field, limit); }
  public localToUtc(list: ListDefinition, localIso: string): Promise<string> { return this.references.localToUtc(list, localIso); }
  public checkAudit(): Promise<void> { return this.audits.check(); }
  public audit(event: AuditEvent): Promise<void> { return this.audits.write(event); }
  public batch(list: ListDefinition, rows: ValidatedRow[]): Promise<ImportRowResult[]> { return this.batches.send(list, rows); }
}

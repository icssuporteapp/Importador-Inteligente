import { AuditEvent, ColumnDefinition, ImportRowResult, ListDefinition, ListReference, ReferenceResolution, SearchResult, ValidatedRow } from '../models';
export interface Gateway {
  search(query: string): Promise<SearchResult>;
  schema(list: ListReference, contentTypeId?: string): Promise<ListDefinition>;
  resolve(list: ListDefinition, field: ColumnDefinition, value: string): Promise<ReferenceResolution>;
  lookupOptions(list: ListDefinition, field: ColumnDefinition, limit: number): Promise<{ values: string[]; truncated: boolean }>;
  localToUtc(list: ListDefinition, localIso: string): Promise<string>;
  checkAudit(): Promise<void>;
  audit(event: AuditEvent): Promise<void>;
  batch(list: ListDefinition, rows: ValidatedRow[]): Promise<ImportRowResult[]>;
}

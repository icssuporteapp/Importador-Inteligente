export type FieldKind = 'Text' | 'Note' | 'Number' | 'Currency' | 'Boolean' | 'DateTime' | 'Choice' | 'MultiChoice' | 'Lookup' | 'LookupMulti' | 'User' | 'UserMulti' | 'Unsupported';
export interface ColumnDefinition {
  id: string; internalName: string; title: string; header: string; kind: FieldKind;
  required: boolean; readOnly: boolean; hidden: boolean; defaultValue?: string;
  maxLength?: number; min?: number; max?: number; decimals?: number; unique?: boolean;
  choices?: string[]; fillInChoice?: boolean; dateOnly?: boolean;
  lookupList?: string; lookupWeb?: string; lookupField?: string;
  peopleOnly?: boolean; selectionGroup?: number; nativeType: string;
}
export interface ListReference { id: string; title: string; siteUrl: string; siteTitle?: string }
export interface ContentTypeDefinition { id: string; name: string }
export interface ListDefinition extends ListReference {
  columns: ColumnDefinition[]; canAdd: boolean; contentTypes: ContentTypeDefinition[];
  contentTypeId?: string; schemaVersion: string; timeZoneId: number; timeZoneDescription: string;
  validationFormula?: string;
}
export interface ParsedCell { value: string | number | boolean | null; text: string; formula?: string; error?: boolean }
export interface ParsedRow { line: number; cells: ParsedCell[] }
export interface ParsedSheet { name: string; headers: string[]; rows: ParsedRow[]; date1904: boolean; fingerprint: string }
export interface ValidationError { line: number; column: string; value: string; message: string; severity: 'error' | 'warning' }
export type Payload = Record<string, unknown>;
export interface ValidatedRow { line: number; payload: Payload }
export interface ValidationResult {
  total: number; valid: number; invalid: number; errors: ValidationError[];
  rows: ValidatedRow[]; schemaVersion: string; fingerprint: string; validatedAt: string;
}
export interface ImportRowResult { line: number; status: 'imported' | 'failed' | 'unknown' | 'pending'; id?: number; message?: string; retryAfterMs?: number; httpStatus?: number }
export type ImportStatus = 'Importado' | 'Parcial' | 'Falhou' | 'Interrompido' | 'Resultado desconhecido';
export interface ImportResult { executionId: string; status: ImportStatus; rows: ImportRowResult[]; imported: number; failed: number; unknown: number; skipped: number; auditError?: string }
export interface ImportProgressData { processed: number; total: number; imported: number; failed: number; unknown: number; percent: number; remainingSeconds: number }
export interface SiteConfiguration { url: string; name: string }
export interface AppConfiguration { sites: SiteConfiguration[]; auditSiteUrl: string; maxRows: number; maxColumns: number; maxFileMb: number; templateLookupLimit: number; batchSize: number; maxRetries: number; concurrency: number }
export const DEFAULT_CONFIG: AppConfiguration = { sites: [], auditSiteUrl: '', maxRows: 10000, maxColumns: 100, maxFileMb: 20, templateLookupLimit: 5000, batchSize: 50, maxRetries: 2, concurrency: 3 };
export interface ValidationOptions { culture: 'pt-BR' | 'en-US'; mapping: Record<number, string>; targetMapping?: Record<string, number>; }
export interface ReferenceResolution { id?: number; error?: string }
export type ReferenceCache = Map<string, ReferenceResolution>;
export interface AuditEvent { executionId: string; eventId: string; status: string; list: ListReference; fileName: string; total: number; errors: number; imported: number }
export interface SearchResult { lists: ListReference[]; warnings: string[] }

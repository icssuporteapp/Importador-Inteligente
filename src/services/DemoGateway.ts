import { AuditEvent, ColumnDefinition, ImportRowResult, ListDefinition, ListReference, ReferenceResolution, SearchResult, ValidatedRow } from '../models';
import { Gateway } from './contracts';
import { pause } from './utils';

const demoList: ListDefinition = {
  id: '11111111-1111-1111-1111-111111111111', title: 'Projetos de demonstração', siteUrl: 'https://demonstracao.invalid/sites/projetos', siteTitle: 'Ambiente simulado', canAdd: true,
  contentTypes: [{ id: '0x01', name: 'Item' }], contentTypeId: '0x01', schemaVersion: 'demo-v1', timeZoneId: 7, timeZoneDescription: 'Brasília', columns: [
    { id: '1', internalName: 'Title', title: 'Projeto', header: 'Projeto', kind: 'Text', nativeType: 'Text', required: true, readOnly: false, hidden: false, maxLength: 255 },
    { id: '2', internalName: 'Status', title: 'Status', header: 'Status', kind: 'Choice', nativeType: 'Choice', required: true, readOnly: false, hidden: false, choices: ['Em andamento', 'Concluído', 'Cancelado'] },
    { id: '3', internalName: 'Ativo', title: 'Ativo', header: 'Ativo', kind: 'Boolean', nativeType: 'Boolean', required: false, readOnly: false, hidden: false },
    { id: '4', internalName: 'DataInicio', title: 'Data de início', header: 'Data de início', kind: 'DateTime', nativeType: 'DateTime', dateOnly: true, required: false, readOnly: false, hidden: false },
    { id: '5', internalName: 'Orcamento', title: 'Orçamento', header: 'Orçamento', kind: 'Currency', nativeType: 'Currency', required: false, readOnly: false, hidden: false, decimals: 2 },
    { id: '6', internalName: 'Responsavel', title: 'Responsável', header: 'Responsável', kind: 'User', nativeType: 'User', peopleOnly: true, required: false, readOnly: false, hidden: false },
    { id: '7', internalName: 'Area', title: 'Área relacionada', header: 'Área relacionada', kind: 'Lookup', nativeType: 'Lookup', lookupList: '22222222-2222-2222-2222-222222222222', lookupField: 'Title', required: false, readOnly: false, hidden: false }
  ]
};
export class DemoGateway implements Gateway {
  private audits: AuditEvent[] = [];
  public async search(query: string): Promise<SearchResult> { await pause(250); return { lists: query.trim().length >= 2 ? [demoList] : [], warnings: ['Modo de demonstração: nenhum dado corporativo será consultado ou gravado.'] }; }
  public async schema(_list: ListReference, _contentTypeId?: string): Promise<ListDefinition> { await pause(150); return { ...demoList, columns: demoList.columns.map(c => ({ ...c })) }; }
  public async resolve(_list: ListDefinition, field: ColumnDefinition, value: string): Promise<ReferenceResolution> {
    await pause(15);
    if (field.kind.indexOf('User') === 0) return /@example\.org$/i.test(value) ? { id: Math.abs(this.hash(value)) % 10000 + 1 } : { error: 'No modo de demonstração, use um e-mail example.org.' };
    const explicit = /^ID:([1-9]\d*)/i.exec(value); return explicit ? { id: Number(explicit[1]) } : { error: 'No modo de demonstração, use lookup no formato ID:123.' };
  }
  public async lookupOptions(): Promise<{ values: string[]; truncated: boolean }> { return { values: ['ID:101 — Programas', 'ID:102 — Operações', 'ID:103 — Tecnologia'], truncated: false }; }
  public async localToUtc(_list: ListDefinition, localIso: string): Promise<string> { return `${localIso}-03:00`; }
  public async checkAudit(): Promise<void> { return undefined; }
  public async audit(event: AuditEvent): Promise<void> { this.audits.push(event); }
  public async batch(_list: ListDefinition, rows: ValidatedRow[]): Promise<ImportRowResult[]> { await pause(200); return rows.map((row, index) => ({ line: row.line, status: 'imported', id: 9000 + index })); }
  private hash(value: string): number { let hash = 0; for (let i = 0; i < value.length; i++) hash = ((hash << 5) - hash) + value.charCodeAt(i); return hash | 0; }
}

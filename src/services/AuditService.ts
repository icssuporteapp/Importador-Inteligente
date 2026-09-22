import { AuditEvent } from '../models';
import { can, RestClient } from './RestClient';
export const AUDIT_FIELDS = ['ExecutionId', 'EventId', 'StatusExecucao', 'SiteDestino', 'ListaDestino', 'ListaId', 'Arquivo', 'TotalRegistros', 'TotalErros', 'TotalImportados'];
export class AuditService {
  public constructor(private rest: RestClient, private site: string) {}
  public async check(): Promise<void> {
    const path = "web/lists/getByTitle('ImportacoesSharePoint')";
    const [list, fields] = await Promise.all([this.rest.get(this.site, `${path}?$select=EffectiveBasePermissions`), this.rest.all(this.site, `${path}/fields?$select=InternalName`)]);
    if (!can(list.EffectiveBasePermissions, 2)) throw new Error('Sem permissão para registrar auditoria. Solicite o provisionamento à TI.');
    if (AUDIT_FIELDS.some(name => !fields.some((f: any) => f.InternalName === name))) throw new Error('A lista de auditoria está incompleta. Execute o provisionamento.');
  }
  public async write(event: AuditEvent): Promise<void> {
    // Created and Author are supplied by SharePoint, not accepted from the client as trusted identity.
    await this.rest.post(this.site, "web/lists/getByTitle('ImportacoesSharePoint')/items", {
      Title: `${event.status} — ${event.executionId}`, ExecutionId: event.executionId, EventId: event.eventId,
      StatusExecucao: event.status, SiteDestino: event.list.siteUrl, ListaDestino: event.list.title,
      ListaId: event.list.id, Arquivo: event.fileName, TotalRegistros: event.total, TotalErros: event.errors, TotalImportados: event.imported
    });
  }
}

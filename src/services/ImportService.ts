import { AppConfiguration, AuditEvent, ImportProgressData, ImportResult, ImportRowResult, ListDefinition, ValidationResult } from '../models';
import { Gateway } from './contracts';
import { message, newId, pause } from './utils';
export class ImportService {
  private running = false;
  public constructor(private gateway: Gateway, private config: AppConfiguration) {}
  public async run(list: ListDefinition, validation: ValidationResult, fileName: string, onProgress: (value: ImportProgressData) => void, shouldStop: () => boolean, validOnly = false): Promise<ImportResult> {
    if (this.running) throw new Error('Já existe uma importação em andamento.');
    const structuralErrors = validation.errors.some(e => e.severity === 'error' && !e.line);
    if (!validation.total || structuralErrors || !validation.rows.length || (!validOnly && (validation.rows.length !== validation.total || validation.errors.some(e => e.severity === 'error')))) throw new Error(validOnly ? 'Não há linhas válidas disponíveis ou existem problemas estruturais.' : 'Corrija os erros ou escolha importar somente as linhas válidas.');
    this.running = true;
    try {
      const fresh = await this.gateway.schema(list, list.contentTypeId);
      if (!fresh.canAdd) throw new Error('A permissão de inclusão não está mais disponível.');
      if (fresh.schemaVersion !== validation.schemaVersion) throw new Error('A estrutura da lista mudou. Valide o arquivo novamente.');
      const auditEnabled = !!this.config.auditSiteUrl.trim();
      if (auditEnabled) await this.gateway.checkAudit();
      const executionId = newId(); const started = Date.now();
      const importTotal = validation.rows.length; const skipped = validation.total - importTotal;
      const result: ImportResult = { executionId, status: 'Falhou', rows: validation.rows.map(r => ({ line: r.line, status: 'pending' })), imported: 0, failed: 0, unknown: 0, skipped };
      let auditError = '';
      const event = (status: string): AuditEvent => ({ executionId, eventId: newId(), status, list, fileName, total: validation.total, errors: result.failed + result.unknown, imported: result.imported });
      if (auditEnabled) await this.gateway.audit(event('Iniciado'));
      const update = (): void => {
        result.imported = result.rows.filter(r => r.status === 'imported').length;
        result.failed = result.rows.filter(r => r.status === 'failed').length; result.unknown = result.rows.filter(r => r.status === 'unknown').length;
        const processed = result.imported + result.failed + result.unknown;
        onProgress({ total: importTotal, processed, imported: result.imported, failed: result.failed, unknown: result.unknown, percent: Math.round(processed / importTotal * 100), remainingSeconds: processed ? Math.round((Date.now() - started) / 1000 / processed * (importTotal - processed)) : 0 });
      };
      for (let offset = 0; offset < validation.rows.length; offset += this.config.batchSize) {
        if (shouldStop()) break;
        let batch = validation.rows.slice(offset, offset + this.config.batchSize);
        for (let attempt = 0; batch.length; attempt++) {
          let outcomes: ImportRowResult[];
          try { outcomes = await this.gateway.batch(fresh, batch); }
          catch (error) { outcomes = batch.map(r => ({ line: r.line, status: 'unknown', message: `${message(error)} O lote pode ter sido enviado; reconcilie antes de tentar novamente.` })); }
          for (const outcome of outcomes) { const index = result.rows.findIndex(r => r.line === outcome.line); if (index >= 0) result.rows[index] = outcome; }
          // A malformed adapter must not leave submitted rows marked pending or allow a blind retry.
          for (const row of batch) if (!outcomes.some(o => o.line === row.line)) { const index = result.rows.findIndex(r => r.line === row.line); result.rows[index] = { line: row.line, status: 'unknown', message: 'Resposta ausente. Reconcilie antes de reenviar.' }; }
          update();
          const retryable = outcomes.filter(o => o.status === 'failed' && [429, 503].indexOf(o.httpStatus || 0) >= 0);
          if (!retryable.length || attempt >= this.config.maxRetries || shouldStop() || result.unknown) break;
          const delay = Math.max(1000 * 2 ** attempt, ...retryable.map(o => o.retryAfterMs || 0));
          // Sleep in short increments so interruption remains responsive, without violating Retry-After.
          for (let elapsed = 0; elapsed < delay && !shouldStop(); elapsed += 250) await pause(Math.min(250, delay - elapsed));
          if (shouldStop()) break;
          batch = batch.filter(r => retryable.some(o => o.line === r.line));
        }
        if (auditEnabled) {
          try { await this.gateway.audit(event('Em andamento')); }
          catch { auditError = 'A auditoria falhou após o envio. Novos lotes foram interrompidos. Exporte o resultado.'; break; }
        }
        if (result.unknown) break;
      }
      update();
      result.status = result.unknown ? 'Resultado desconhecido' : shouldStop() ? 'Interrompido' : result.imported === importTotal ? (skipped ? 'Parcial' : 'Importado') : result.imported > 0 ? 'Parcial' : 'Falhou';
      if (auditEnabled) {
        try { await this.gateway.audit(event(result.status)); }
        catch { auditError = 'Não foi possível registrar o encerramento na auditoria. Exporte o resultado e informe a TI.'; }
      }
      return auditError ? { ...result, auditError } : result;
    } finally { this.running = false; }
  }
}

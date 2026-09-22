import * as React from 'react';
import * as XLSX from 'xlsx';
import { Checkbox, DefaultButton, Dropdown, IDropdownOption, MessageBar, MessageBarType, PrimaryButton, Spinner, SpinnerSize } from '@fluentui/react';
import styles from './Importador.module.scss';
import type { IImportadorProps } from './IImportadorProps';
import { ColumnDefinition, ImportProgressData, ImportResult, ListDefinition, ListReference, ParsedSheet, ValidationResult } from '../../../models';
import { ExcelParserService } from '../../../services/ExcelParserService';
import { ImportService } from '../../../services/ImportService';
import { mapTargets, ValidationService } from '../../../services/ValidationService';
import { message } from '../../../services/utils';
import { ListSearch } from './ListSearch';
import { ListSelector } from './ListSelector';
import { FileUploader } from './FileUploader';
import { ValidationDashboard } from './ValidationDashboard';
import { ErrorGrid } from './ErrorGrid';
import { ImportProgress } from './ImportProgress';
import { TemplateGenerator } from './TemplateGenerator';

interface State {
  busy: string; error: string; list?: ListDefinition; file?: File; book?: XLSX.WorkBook; sheet?: ParsedSheet;
  sheetName?: string; culture: 'pt-BR' | 'en-US'; mapping: Record<string, number>; validation?: ValidationResult;
  validationProgress?: number; importProgress?: ImportProgressData; importResult?: ImportResult; templateLoading: boolean; stop: boolean; validOnly: boolean;
}
export default class Importador extends React.Component<IImportadorProps, State> {
  private excel = new ExcelParserService();
  public state: State = { busy: '', error: '', culture: 'pt-BR', mapping: {}, templateLoading: false, stop: false, validOnly: false };

  private invalidate = (patch: Partial<State>): void => this.setState(previous => ({ ...previous, ...patch, validation: undefined, validationProgress: undefined, importResult: undefined, importProgress: undefined, validOnly: false }));
  private selectList = async (ref: ListReference): Promise<void> => {
    this.setState({ busy: 'Carregando estrutura da lista...', error: '' });
    try { this.setState({ list: await this.props.gateway.schema(ref), file: undefined, book: undefined, sheet: undefined, sheetName: undefined, mapping: {}, validation: undefined, importResult: undefined }); }
    catch (error) { this.setState({ error: message(error) }); } finally { this.setState({ busy: '' }); }
  };
  private changeContentType = async (id: string): Promise<void> => {
    if (!this.state.list) return; this.setState({ busy: 'Carregando o tipo de conteúdo...', error: '' });
    try { const list = await this.props.gateway.schema(this.state.list, id); this.setState({ list, mapping: {}, validation: undefined, importResult: undefined }); }
    catch (error) { this.setState({ error: message(error) }); } finally { this.setState({ busy: '' }); }
  };
  private openFile = async (file: File): Promise<void> => {
    this.setState({ busy: 'Lendo o arquivo...', error: '', file });
    try {
      const book = this.excel.read(await file.arrayBuffer(), file.name, this.props.configuration);
      const sheetName = book.SheetNames.indexOf('Dados') >= 0 ? 'Dados' : book.SheetNames[0];
      const sheet = this.excel.parse(book, sheetName, this.props.configuration);
      this.setState({ book, sheetName, sheet, mapping: {}, validation: undefined, importResult: undefined });
    } catch (error) { this.setState({ book: undefined, sheet: undefined, error: message(error) }); } finally { this.setState({ busy: '' }); }
  };
  private changeSheet = (sheetName: string): void => {
    if (!this.state.book) return;
    try { this.invalidate({ sheetName, sheet: this.excel.parse(this.state.book, sheetName, this.props.configuration), mapping: {}, error: '' }); }
    catch (error) { this.invalidate({ sheet: undefined, error: message(error) }); }
  };
  private validate = async (): Promise<void> => {
    const { list, sheet, mapping, culture } = this.state; if (!list || !sheet) return;
    this.setState({ busy: 'Validando o arquivo...', error: '', validationProgress: 0, validation: undefined, importResult: undefined });
    try { const service = new ValidationService(this.props.gateway, this.props.configuration); this.setState({ validation: await service.validate(sheet, list, { culture, mapping: {}, targetMapping: mapping }, percent => this.setState({ validationProgress: percent })), validOnly: false }); }
    catch (error) { this.setState({ error: message(error) }); } finally { this.setState({ busy: '', validationProgress: undefined }); }
  };
  private mapField = (field: ColumnDefinition, sourceIndex: number): void => {
    this.invalidate({ mapping: { ...this.state.mapping, [field.internalName]: sourceIndex } });
  };
  private template = async (): Promise<void> => {
    const list = this.state.list; if (!list) return; this.setState({ templateLoading: true, error: '' });
    try {
      const lookup: Record<string, { values: string[]; truncated: boolean }> = {};
      for (const field of list.columns.filter(c => c.kind.startsWith('Lookup') && !c.hidden && !c.readOnly)) lookup[field.internalName] = await this.props.gateway.lookupOptions(list, field, this.props.configuration.templateLookupLimit);
      this.excel.template(list, lookup);
    } catch (error) { this.setState({ error: message(error) }); } finally { this.setState({ templateLoading: false }); }
  };
  private import = async (): Promise<void> => {
    const { list, validation, file, validOnly } = this.state; if (!list || !validation || !file) return;
    this.setState({ busy: 'Importando...', error: '', stop: false, importResult: undefined });
    try { const service = new ImportService(this.props.gateway, this.props.configuration); const result = await service.run(list, validation, file.name, value => this.setState({ importProgress: value }), () => this.state.stop, validOnly); this.setState({ importResult: result }); }
    catch (error) { this.setState({ error: message(error) }); } finally { this.setState({ busy: '', importProgress: undefined }); }
  };
  public render(): React.ReactElement<IImportadorProps> {
    const s = this.state; const disabled = !!s.busy; const mapped = s.list && s.sheet ? mapTargets(s.sheet, s.list, { culture: s.culture, mapping: {}, targetMapping: s.mapping }) : [];
    const editableFields = (s.list?.columns || []).filter(c => !c.hidden && !c.readOnly);
    const sourceOptions: IDropdownOption[] = [{ key: -1, text: 'Não importar esta coluna' }, ...(s.sheet?.headers || []).map((header, index) => ({ key: index, text: header || `Coluna ${index + 1}` }))];
    const structuralErrors = !!s.validation?.errors.some(e => e.severity === 'error' && !e.line); const hasMixedRows = !!s.validation && s.validation.valid > 0 && s.validation.invalid > 0;
    const canImport = !!s.validation && !structuralErrors && !!s.list?.canAdd && (s.validOnly ? s.validation.valid > 0 : s.validation.valid === s.validation.total);
    const importCount = s.validation ? (s.validOnly ? s.validation.valid : s.validation.total) : 0;
    const importIssues = (s.importResult?.rows || []).filter(row => row.status !== 'imported');
    return <section className={styles.importador}>
      <header className={styles.hero}><div><span className={styles.eyebrow}>{this.props.environmentMessage}</span><h1>Importador Inteligente</h1><p>Olá, {this.props.userDisplayName}. Encontre uma lista, valide o Excel e importe os registros com suas permissões atuais.</p></div></header>
      {s.error && <MessageBar messageBarType={MessageBarType.error} onDismiss={() => this.setState({ error: '' })}>{s.error}</MessageBar>}
      {s.busy && s.busy !== 'Importando...' && <Spinner size={SpinnerSize.medium} label={s.validationProgress === undefined ? s.busy : `${s.busy} ${s.validationProgress}%`} />}
      {!s.list && <div className={styles.card}><span className={styles.eyebrow}>Etapa 1</span><h2>Escolha a lista de destino</h2><p>A pesquisa usa o índice do SharePoint e respeita suas permissões. Sites configurados ajudam quando uma lista ainda não foi indexada.</p><ListSearch disabled={disabled} onSearch={this.props.gateway.search.bind(this.props.gateway)} onSelect={this.selectList} /></div>}
      {s.list && <><ListSelector list={s.list} disabled={disabled} onClear={() => this.setState({ list: undefined, file: undefined, book: undefined, sheet: undefined, validation: undefined, importResult: undefined })} onContentType={this.changeContentType} />
        <div className={styles.actions}><TemplateGenerator disabled={disabled} loading={s.templateLoading} onDownload={this.template} /></div>
        <FileUploader config={this.props.configuration} disabled={disabled} sheets={s.book?.SheetNames || []} selectedSheet={s.sheetName} culture={s.culture} onFile={this.openFile} onSheet={this.changeSheet} onCulture={culture => this.invalidate({ culture })} />
      </>}
      {s.list && s.sheet && <div className={styles.card}><span className={styles.eyebrow}>Mapeamento</span><h2>Confirme as colunas</h2><p>Todas as colunas editáveis da lista aparecem abaixo. Escolha a coluna correspondente do Excel. A mesma coluna do Excel pode alimentar mais de um campo. Campos obrigatórios estão marcados com *.</p><div className={styles.mapping}>{editableFields.map(field => { const assignment = mapped.find(item => item.field.internalName === field.internalName); const explicitlySelected = Object.prototype.hasOwnProperty.call(s.mapping, field.internalName) ? s.mapping[field.internalName] : undefined; const sourceIndex = explicitlySelected !== undefined ? explicitlySelected : assignment?.sourceIndex; return <Dropdown key={field.internalName} label={`${field.header}${field.required ? ' *' : ''}`} options={sourceOptions} selectedKey={sourceIndex} placeholder="Selecione uma coluna do Excel" disabled={disabled} onChange={(_, option) => option && this.mapField(field, Number(option.key))} />; })}</div><PrimaryButton iconProps={{ iconName: 'CheckList' }} onClick={this.validate} disabled={disabled}>Validar arquivo</PrimaryButton></div>}
      {s.validation && <div className={styles.card}><span className={styles.eyebrow}>Validação concluída</span><h2>Resultado</h2><ValidationDashboard result={s.validation} />{hasMixedRows && !structuralErrors && <Checkbox className={styles.validOnly} label={`Importar somente as ${s.validation.valid.toLocaleString('pt-BR')} linhas válidas e ignorar ${s.validation.invalid.toLocaleString('pt-BR')} linhas inválidas`} checked={s.validOnly} disabled={disabled} onChange={(_, checked) => this.setState({ validOnly: !!checked })} />}{!!s.validation.errors.length && <ErrorGrid errors={s.validation.errors} />}<div className={styles.actions}>{!!s.validation.errors.length && <DefaultButton onClick={() => this.excel.exportErrors(s.validation!.errors)}>Exportar erros</DefaultButton>}<PrimaryButton iconProps={{ iconName: 'Upload' }} disabled={!canImport || disabled} onClick={this.import}>Importar {importCount.toLocaleString('pt-BR')} registros</PrimaryButton></div></div>}
      {s.importProgress && <div className={styles.card}><ImportProgress value={s.importProgress} /><DefaultButton onClick={() => this.setState({ stop: true })} disabled={s.stop}>Interromper após o lote atual</DefaultButton></div>}
      {s.importResult && <div className={styles.card}><MessageBar messageBarType={s.importResult.status === 'Importado' ? MessageBarType.success : MessageBarType.warning}>Status: {s.importResult.status}. {s.importResult.imported} importados, {s.importResult.failed} falhas, {s.importResult.unknown} sem confirmação e {s.importResult.skipped} linhas inválidas ignoradas.</MessageBar>{s.importResult.auditError && <MessageBar messageBarType={MessageBarType.error}>{s.importResult.auditError}</MessageBar>}{!!importIssues.length && <div className={styles.importLog}><h3>Log de erros da importação</h3><div><table><thead><tr><th>Linha</th><th>Status</th><th>HTTP</th><th>Mensagem</th></tr></thead><tbody>{importIssues.slice(0, 50).map(row => <tr key={row.line}><td>{row.line}</td><td>{{ failed: 'Falhou', unknown: 'Sem confirmação', pending: 'Não enviado', imported: 'Importado' }[row.status]}</td><td>{row.httpStatus || '—'}</td><td>{row.message || 'Sem mensagem do servidor.'}</td></tr>)}</tbody></table></div>{importIssues.length > 50 && <p>Mostrando 50 de {importIssues.length.toLocaleString('pt-BR')} ocorrências. Exporte o resultado para consultar todas.</p>}</div>}<DefaultButton onClick={() => this.excel.exportImport(s.importResult!)}>Exportar resultado</DefaultButton></div>}
      <footer>O SharePoint confirma permissões e regras no momento da gravação. Mantenha esta tela aberta durante a importação.</footer>
    </section>;
  }
}

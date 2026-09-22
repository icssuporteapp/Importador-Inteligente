import * as React from 'react';
import { Dropdown, IDropdownOption, MessageBar, MessageBarType, Toggle } from '@fluentui/react';
import { AppConfiguration } from '../../../models';
import styles from './Importador.module.scss';
export interface FileUploaderProps { config: AppConfiguration; disabled: boolean; sheets: string[]; selectedSheet?: string; culture: 'pt-BR' | 'en-US'; onFile(file: File): void; onSheet(name: string): void; onCulture(value: 'pt-BR' | 'en-US'): void; error?: string; }
export const FileUploader: React.FC<FileUploaderProps> = props => {
  const options: IDropdownOption[] = props.sheets.map(name => ({ key: name, text: name }));
  return <div className={styles.card}><span className={styles.eyebrow}>Arquivo</span><h2>Selecione a planilha</h2>
    <label className={styles.file}><span>Arquivo XLSX ou XLS</span><input type="file" accept=".xlsx,.xls" disabled={props.disabled} onChange={e => e.target.files?.[0] && props.onFile(e.target.files[0])} /><small>Até {props.config.maxFileMb} MB, {props.config.maxRows.toLocaleString('pt-BR')} linhas e {props.config.maxColumns} colunas.</small></label>
    {props.error && <MessageBar messageBarType={MessageBarType.error}>{props.error}</MessageBar>}
    {!!options.length && <div className={styles.inline}><Dropdown label="Aba" options={options} selectedKey={props.selectedSheet} onChange={(_, option) => option && props.onSheet(String(option.key))} disabled={props.disabled} /><Toggle label="Formato regional" onText="Brasileiro" offText="Internacional" checked={props.culture === 'pt-BR'} onChange={(_, checked) => props.onCulture(checked ? 'pt-BR' : 'en-US')} disabled={props.disabled} /></div>}
  </div>;
};

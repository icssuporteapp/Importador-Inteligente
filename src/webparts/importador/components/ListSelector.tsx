import * as React from 'react';
import { DefaultButton, DetailsList, DetailsListLayoutMode, Dropdown, IDropdownOption, MessageBar, MessageBarType, SelectionMode } from '@fluentui/react';
import { ListDefinition } from '../../../models';
import styles from './Importador.module.scss';
export interface ListSelectorProps { list: ListDefinition; disabled: boolean; onClear(): void; onContentType(id: string): void; }
export const ListSelector: React.FC<ListSelectorProps> = ({ list, disabled, onClear, onContentType }) => {
  const options: IDropdownOption[] = list.contentTypes.map(type => ({ key: type.id, text: type.name }));
  return <div className={styles.card}>
    <div className={styles.cardHeader}><div><span className={styles.eyebrow}>Lista selecionada</span><h2>{list.title}</h2><p>{list.siteTitle || list.siteUrl}</p></div><DefaultButton onClick={onClear} disabled={disabled}>Trocar lista</DefaultButton></div>
    {!list.canAdd && <MessageBar messageBarType={MessageBarType.error}>Você pode visualizar esta lista, mas não possui permissão para adicionar itens.</MessageBar>}
    {options.length > 1 && <Dropdown label="Tipo de conteúdo" options={options} selectedKey={list.contentTypeId} onChange={(_, option) => option && onContentType(String(option.key))} disabled={disabled} />}
    <DetailsList compact items={list.columns.filter(c => !c.hidden && !c.readOnly).map(c => ({ nome: c.header, tipo: c.nativeType, obrigatorio: c.required ? 'Sim' : 'Não', suporte: c.kind === 'Unsupported' ? 'Parcial' : 'Completo' }))} columns={[{ key: 'nome', name: 'Coluna', fieldName: 'nome', minWidth: 130, isResizable: true }, { key: 'tipo', name: 'Tipo', fieldName: 'tipo', minWidth: 90 }, { key: 'obrigatorio', name: 'Obrigatório', fieldName: 'obrigatorio', minWidth: 70 }, { key: 'suporte', name: 'Suporte', fieldName: 'suporte', minWidth: 70 }]} selectionMode={SelectionMode.none} layoutMode={DetailsListLayoutMode.justified} />
  </div>;
};

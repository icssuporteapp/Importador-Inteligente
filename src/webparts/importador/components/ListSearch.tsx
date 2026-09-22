import * as React from 'react';
import { DefaultButton, MessageBar, MessageBarType, PrimaryButton, SearchBox, Spinner, SpinnerSize } from '@fluentui/react';
import { ListReference, SearchResult } from '../../../models';
import styles from './Importador.module.scss';

export interface ListSearchProps { disabled: boolean; onSearch(query: string): Promise<SearchResult>; onSelect(list: ListReference): void; }
export const ListSearch: React.FC<ListSearchProps> = ({ disabled, onSearch, onSelect }) => {
  const [open, setOpen] = React.useState(false); const [query, setQuery] = React.useState(''); const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<SearchResult>(); const [error, setError] = React.useState('');
  const run = async (): Promise<void> => { setLoading(true); setError(''); try { setResult(await onSearch(query)); } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao pesquisar listas.'); } finally { setLoading(false); } };
  if (!open) return <PrimaryButton iconProps={{ iconName: 'Search' }} disabled={disabled} onClick={() => setOpen(true)}>Pesquisar lista</PrimaryButton>;
  return <div className={styles.searchPanel}>
    <div className={styles.inline}><SearchBox labelText="Nome da lista" placeholder="Exemplo: Projet" value={query} disabled={disabled || loading} onChange={(_, value) => setQuery(value || '')} onSearch={run} onClear={() => setResult(undefined)} /><PrimaryButton onClick={run} disabled={disabled || loading || query.trim().length < 2}>Pesquisar</PrimaryButton></div>
    {loading && <Spinner size={SpinnerSize.small} label="Pesquisando listas permitidas..." />}
    {error && <MessageBar messageBarType={MessageBarType.error}>{error}</MessageBar>}
    {result?.warnings.map((warning, index) => <MessageBar key={index} messageBarType={MessageBarType.warning}>{warning}</MessageBar>)}
    {result && !result.lists.length && <MessageBar>Nenhuma lista encontrada. Tente outro nome ou solicite à TI a inclusão do site.</MessageBar>}
    {!!result?.lists.length && <div className={styles.resultList} role="list" aria-label="Listas encontradas">{result.lists.map(list => <DefaultButton key={`${list.siteUrl}|${list.id}`} className={styles.resultButton} onClick={() => onSelect(list)} disabled={disabled}><strong>{list.title}</strong><span>{list.siteTitle || new URL(list.siteUrl).pathname}</span></DefaultButton>)}</div>}
  </div>;
};

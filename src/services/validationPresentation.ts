import { ValidationError } from '../models';

export const validationLocation = (error: ValidationError): string => error.line ? `Linha ${error.line}` : error.column ? 'Cabeçalho / mapeamento' : 'Arquivo';

export const validationAction = (error: ValidationError): string => {
  const text = error.message.toLocaleLowerCase();
  if (text.includes('não mapeada; será ignorada') || text.includes('não mapeadas serão ignoradas')) return 'Associe essas colunas somente se quiser importar seu conteúdo; caso contrário, nenhuma ação é necessária.';
  if (text.includes('coluna obrigatória')) return 'Associe uma coluna do Excel a este campo obrigatório e preencha os valores que faltarem.';
  if (text.includes('duas colunas')) return 'Mantenha somente uma coluna do Excel associada a este campo.';
  if (text.includes('cabeçalho duplicado')) return 'Renomeie um dos cabeçalhos para que cada coluna tenha um nome distinto.';
  if (text.includes('cabeçalho vazio')) return 'Preencha ou remova o cabeçalho vazio no Excel.';
  if (text.includes('ordem das colunas')) return 'Nenhuma correção é necessária se o mapeamento exibido estiver correto.';
  if (text.includes('sharepoint validará')) return 'Nenhuma correção no arquivo; esta confirmação ocorrerá durante a importação.';
  if (text.includes('permissão para adicionar')) return 'Solicite permissão para adicionar itens à lista de destino.';
  if (text.includes('suporte parcial')) return 'Deixe este campo sem mapeamento ou ajuste a lista para um tipo compatível.';
  if (text.includes('campo obrigatório')) return 'Preencha esta célula na linha indicada.';
  if (text.includes('valor duplicado')) return 'Altere ou remova o valor repetido na linha indicada.';
  return error.line ? 'Corrija a célula da linha indicada e valide o arquivo novamente.' : 'Revise o cabeçalho ou o mapeamento indicado e valide novamente.';
};

export const validationErrorRows = (errors: ValidationError[]): (string | number)[][] => [
  ['Local', 'Linha do Excel', 'Coluna / cabeçalho', 'Valor', 'Problema', 'Como corrigir', 'Severidade'],
  ...errors.map(error => [
    validationLocation(error), error.line || '', error.column || 'Arquivo', String(error.value), error.message,
    validationAction(error), error.severity === 'error' ? 'Erro' : 'Aviso'
  ])
];

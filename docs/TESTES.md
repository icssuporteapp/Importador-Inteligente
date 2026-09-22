# Evidências de teste

Data da execução local: 12 de setembro de 2026. Confirmação funcional no tenant: 13 de setembro de 2026.

## Resultado

- TypeScript: aprovado com `tsc --noEmit`.
- Testes automatizados: 32 aprovados, nenhuma falha na rodada final.
- Compilação SPFx de produção: aprovada.
- Empacotamento: aprovado; `sharepoint/solution/importador-spfx.sppkg` gerado.
- Versão do pacote para atualização no Catálogo de Aplicativos: `1.0.0.10`.
- SHA-256 do pacote final: `9E386488430066E0482725023C26DDCD0D32D9062908CC706BD06A8F5F32FEFF`.
- Exemplos Excel: conteúdo inspecionado, fórmulas examinadas e as três abas revisadas visualmente.
- Importação funcional da versão `1.0.0.10` no tenant: confirmada pelo solicitante.

Os testes automatizados cobrem culturas numéricas, booleanos, datas ambíguas, data serial de 1900, normalização da hora técnica de campos somente data exportados pelo SharePoint, resposta OData compatível das funções clássicas de fuso, formatos simples, aninhados e legados de datas retornadas pelo SharePoint, cabeçalhos duplicados, fórmulas, validação de Choice e Pessoa, resolução inequívoca do nome visível exportado pelo SharePoint, rejeição de nomes ambíguos, payload SharePoint, correlação de Content-ID, resposta de lote incompleta, alteração de schema, bloqueio de repetição automática de resultado incerto, localização de uma lista quando a pesquisa retorna apenas o campo `Path`, remoção explícita de um mapeamento automático, campos extras ignorados sem invalidar registros, supressão de avisos para colunas somente leitura da própria lista, preferência por campos editáveis em títulos repetidos, reutilização de uma coluna de origem em vários campos de destino, importação exclusiva das linhas válidas, bloqueio dessa opção diante de erro estrutural e localização acionável no relatório de erros.

## Limitações das evidências

A compilação registrou avisos de lint sobre tipos dinâmicos de respostas REST e o uso de `null` para representar células vazias do Excel. Não houve erro de compilação. Esses avisos não alteram o pacote, mas devem ser revisitados em uma manutenção de tipagem.

A importação funcional foi confirmada no tenant, mas o detalhamento dos cenários executados não está anexado ao repositório. Continuam dependentes de evidência específica: SharePoint Search, matrizes de segurança por usuário, acesso entre sites, multi-geo, tipos de conteúdo variados, grupos restritos, lookups paginados, throttling 429/503, falhas parciais reais, auditoria e experiência dentro do Teams.

O objetivo de 10.000 linhas e 100 colunas é uma meta de projeto. Ainda não há medição representativa no Teams e não deve ser apresentado como desempenho homologado.

## Arquivo de exemplo

`outputs/01a09326-1a9d-7ff0-802f-9ec211ad8a52/Exemplos Importador Inteligente.xlsx` contém abas de dados válidos e inválidos e instruções. Todos os nomes, e-mails e IDs são fictícios.

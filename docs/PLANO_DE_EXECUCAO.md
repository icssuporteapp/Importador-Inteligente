# Plano de implementação e validação

## Objetivo

Construir o aplicativo descrito no prompt revisado em Markdown, que já incorpora as delimitações da análise prévia. O solicitante delegou a escolha técnica e a plataforma definida é SPFx com React e TypeScript. A implementação local, os testes e o pacote de produção foram concluídos. Publicação e homologação no tenant permanecem sob responsabilidade do solicitante.

## Sequência de execução

1. [Concluído] Preparar Node 22 isolado, selecionar versão SPFx da matriz oficial e fixar dependências compatíveis. Verificar origem e versão mantida de SheetJS antes da instalação.
2. [Concluído] Gerar projeto SPFx com React, TypeScript, Fluent UI e suporte a guia do Teams. Validar compilação do projeto base.
3. [Concluído] Criar modelos ListDefinition, ColumnDefinition, ValidationError, ValidationResult e ImportResult, com contratos explícitos para tipos não suportados e resultados parciais.
4. [Concluído] Implementar SearchService e SharePointSchemaService, incluindo permissões, paginação, schema e cache de referências.
5. [Concluído] Implementar ExcelParserService e ValidationService com preservação dos cabeçalhos originais para detectar duplicações, conversões explícitas e mensagens em português.
6. [Concluído] Implementar ListSearch, ListSelector, TemplateGenerator, FileUploader, ValidationDashboard e ErrorGrid; permitir exportação de erros.
7. [Concluído] Implementar ImportService, AuditService e ImportProgress com lotes, contagem por resposta, falhas parciais e proteção contra reenvio acidental.
8. [Concluído] Executar testes locais, compilação de produção e empacotamento. Documentar comandos realmente utilizados.
9. [Pendente no tenant] Homologar no SharePoint e Teams com dados de teste e perfis distintos. Registrar evidências e limitações.
10. [Concluído localmente] Disponibilizar pacote e guias para publicação pelo solicitante. Para SPFx, usar SharePoint App Catalog e Teams; pacote SPFx não é pacote Power Apps. A permissão declarada no Power Apps não deve ser presumida como permissão nesses catálogos.

## Validação exigida

| Área | Cenários essenciais |
| --- | --- |
| Estrutura | Colunas ausentes, desconhecidas, duplicadas, fora de ordem, títulos ambíguos e arquivo vazio |
| Valores | Obrigatórios, texto longo, números, moeda, booleanos, datas inválidas e ambíguas, Choice e MultiChoice |
| Referências | Pessoa inexistente, acesso negado, lookup duplicado, múltiplos valores, fontes paginadas |
| Schema | Campo calculado, somente leitura, metadado gerenciado e mudança após validação |
| Permissões | Leitura, inclusão, sem acesso, auditoria indisponível e mudança de permissão |
| Importação | Sucesso, falha parcial, limitação de requisições, desconexão e clique duplo |
| Volume | Até 10.000 linhas e 100 colunas, medindo tempo, memória e resposta da interface |
| Integração | Contexto autenticado no Teams, pesquisa real, gravação e auditoria sem login extra |

Os testes devem distinguir resultados simulados de evidências obtidas no tenant. Compilar não comprova integração.

## Documentação a entregar com o código

- README com situação, arquitetura, comandos verificados e limitações.
- Guia de instalação com versões, dependências, configuração e desenvolvimento local.
- Guia de publicação com geração de pacote, App Catalog, Teams, auditoria e reversão da versão do aplicativo.
- Guia de uso com pesquisa, template opcional, validação, correção, exportação e importação.
- Exemplos de planilhas válidas e inválidas com dados fictícios.
- Matriz de tipos de campo suportados e regras de conversão.
- Registro de decisões técnicas e evidências de testes.

## Critério de conclusão

Código e pacote de produção compilados com dependências fixadas; validações verificadas; documentação coerente com o comportamento entregue. Publicação e homologação corporativa devem ter status próprio e só podem ser marcadas como concluídas após execução real.

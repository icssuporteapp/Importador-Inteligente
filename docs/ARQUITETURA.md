# Arquitetura e segurança

## Fluxo funcional

1. A web part pesquisa listas nos sites permitidos e lê o schema da lista e do tipo de conteúdo selecionados.
2. O arquivo Excel é processado no navegador. Cabeçalhos e valores são mantidos em memória para mapeamento e validação.
3. Pessoas, grupos e lookups distintos são resolvidos antes da validação das linhas, evitando uma consulta por registro.
4. A importação revalida o schema e envia os itens em lotes. Cada resposta é correlacionada ao item pelo `Content-ID`.
5. O resultado e os eventos são registrados na lista de auditoria configurada.

## Componentes

- `src/webparts/importador`: interface React, propriedades administrativas e integração com o contexto SPFx.
- `src/services/ExcelParserService.ts`: leitura de planilhas e preservação dos cabeçalhos físicos.
- `src/services/ValidationService.ts`: conversões e regras estruturais e por linha.
- `src/services/SharePointGateway.ts`: composição dos serviços reais do SharePoint.
- `src/services/DemoGateway.ts`: dados inteiramente locais para demonstração visível.
- `src/services/BatchTransport.ts`: transporte de lotes e identificação de resultados incertos.
- `src/services/ImportService.ts`: coordenação, revalidação do schema, progresso e auditoria.

## Fronteiras de segurança

- A solução usa a identidade já autenticada no SharePoint ou Teams e não armazena credenciais.
- As operações continuam sujeitas às permissões do usuário em cada lista.
- Os sites acessíveis são restringidos pela configuração administrativa da web part.
- O arquivo Excel não é enviado a um serviço externo pela aplicação.
- Resultados sem confirmação do SharePoint são marcados como incertos e não são reenviados automaticamente, evitando duplicidades.
- O modo de demonstração é indicado na tela e usa somente dados fictícios em memória.

## Limites

A solução foi compilada e testada localmente. Pesquisa entre sites, multi-geo, políticas corporativas, tipos de conteúdo personalizados e comportamento do Teams precisam ser homologados no tenant de destino.

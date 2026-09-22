# Guia de publicação no SharePoint e Teams

## Estado da publicação

A tentativa com `ics.consultorti@climaesociedade.org` confirmou acesso de leitura ao App Catalog, porém sem permissão de upload; o SharePoint Admin Center também negou acesso. Um administrador deve conceder à conta permissão para adicionar arquivos na biblioteca **Apps for SharePoint** do App Catalog, ou realizar o upload do pacote em nome do solicitante.

## Antes de publicar

1. Confirme que `./scripts/npm.ps1 test` e `./scripts/npm.ps1 run build` passam na versão entregue.
2. Não é necessário configurar uma lista auxiliar para importar. O SharePoint registra autoria e data nos próprios itens criados.
3. Opcionalmente, para auditoria central por execução, execute `./provision/Provision-AuditList.ps1 -SiteUrl https://SEU-TENANT.sharepoint.com/sites/importador` e conceda aos usuários permissão para adicionar eventos à lista `ImportacoesSharePoint`.
4. Defina os sites adicionais de descoberta. O site onde a web part é executada já é pesquisado automaticamente.

## Publicação

1. Abra o App Catalog do SharePoint e carregue `sharepoint/solution/importador-spfx.sppkg`.
2. Analise o nome, a versão e o escopo. O pacote não solicita permissões adicionais de API no Entra ID.
3. Habilite a solução conforme a política do tenant. O pacote foi configurado para implantação em todo o tenant, mas essa escolha continua sob controle do administrador.
4. Selecione a solução e use **Sincronizar com o Teams**. A web part declara suporte a SharePoint, guia do Teams, aplicativo pessoal e página inteira.
5. Adicione o aplicativo em um grupo piloto. As propriedades de sites adicionais, auditoria central e limites são opcionais.

O pacote SPFx não é publicado no Power Apps. A publicação será feita pelo solicitante no SharePoint e no Teams.

## Homologação

Teste com uma conta que tenha leitura e inclusão, outra somente com leitura e outra sem acesso. Use listas fictícias com Choice, data, pessoa e lookup. Confirme pesquisa, download do template, validação, gravação e auditoria. Execute também um teste com lista não indexada dentro de um site configurado.

## Reversão

Conserve o pacote anterior. Se a versão nova falhar, remova ou desabilite a versão no App Catalog e restaure o pacote anterior conforme o processo institucional. A reversão do aplicativo não remove itens já importados nem eventos de auditoria.

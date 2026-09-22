# Revisão do prompt

## Resultado

O arquivo `Prompt/Prompt_Importador Inteligente de Listas SharePoint.md` é a versão consolidada para orientar o desenvolvimento. O Word original foi mantido intacto, conforme solicitado. O aplicativo ainda não foi implementado.

O objetivo permanece: pesquisar uma lista, validar Excel, corrigir problemas e importar pelo Teams com as permissões do usuário. A revisão transforma garantias absolutas em regras verificáveis e separa configurações da TI da experiência de uso.

## O que mudou e por quê

| Requisito original | Regra revisada | Benefício |
| --- | --- | --- |
| Nenhuma configuração especial | Sem login próprio ou permissões adicionais de API; implantação e configuração inicial pela TI permitidas | Mantém simplicidade para o usuário e permite instalar o produto |
| Pesquisa de qualquer lista apenas por Search | Search combinado com enumeração de sites configurados, sem cadastrar cada lista | Amplia descoberta inclusive de listas não indexadas nesses sites |
| Aderência total antes de gravar | Validação local explícita, rechecagem do schema e tratamento das regras do servidor | Evita prometer sucesso quando permissões ou dados podem mudar |
| Datas brasileiras e americanas automaticamente | Formato brasileiro padrão, americano por escolha e ISO aceito | Elimina interpretação silenciosa de datas ambíguas |
| Carregar pessoas e lookups uma única vez | Resolver valores distintos, paginar e usar cache por contexto | Evita consulta por linha e carga irrestrita do diretório |
| Criar auditoria pelo aplicativo | Provisionamento pela TI e eventos de auditoria com permissão de inclusão | Usuários não precisam administrar listas |
| Importar em lote | Verificar resposta por item, tratar falhas parciais e resultados desconhecidos | Evita falso sucesso e reenvio que duplica registros |
| Qualquer campo | Matriz de suporte e bloqueio seletivo de dados não suportados | Preserva conteúdo sem esconder limitações |
| Ordem idêntica à lista | Visualização padrão e demais campos elegíveis | Resolve a existência de diferentes ordens de visualização |
| Até 10.000 linhas | Meta preservada com 100 colunas, limite de arquivo e medição real | Dá um critério de teste e evita travamento silencioso |
| Código pronto para publicação | Compilação e pacote com evidências; homologação e publicação em etapas distintas | Permite entrega local sem depender prematuramente do tenant |

## Decisões adotadas

O padrão é inserir novos itens, sem atualização, exclusão ou anexos. O formato numérico e de datas é brasileiro, alterável antes de validar. A auditoria usa o site da solução por padrão, com opção de centralização. Os limites iniciais são configuráveis: 10.000 linhas, 100 colunas, 20 MB e até 5.000 opções por lookup no template, com aviso de truncagem. Consultas de validação não ficam restritas às opções exportadas no template.

Fórmulas em células devem ser convertidas em valores pelo usuário antes da importação. Tipos não suportados não impedem abrir a lista, mas conteúdo preenchido ou obrigatório nesses campos gera bloqueio para evitar perda de dados.

## Publicação pelo solicitante

O solicitante informou que poderá publicar e possui permissão no Power Apps. Isso foi registrado. A arquitetura original SPFx produz um pacote para SharePoint e Teams, portanto essa permissão não deve ser tratada como confirmação de acesso ao App Catalog.

Posteriormente, o solicitante delegou a escolha da opção executável. Foi escolhido SPFx com React e TypeScript, mantendo o objetivo e a arquitetura original. A escolha permite desenvolver parsing, validação, componentes, serviços e testes locais e preparar o pacote para SharePoint e Teams. Não há pendência de confirmação de plataforma; Power Apps fica fora do escopo.

A escolha não comprova compilação nem acesso ao tenant. A preparação do runtime compatível, instalação de dependências e geração do pacote ainda serão verificadas na implementação. A publicação será realizada pelo solicitante com o guia entregue e os acessos correspondentes.

## Dependências que permanecem

Nenhum texto elimina a necessidade de acesso de homologação, publicação autorizada e permissões de gravação nas listas. Essas dependências devem ser resolvidas na etapa correspondente. Não são motivo para deixar parsing, validação, componentes e documentação sem desenvolvimento quando a plataforma já estiver definida.

A revisão não comprova que os sites ou catálogos estão acessíveis. A capacidade de 10.000 linhas também permanece uma meta até ser medida. O relatório de implementação deverá distinguir claramente o que foi criado, compilado, testado em simulação, homologado e publicado.

## Referências

- [Compatibilidade SPFx](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/compatibility)
- [Implantação SPFx no Teams](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/integrate-with-teams-introduction)
- [Lotes REST e ausência de transação global](https://learn.microsoft.com/en-us/sharepoint/dev/sp-add-ins/make-batch-requests-with-the-rest-apis)

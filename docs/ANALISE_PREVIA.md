# Análise prévia do Importador Inteligente de Listas SharePoint

Data da análise: 11 de setembro de 2026.

Nota posterior: esta análise retrata o prompt original. A versão revisada em Markdown incorpora os encaminhamentos e passa a ser a referência de desenvolvimento. Consulte `REVISAO_DO_PROMPT.md` para decisões e dependências ainda aplicáveis. O Word original não foi alterado.

## Conclusão

A arquitetura solicitada é viável. Entretanto, não é possível garantir literalmente importação em qualquer lista, descoberta universal por pesquisa e aderência total ao schema apenas com validação local. Há limitações de indexação, tipos de campo, regras do servidor e permissões. Essas limitações precisam ser tratadas explicitamente no produto.

Esta etapa compreende leitura integral do texto do prompt, inspeção da pasta e do ambiente de ferramentas e consulta à documentação Microsoft. Não foram acessados sites corporativos, alteradas listas, instaladas dependências ou executados testes de integração.

## Evidências locais

- A pasta continha somente o arquivo Word do prompt; não havia código, manifesto de dependências, configuração SPFx ou documentação.
- Nenhum AGENTS.md foi encontrado na pasta nem em seus diretórios ancestrais.
- Node.js acessível: v24.19.0, fornecido pelo ambiente do Codex.
- npm, Yeoman, Heft e Gulp não foram localizados no PATH. Isso não comprova ausência de outras instalações no computador.
- Git está disponível. O runtime inclui pnpm, mas ainda não foi configurada uma cadeia de compilação para este projeto.
- O prompt não informa tenant, site de homologação, destino da auditoria, App Catalog ou responsáveis pela publicação. Acesso a esses recursos não foi verificado.

## Impedimentos e dependências

| Ponto | Efeito | Encaminhamento |
| --- | --- | --- |
| Ambiente de compilação | Node 24 encontrado não corresponde ao Node 22 da matriz consultada para SPFx 1.23.2 e 1.22.x | Preparar Node 22 isolado, gerenciador de pacotes e dependências compatíveis; fixar versões antes de compilar |
| Homologação corporativa | Sem site e contas de teste não há como comprovar autenticação, permissões, busca e gravação reais | Disponibilizar site de homologação e perfis com leitura, inclusão e acesso negado |
| Publicação no Teams | Uso sem login adicional não elimina a implantação administrativa | Confirmar App Catalog e política de aplicativos Teams; publicação por responsável autorizado |
| Lista de auditoria | Poder incluir itens no destino não implica poder criar listas nem gravar em outro site | Provisionar ImportacoesSharePoint durante implantação e definir permissões de inclusão |
| Pesquisa universal | Listas não indexadas ou excluídas da pesquisa podem não aparecer | Delimitar pesquisa às listas localizáveis; avaliar catálogo de sites configurado administrativamente sem exigir URL do usuário final |
| Qualquer schema | Metadados gerenciados têm suporte futuro e outros tipos/regras não estão especificados | Definir matriz de suporte e impedir descarte silencioso de dados não suportados |

As dependências de tenant impedem homologação e publicação, mas não impedem desenvolvimento local. A incompatibilidade de runtime é corrigível. Os conflitos de requisitos impedem prometer conformidade integral sem as delimitações abaixo.

## Decisões técnicas propostas

As decisões desta seção são recomendações para implementação, não comportamentos já construídos ou homologados.

### Autenticação e permissões

Usar o contexto SPFx e APIs SharePoint com a identidade atual, sem credenciais próprias ou permissões de aplicação. Verificar permissão de inclusão antes de habilitar importação e tratar negativa do servidor durante o processamento. Validar separadamente acesso à lista, fontes de lookup e auditoria. Aprovação de publicação é distinta de consentimento adicional no Entra ID.

### Descoberta de listas

Usar pesquisa nativa com resultados sujeitos às permissões e à indexação. O exemplo Projet pode ser tratado como busca por prefixo; trecho arbitrário no meio do nome não deve ser prometido sem prova específica. Validar a lista selecionada diretamente antes de carregar o schema, pois os resultados podem estar desatualizados.

### Schema e template

Trabalhar com campos editáveis; excluir campos internos, calculados e somente leitura da entrada. Definir a ordem pela visualização padrão, seguida pelos demais campos editáveis, porque diferentes visualizações podem ter ordens distintas. Identificar internamente por InternalName e tratar títulos duplicados como ambiguidade explícita.

Considerar tipos de conteúdo, valores padrão, limites de texto, precisão numérica, unicidade, validações de coluna e de lista. A validação local antecipa erros, mas o servidor continua sendo a autoridade: regras e dados podem mudar entre validação e gravação.

Managed Metadata deve permitir carregar a lista com aviso. Campo não suportado preenchido ou obrigatório sem alternativa válida deve bloquear a importação, evitando perda de conteúdo.

### Datas e números

03/04/2026 pode significar 3 de abril ou 4 de março. Usar configuração explícita de formato com padrão brasileiro, aceitar ISO e não adivinhar datas ambíguas. Distinguir data sem horário de data e hora e considerar fuso do site. Tratar datas seriais do Excel e sistemas 1900/1904. Definir separadores decimais e de milhar sem conversões silenciosas.

### Pessoas e lookups

Resolver apenas valores distintos do arquivo, com cache por site e campo, antes de validar as linhas em memória. Uma etapa de carga pode exigir diversas páginas/requisições; não equivale necessariamente a uma chamada única. Não pressupor que seja possível carregar todo o diretório corporativo com permissões comuns.

Preferir e-mail ou identificador inequívoco para pessoas. Distinguir usuário não encontrado de acesso negado ou falha de consulta. Definir suporte a grupos e múltiplos valores. Lookups devem aceitar identificação inequívoca; títulos repetidos exigem ID ou desambiguação. Fontes grandes precisam de paginação e limites; não anunciar cache completo se parte dos resultados não foi carregada.

### Importação e falhas

Tratar inserção de novos itens como comportamento inicial; atualização e exclusão não foram solicitadas. Enviar lotes com concorrência limitada e verificar cada resposta. Prever sucesso parcial, respostas 429/503, espera indicada pelo servidor e resultado desconhecido em falha de conexão. Não reenviar cegamente operações cujo resultado seja desconhecido, para evitar duplicações.

Invalidar a validação quando arquivo ou lista mudar. Revalidar schema e permissões antes de gravar. Impedir clique duplo. Progresso deve contar resultados confirmados e apresentar tempo restante como estimativa.

### Auditoria

Definir site de armazenamento e provisionar a lista com identidade autorizada. Registrar identificador da execução, data, usuário, destino, arquivo, contagens e status, incluindo sucesso parcial. Proposta: impedir início da gravação quando o registro inicial de auditoria falhar. Uma falha de auditoria posterior a inserções deve ser comunicada sem alegar rollback ou repetir os itens já importados.

### Desempenho e experiência

10.000 linhas por 100 colunas equivalem a até um milhão de células. Adotar limite de tamanho de arquivo além do limite de linhas, processamento que não congele a interface e grade paginada ou virtualizada. Comprovar o objetivo no Teams com massa representativa; não declarar capacidade validada sem medição.

## Informações necessárias para homologação

1. URL de um site SharePoint de teste e listas representativas.
2. Site destinado à lista ImportacoesSharePoint e responsável pelo provisionamento.
3. Responsável pelo App Catalog e pela disponibilização do aplicativo no Teams.
4. Contas/perfis para testar leitura, inclusão e acesso negado.

Essas configurações são de implantação. A interface destinada ao usuário final pode continuar sem exigir conhecimento de URLs ou nomes técnicos.

## Referências consultadas

- [Compatibilidade SPFx, Node, TypeScript e React](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/compatibility) — a tabela consultada inclui SPFx 1.23.2 com Node 22 e React 17.0.1; não assumir versões independentes da matriz.
- [Configuração do ambiente SPFx](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/set-up-your-development-environment) — ferramentas e preparação do desenvolvimento.
- [Integração do SPFx com Teams](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/integrate-with-teams-introduction) — implantação e contexto da guia.
- [Search REST API](https://learn.microsoft.com/en-us/sharepoint/dev/general-development/sharepoint-search-rest-api-overview) — mecanismo de consulta.
- [Disponibilidade de conteúdo na pesquisa](https://support.microsoft.com/en-US/SharePoint/enable-content-to-be-searchable) — permissões e configuração de indexação.
- [Níveis de permissão no SharePoint Online](https://learn.microsoft.com/en-us/sharepoint/understanding-permission-levels) — diferenças entre operações autorizadas.
- [Limitação de requisições no SharePoint Online](https://learn.microsoft.com/en-us/sharepoint/dev/general-development/how-to-avoid-getting-throttled-or-blocked-in-sharepoint-online) — processamento e tratamento de throttling.

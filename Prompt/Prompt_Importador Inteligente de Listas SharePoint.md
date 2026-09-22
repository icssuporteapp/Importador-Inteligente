# Importador Inteligente de Listas SharePoint

Especificação de implementação revisada em Markdown — versão 2

Este arquivo consolida os requisitos executáveis e substitui o Word original como referência para desenvolvimento. O Word permanece preservado como histórico. A arquitetura escolhida é SPFx, com React e TypeScript. O solicitante delegou a escolha técnica; a decisão está concluída e não requer nova confirmação de plataforma.

## Objetivo e experiência

Desenvolver uma solução corporativa em SharePoint Framework, React e TypeScript, executada no Microsoft Teams, para pesquisar listas SharePoint Online, validar arquivos Excel e importar novos itens com segurança, usando a identidade e as permissões do usuário autenticado no Microsoft 365.

Manter o fluxo: abrir o aplicativo no Teams, clicar em Pesquisar Lista, digitar parte do nome, selecionar a lista, baixar template opcionalmente, validar o arquivo, corrigir erros e importar. Todas as mensagens devem estar em português. O usuário final não deverá informar URL de site, nome técnico de lista, credenciais ou estrutura interna do SharePoint.

A interface deverá usar Fluent UI, ser responsiva, acessível por teclado e apresentar estados de carregamento, resultado vazio, falta de permissão e falha temporária. O aplicativo deverá funcionar como guia do Teams e web part SharePoint; disponibilização como aplicativo pessoal poderá ser configurada quando homologada.

## Escopo e integridade

Permitir importação em listas de itens SharePoint acessíveis ao usuário e compatíveis com a matriz de campos desta especificação, inclusive em outros sites do mesmo tenant suportados pelo contexto autenticado. A descoberta deverá combinar pesquisa nativa e enumeração dos sites configurados pela TI. Não exigir que cada lista de destino seja cadastrada individualmente.

O escopo inicial é inclusão de novos itens. Atualização, exclusão, anexos, bibliotecas de documentos, listas externas e tipos especializados sem adaptador ficam fora do escopo inicial e devem ser identificados claramente. Não ignorar silenciosamente colunas nem converter valores de forma ambígua.

A validação prévia deverá verificar todas as regras locais implementáveis e as referências resolvidas antes da importação. O SharePoint será a autoridade final para permissões, unicidade, fórmulas, regras de negócio e alterações concorrentes. A interface não deverá prometer que um arquivo validado é garantia de gravação integral.

## Plataforma e ambiente de desenvolvimento

Usar SPFx, React, TypeScript, Fluent UI, PnPjs e SheetJS para XLSX e XLS. Selecionar versões compatíveis com a matriz oficial Microsoft, fixar dependências e entregar lockfile. Base de referência: SPFx 1.23.2, Node.js 22 LTS e React 17.0.1; confirmar compatibilidade e disponibilidade dos pacotes antes de fixar a versão final. Usar a cadeia de compilação correspondente ao SPFx escolhido.

Preparar um runtime compatível e isolado se o ambiente disponível for incompatível, sem substituir o runtime compartilhado da estação. Usar distribuição mantida de SheetJS, com origem, versão e licença documentadas. Não instalar simplesmente o pacote mais recente sem verificar compatibilidade.

## Autenticação e configuração administrativa

Usar exclusivamente o contexto SPFx e APIs nativas SharePoint com a identidade atual. Não criar login próprio, armazenar senha, usar segredo de aplicação ou exigir permissões adicionais de APIs no Entra ID. As políticas corporativas existentes, incluindo sessão e acesso condicional, continuam válidas.

A única configuração necessária para o uso normal é publicar o pacote no App Catalog e disponibilizá-lo conforme as políticas existentes. Sites adicionais de descoberta, limites personalizados e auditoria central são recursos administrativos opcionais. O usuário final não precisará configurar URLs nem provisionar listas auxiliares para importar.

Verificar permissões efetivas de leitura e inclusão na lista selecionada. Bloquear importação sem permissão de inclusão. Verificar separadamente acesso às fontes de lookup e, quando configurada, à auditoria central; tratar acesso negado sem tentar contorná-lo. Revalidar permissões antes da gravação e tratar negativas retornadas durante os lotes.

## Pesquisa de listas

O botão Pesquisar Lista deverá abrir um campo de texto. A pesquisa nativa usará SharePoint Search API com busca por prefixos, por exemplo Projet para Projetos, sujeita à indexação e às permissões do serviço. Paginar resultados, eliminar duplicatas por site e ID da lista e confirmar acesso diretamente antes de exibir detalhes da lista.

Complementar a pesquisa enumerando listas elegíveis dos sites configurados pela TI, incluindo o site de contexto. Aplicar filtro local por trecho do nome nessas listas. Essa alternativa permite encontrar listas não indexadas dentro dos sites configurados, sem pedir URLs ao usuário final. O cadastro administrativo conterá URLs e nomes amigáveis, não credenciais.

Não prometer descoberta universal de listas fora do índice e fora dos sites configurados. Quando não houver resultado, orientar o usuário a tentar outro nome ou solicitar à TI a inclusão do site na configuração. Diferenciar resultado vazio de falha na pesquisa. Se uma fonte estiver indisponível, informar que a busca está incompleta.

## Schema e seleção

Após selecionar a lista, carregar site, título, ID, permissões, campos, nomes internos, tipos, obrigatoriedade, valores padrão, opções, restrições disponíveis, configuração regional e visualização padrão. Se houver múltiplos tipos de conteúdo de itens aplicáveis, permitir seleção por nome amigável e validar o schema efetivo escolhido.

Separar campos editáveis de campos de sistema, ocultos, calculados e somente leitura. Na interface de mapeamento, listar sempre todas as colunas editáveis da lista como destino, marcar as obrigatórias com `*` e permitir selecionar para cada uma a coluna correspondente do Excel. Permitir que uma mesma coluna de origem seja associada intencionalmente a vários campos de destino. Usar nomes internos apenas no mapeamento técnico. Desambiguar títulos duplicados somente entre campos editáveis; campos de exibição internos do SharePoint não deverão acrescentar sufixos aos nomes apresentados ao usuário. Em arquivos existentes, solicitar mapeamento por seleção amigável quando necessário.

Manter o schema e as referências em memória durante a sessão de validação. Alteração de arquivo, lista, tipo de conteúdo, mapeamento ou formato regional deverá invalidar o resultado anterior. Reconsultar o schema antes de importar; se houver mudança relevante, exigir nova validação.

## Template e leitura do Excel

Gerar template XLSX opcional com duas abas. A aba Dados terá os cabeçalhos dos campos editáveis suportados, na ordem da visualização padrão, seguidos dos demais campos elegíveis. A aba Instruções descreverá coluna, tipo, obrigatoriedade, formato, valores permitidos, valores padrão e limitações. Campos obrigatórios não suportados deverão ser destacados antes do download.

Para Choice e MultiChoice, incluir as opções configuradas. Para Lookup, incluir valores e IDs acessíveis da fonte, com paginação durante a consulta. Limitar o catálogo do template a 5.000 opções por campo, de forma configurável; se excedido, informar explicitamente a truncagem e orientar uso de ID. Essa limitação do template não deverá limitar a validação por ID. Para Pessoa ou Grupo, explicar identificadores aceitos e multiplicidade.

Aceitar arquivos XLSX e XLS usando SheetJS. Selecionar Dados por padrão ou permitir escolher outra aba, com cabeçalho na primeira linha. Preservar cabeçalhos e posições antes da conversão para objetos, para detectar duplicações. Exibir a linha física da planilha nas mensagens de erro. Ignorar linhas totalmente vazias sem perder a numeração original.

Limites configuráveis, inicialmente 10.000 linhas de dados, 100 colunas e 20 MB por arquivo. Recusar excedentes com mensagem clara antes do processamento pesado sempre que possível. Não executar macros, fórmulas, links externos ou conteúdo ativo. Células com fórmulas deverão gerar erro orientando colar como valores; não confiar em resultados armazenados possivelmente desatualizados.

## Validação estrutural

Identificar cabeçalhos duplicados, mapeamentos inválidos e ausência de campos obrigatórios sem valor padrão aplicável. Diferença de ordem não deverá gerar ocorrência no log quando o mapeamento estiver definido. Desambiguar mapeamentos antes de validar dados. Colunas somente leitura ou de sistema reconhecidas no schema da própria lista deverão ser ignoradas silenciosamente quando vierem em uma exportação do SharePoint. Outras colunas extras deverão ser ignoradas com um aviso consolidado; sua simples presença não bloqueará os registros. Nunca mapear automaticamente uma coluna para campo oculto, calculado ou somente leitura.

Valor vazio em campo obrigatório gera erro, exceto quando a coluna foi omitida e existe valor padrão aplicável confirmado no schema. Documentar a diferença entre coluna omitida e célula vazia; não substituir valores por padrão sem explicitar a regra.

## Texto e opções

Texto e múltiplas linhas aceitam strings, respeitando limites disponíveis no schema. Conteúdo rico não deverá ser executado na interface; usar tratamento seguro. Números em campos de texto poderão ser convertidos para texto exibido, preservando zeros à esquerda quando disponíveis na célula.

Choice valida cada opção configurada; quando o campo permitir preenchimento livre, respeitar essa configuração. MultiChoice usa ponto e vírgula e valida cada opção. Remover espaços externos, sem alterar silenciosamente o conteúdo. Opções contendo o separador deverão aceitar uma sintaxe de escape documentada ou gerar orientação inequívoca, nunca divisão incorreta.

## Números e datas

Número e Moeda aceitam células numéricas ou texto conforme o formato regional selecionado. Padrão brasileiro: vírgula decimal e ponto de milhar. Oferecer opção explícita de formato internacional antes da validação. Rejeitar valores não finitos e formatos ambíguos; respeitar limites numéricos disponíveis no schema. Serializar números para o SharePoint como valores numéricos, sem símbolos de moeda.

Sim ou Não aceita Sim, Não, Yes, No, True, False, 1 e 0, ignorando caixa e espaços externos. Converter para booleano. Valores vazios seguem a obrigatoriedade e a regra de padrões; não confundir zero ou falso com ausência de valor.

Datas aceitam ISO yyyy-MM-dd e o formato selecionado para o arquivo: dd/MM/yyyy por padrão ou MM/dd/yyyy por escolha explícita. Não inferir ambos na mesma importação. Exemplo: 03/04/2026 significa 3 de abril no padrão brasileiro e 4 de março no americano. Validar calendário real, datas seriais do Excel e sistemas 1900 e 1904, rejeitando datas inexistentes.

Distinguir campos de data sem horário de data e hora. Para data sem horário, preservar o dia civil; quando uma exportação do SharePoint trouxer uma fração de horário técnica em uma célula formatada e exibida somente como data, normalizar essa fração sem exigir alteração manual do arquivo. Para data e hora, usar fuso do site e conversão ISO adequada. Horários inexistentes ou ambíguos devem gerar orientação. Explicar o formato no template e mostrar os valores convertidos na prévia antes da importação.

## Pessoas e referências

Para Pessoa, aceitar e-mail, UPN, identificador de login ou nome de exibição inequívoco resolvido por APIs nativas SharePoint. O nome de exibição exportado pela própria lista deverá ser aceito quando corresponder exatamente a uma única pessoa conhecida no site; zero ou múltiplas correspondências exigirão e-mail ou UPN. Para Grupo, aceitar grupos SharePoint e outros principais resolvíveis pelas APIs disponíveis, somente quando permitidos pela configuração do campo. Não prometer enumeração do diretório Entra nem resolução de todos os tipos de grupos.

Respeitar campos simples ou múltiplos e as restrições de seleção do campo. Resolver os identificadores distintos do arquivo uma vez por contexto, com cache e concorrência limitada, antes da validação das linhas. Quando necessário, garantir o principal no site por API nativa com a identidade atual; isso não concede acesso à lista. Diferenciar principal inexistente, ambíguo, não permitido, acesso negado e serviço indisponível.

Lookup e Lookup Multi validam existência na lista e coluna relacionadas, respeitando permissões. Aceitar ID explícito no formato ID:123 ou valor de exibição único. Valores de exibição repetidos exigem identificação por ID. Múltiplos valores usam ponto e vírgula com regra de escape documentada. Fontes grandes podem ser consultadas pelos valores distintos ou IDs necessários, com paginação e cache; não presumir que a primeira página representa a lista completa.

Choice usa schema em cache. Pessoas e lookups podem exigir múltiplas requisições preparatórias; não fazer consultas dentro do laço de cada registro. Limites de serviço e falhas de resolução devem ser informados, sem aceitar referência não validada.

## Tipos não suportados e regras do servidor

Preparar adaptadores extensíveis para tipos de campo. Managed Metadata terá suporte futuro: permitir carregar a lista e exibir aviso de suporte parcial. Campo não suportado preenchido, ou obrigatório sem padrão aplicável, deverá bloquear a importação com explicação. Campo opcional não suportado e omitido não deverá impedir importar os demais campos.

Fórmulas de validação SharePoint, unicidade e regras externas não deverão ser reimplementadas parcialmente como se fossem garantia completa. Validar localmente o que for suportado, detectar duplicações no próprio arquivo quando aplicável e apresentar avisos sobre verificações definitivas do servidor. Tratar rejeições de gravação por linha.

## Dashboard e correção

Exibir total de registros, linhas válidas, linhas inválidas, problemas estruturais e avisos. Não usar a quantidade bruta de ocorrências como indicador principal, pois uma linha pode conter vários erros. Erros estruturais deverão aparecer separadamente e bloquear a importação independentemente das contagens por linha. Uma linha com múltiplos erros conta uma vez como registro inválido.

Apresentar grade com local, linha física do Excel quando aplicável, coluna ou cabeçalho, valor, problema, ação recomendada e severidade, com filtros, pesquisa e paginação ou virtualização. Problemas estruturais deverão indicar explicitamente `Cabeçalho / mapeamento` ou `Arquivo`, sem uma linha fictícia. Orientações genéricas sobre verificações futuras do SharePoint deverão permanecer no texto da interface e não aparecer como ocorrência de validação. Exportar essas informações para XLSX; gravar valores exportados como texto quando necessário para evitar interpretação como fórmulas. Exibir prévia dos valores normalizados, lista de destino e quantidade antes de importar.

Habilitar a importação completa após validação sem erros, com permissão de inclusão e schema vigente. Quando a auditoria central estiver configurada, exigir que ela esteja operacional. Quando existirem simultaneamente linhas válidas e inválidas e não houver erro estrutural, oferecer uma opção explícita para importar somente as linhas válidas. Informar antes do envio quantas serão importadas e quantas serão ignoradas, preservar os erros das linhas excluídas e registrar o resultado como parcial. Erros estruturais continuam bloqueando qualquer envio. Avisos devem ser visíveis e não equivalem a erro. Bloquear clique duplo e execuções simultâneas sobre o mesmo arquivo na mesma sessão.

## Processamento e recuperação

Usar PnPjs Batch ou SharePoint Batch API, com tamanho de lote e concorrência configuráveis, evitando inserções sequenciais individuais como estratégia principal. Quando houver somente uma linha, preferir gravação REST direta para reduzir a complexidade da resposta multipart. Avaliar cada resposta interna; sucesso da requisição de lote não significa sucesso de todos os itens. Preservar no relatório o código HTTP e a mensagem estruturada devolvida pelo SharePoint. Não presumir transação ou rollback global.

Exibir quantidade processada, confirmada como importada e com falha, percentual e tempo restante estimado. Respeitar Retry-After e aplicar tentativas limitadas para falhas transitórias em operações comprovadamente não concluídas. Ao interromper, parar novos lotes e contabilizar resultados de requisições já enviadas.

Registrar resultado por linha e IDs criados. Resultados possíveis: Importado, Parcial, Falhou e Resultado desconhecido. Exibir diretamente na tela um log das falhas e gravações sem confirmação, com linha, status, HTTP e mensagem, mantendo a exportação completa. Uma resposta HTTP de sucesso deverá ser reconhecida mesmo quando não tiver corpo ou ID. Em desconexão com confirmação ausente, não repetir automaticamente os itens potencialmente gravados. Oferecer relatório de reconciliação; apenas falhas confirmadas poderão ser preparadas para nova tentativa após validação. Não alterar listas de destino para adicionar chave de idempotência sem decisão específica de implantação.

Não prometer continuidade após fechar o Teams ou recarregar a página. A execução ocorre no cliente; manter orientação visível para aguardar a conclusão e fornecer resultados disponíveis sem alegar recuperação automática integral.

## Auditoria e proteção dos dados

Oferecer provisionamento idempotente da lista `ImportacoesSharePoint` somente para organizações que optarem pela auditoria central. Sem URL de auditoria configurada, não consultar nem exigir essa lista e permitir a importação normalmente.

Preferir eventos anexados por execução em vez de depender de atualização de um único registro. Campos mínimos: identificador da execução, identificador do evento, data, usuário, URL do site de destino, título e ID da lista, nome do arquivo, quantidade de registros, erros, importados e status. Eventos: Validado, Iniciado, Importado, Parcial, Falhou, Interrompido e Resultado desconhecido. Usar autor e data do servidor como referência confiável da identidade e do momento do evento.

Quando a auditoria central estiver configurada, verificá-la antes da importação e gravar o evento Iniciado antes do primeiro lote. Se falhar, impedir novas gravações de negócio. Se a auditoria falhar após inserções, registrar claramente a falha na interface, parar novos lotes, preservar os resultados conhecidos e permitir exportar relatório local; não anunciar rollback nem repetir importações já confirmadas. Sem auditoria central configurada, usar os metadados nativos `Criado` e `Criado por` dos itens e o relatório local da execução.

A auditoria em aplicativo cliente não substitui trilha regulatória inviolável nem garante gravação final após fechamento abrupto. Execução com Iniciado sem evento terminal requer investigação. Documentar essa limitação e não inserir exigência de serviço adicional no escopo inicial.

Não salvar planilhas, conteúdo de células, senhas ou tokens em logs. Manter cache em memória por sessão e contexto, sem persistir pessoas e referências em armazenamento compartilhado do navegador. Exportações serão iniciadas pelo usuário. A TI deverá configurar visibilidade e retenção dos registros de auditoria conforme suas políticas existentes.

## Arquitetura e desempenho

Implementar SearchService, SharePointSchemaService, ExcelParserService, ValidationService, ImportService e AuditService. Separar modelos ListDefinition, ColumnDefinition, ValidationError, ValidationResult e ImportResult. Acrescentar contratos para configuração, resolução de referências, auditoria por evento e resultado por linha.

Implementar os componentes ListSearch, ListSelector, TemplateGenerator, FileUploader, ValidationDashboard, ErrorGrid e ImportProgress. Isolar acesso ao SharePoint de parsing e validação. Fornecer adaptadores simulados para desenvolvimento e testes locais, com indicação visível de demonstração e sem alegar integração real.

Projetar para até 10.000 linhas e 100 colunas, com validação em memória, processamento em blocos ou worker quando necessário, cache de referências e renderização virtualizada. A fase de resolução pode usar rede; a validação das linhas deve consumir os dados já resolvidos. Medir tempo, memória e resposta no Teams com massa representativa. Relatar resultados e condições de medição; não declarar desempenho garantido sem teste.

## Entregáveis e critérios de aceite

Entregar projeto SPFx completo, código TypeScript, componentes React, serviços, modelos, configurações, estrutura de pastas, lockfile, testes e comentários das decisões técnicas relevantes. Entregar README, guia de instalação, guia de publicação SharePoint e Teams, guia de uso, exemplos fictícios válidos e inválidos, matriz de suporte e registro de decisões.

Entregar script ou procedimento reproduzível de provisionamento da auditoria e modelo de configuração administrativa dos sites. Não incluir dados corporativos reais, URLs inventadas apresentadas como válidas ou segredos. Placeholders deverão ser identificados e validados antes da conexão.

Verificar parsing XLSX e XLS, cabeçalhos, obrigatoriedade, tipos, culturas, datas, referências, campos não suportados, permissões, falhas parciais, limites e exportação segura. Validar mudança de schema, clique duplo, throttling, falha de auditoria e resultado desconhecido. Distinguir testes locais simulados de integração real.

Compilar e empacotar com as ferramentas e versões documentadas; entregar pacote de produção quando a compilação for bem-sucedida. Registrar falhas reais de ambiente com causa e solução, sem declarar pacote pronto quando não compilado. Guias devem conter os comandos efetivamente verificados.

Homologar com listas representativas e perfis com leitura, inclusão e acesso negado; testar no Teams e SharePoint. Confirmar descoberta por Search e por sites configurados, resolução de referências, auditoria e importação real em ambiente de teste. Validar também lista não indexada dentro de site configurado.

## Condução da execução

Iniciar desenvolvimento local com as decisões e padrões deste documento. Não interromper o trabalho por ausência de URLs, contas de teste ou dados administrativos que só sejam necessários na integração. Preparar configuração parametrizada e ambiente simulado; continuar código, testes locais e documentação enquanto houver trabalho independente possível.

Para homologação e publicação, solicitar apenas as informações indispensáveis: site de teste, site da auditoria quando diferente do padrão e sites adicionais de descoberta. O solicitante poderá realizar a publicação e informou possuir permissão no Power Apps. Essa informação não comprova permissão no App Catalog SharePoint ou no catálogo Teams; verificar somente quando essas etapas forem necessárias. Essas dependências não podem ser removidas pela redação do prompt; devem ser tratadas na etapa correspondente.

Entregar o pacote .sppkg, após compilação bem-sucedida, e guia para publicação pelo solicitante no SharePoint e disponibilização no Teams. A plataforma definida é SPFx; Power Apps não integra o escopo. Desenvolver e testar localmente sem aguardar acesso de publicação. A homologação real e a implantação permanecem dependentes dos acessos correspondentes.

Não publicar em produção nem modificar listas corporativas como parte da simples preparação local. A execução dessas etapas depende de acesso e autorização correspondentes. Separar no relatório final os estados Desenvolvimento, Compilação, Homologação e Publicação, com evidências e pendências reais.

## Referências de implementação

Consultar a matriz oficial antes de instalar dependências: https://learn.microsoft.com/en-us/sharepoint/dev/spfx/compatibility

Consultar o fluxo de implantação no Teams: https://learn.microsoft.com/en-us/sharepoint/dev/spfx/integrate-with-teams-introduction

Consultar pesquisa e limites do SharePoint: https://learn.microsoft.com/en-us/sharepoint/dev/general-development/sharepoint-search-rest-api-overview e https://learn.microsoft.com/en-us/sharepoint/dev/general-development/how-to-avoid-getting-throttled-or-blocked-in-sharepoint-online

Consultar o comportamento não transacional dos lotes: https://learn.microsoft.com/en-us/sharepoint/dev/sp-add-ins/make-batch-requests-with-the-rest-apis

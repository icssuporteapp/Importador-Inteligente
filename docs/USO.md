# Guia de uso

## Pesquisa de listas

A pesquisa usa o índice do SharePoint, que apresenta somente listas às quais o usuário atual tem acesso. Os sites adicionais são opcionais e funcionam como fallback para listas ainda não indexadas; eles não restringem a pesquisa aos endereços configurados.

Nomes com sublinhado são aceitos, por exemplo `ConectaICS_Base`. Arquivos Excel guardados em pastas ou bibliotecas não aparecem na pesquisa da etapa 1. Primeiro escolha uma Lista do SharePoint como destino; o arquivo Excel é selecionado na etapa 2.

1. Abra o Importador Inteligente no Teams ou SharePoint.
2. Clique em **Pesquisar lista**, digite pelo menos dois caracteres e selecione o destino.
3. Confira os campos e o tipo de conteúdo. Se quiser, baixe o template.
4. Selecione um arquivo XLSX ou XLS e escolha a aba. O padrão regional é brasileiro.
5. Confira o mapeamento das colunas e clique em **Validar arquivo**.
6. Corrija erros e valide novamente. Avisos informam limitações e não bloqueiam por si só.
7. Exporte os erros quando precisar compartilhar a correção.
8. Quando todos os registros estiverem válidos, clique em **Importar** e mantenha a tela aberta.
9. Exporte o resultado se houver falhas ou registros sem confirmação.

A importação não exige configuração de uma lista auxiliar. O SharePoint registra `Criado` e `Criado por` nos itens incluídos. Se a TI preencher a propriedade opcional de auditoria central, o aplicativo também registrará eventos de execução em `ImportacoesSharePoint`.

Quando somente uma linha for enviada, o aplicativo usa a gravação direta do SharePoint. Arquivos maiores continuam sendo processados em lotes. O relatório de resultado inclui o código HTTP e a mensagem devolvida pelo servidor quando houver rejeição confirmada.

Falhas e gravações sem confirmação aparecem diretamente no **Log de erros da importação**, com linha, status, HTTP e mensagem. A tela mostra até 50 ocorrências e o arquivo exportado preserva o resultado completo.

Datas brasileiras usam `dd/MM/yyyy`; ISO `yyyy-MM-dd` também é aceito. Para formato americano, altere a opção antes de validar. Pessoas aceitam e-mail, UPN ou o nome visível quando ele identifica uma única pessoa já conhecida no site. Lookups aceitam `ID:123` ou uma descrição única. Valores múltiplos usam ponto e vírgula; escreva `\;` para um ponto e vírgula literal.

## Registros repetidos

O aplicativo acusa valores repetidos no próprio arquivo quando a coluna correspondente está configurada no SharePoint para **exigir valores exclusivos**. A mesma regra é confirmada novamente pelo SharePoint durante a importação. Repetir Nome, Email ou outro campo permitido pela lista não é considerado erro automaticamente, pois diferentes listas podem admitir esses valores. Se a regra do processo for “um registro por e-mail”, configure a coluna Email como exclusiva na lista ou defina essa chave de negócio antes da importação.

## Mapeamento de colunas

A tela apresenta todas as colunas editáveis da lista de destino. Cada linha mostra uma coluna do SharePoint e permite selecionar a coluna correspondente do Excel. O símbolo `*` identifica campos obrigatórios. Colunas internas, ocultas, calculadas e somente leitura não aparecem porque o SharePoint não permite que o importador grave valores nelas.

Uma validação concluída pode deixar de valer se a lista, o arquivo, o mapeamento ou o tipo de conteúdo mudar. O aplicativo exige nova validação nesses casos. Em uma falha de conexão, um resultado marcado como **Resultado desconhecido** não deve ser reenviado antes de conferir a lista de destino.

Colunas somente leitura da própria lista, como `ID`, `Criado`, `Modificado`, `Criado por`, `Modificado por`, `Tipo de Item` e `Caminho`, são reconhecidas e ignoradas silenciosamente nos arquivos exportados pelo SharePoint. Outras colunas extras aparecem como aviso, mas não invalidam as linhas. Se uma coluna extra contiver dados que precisam ser importados, associe-a manualmente a um campo editável da lista.

Uma mesma coluna do Excel pode ser escolhida em vários campos de destino. Cada associação é mantida separadamente. As colunas extras não utilizadas são reunidas em um único aviso. A orientação de que o SharePoint confirmará permissões e regras durante a gravação aparece na interface, mas não é contabilizada como erro ou aviso do arquivo.

No resultado, **Linha 17**, por exemplo, aponta diretamente para a linha física 17 do Excel. **Cabeçalho / mapeamento** indica um problema que afeta o arquivo inteiro e não pertence a uma linha de dados. A tela e o Excel de erros apresentam também a ação sugerida em **Como corrigir**.

O painel resume **Linhas válidas** e **Linhas inválidas**. Cada linha é contada uma única vez, mesmo quando possui vários problemas. A grade mostra 50 ocorrências por página, mantém a pesquisa sobre todo o resultado e permite navegar pelas páginas. A exportação de erros continua contendo todas as ocorrências.

Quando houver linhas válidas e inválidas no mesmo arquivo, marque **Importar somente as linhas válidas** para enviar apenas as linhas aprovadas. A tela informa as quantidades antes da importação e apresenta as linhas inválidas como ignoradas no resultado. Essa opção não aparece quando todas as linhas são inválidas e não contorna problemas estruturais do arquivo.

Campos configurados como somente data aceitam células exportadas pelo SharePoint que aparentam conter apenas a data, mesmo quando o valor interno do Excel inclui uma hora técnica gerada pelo fuso. O aplicativo preserva o dia exibido e remove essa fração durante a normalização.

A conversão do fuso usa o formato de resposta compatível com as funções clássicas de data do SharePoint Online. Isso evita o HTTP 406 observado durante a validação de datas em alguns tenants.

Datas numéricas reais do Excel são interpretadas pelo valor serial, não pela aparência localizada. Assim, uma célula exibida como `1/25/26` em uma exportação representa 25 de janeiro de 2026 mesmo quando o importador está configurado para português do Brasil. O formato regional selecionado é aplicado aos valores digitados como texto.

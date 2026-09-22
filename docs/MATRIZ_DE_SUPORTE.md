# Matriz de suporte de campos

| Tipo SharePoint | Suporte | Entrada principal |
| --- | --- | --- |
| Texto e múltiplas linhas | Completo | Texto, respeitando o limite do campo |
| Número e moeda | Completo | Número Excel ou formato regional selecionado |
| Sim ou Não | Completo | Sim, Não, Yes, No, True, False, 1 ou 0 |
| Data e hora | Completo com validação no site | Data regional ou ISO; fuso do site para horários sem offset |
| Choice e MultiChoice | Completo | Opção exata; múltiplos separados por ponto e vírgula |
| Lookup e Lookup Multi | Completo para referência acessível | `ID:123` ou descrição única |
| Pessoa ou Grupo | Completo para principais resolvíveis | E-mail ou UPN; grupo SharePoint com `GRUPO:Nome` quando permitido |
| Managed Metadata | Parcial | Lista pode ser aberta; valor preenchido bloqueia a importação |
| Calculado, sistema e somente leitura | Não gravável | Excluído do template e do payload |
| Anexos, bibliotecas e tipos externos | Fora do escopo inicial | Não suportado |

Fórmulas de validação, unicidade e regras externas são verificadas definitivamente pelo SharePoint. A aplicação trata rejeições por linha e não promete transação global entre itens.

# Dependências principais

As versões diretas estão fixadas em `package.json` e as versões resolvidas em `package-lock.json`.

| Dependência | Versão | Origem | Licença |
| --- | ---: | --- | --- |
| SharePoint Framework | 1.23.2 | Pacotes oficiais Microsoft no npm | MIT |
| React | 17.0.1 | npm | MIT |
| Fluent UI React | 8.125.5 | npm | MIT |
| PnPjs | 4.17.0 | npm, projeto PnP | MIT |
| SheetJS Community Edition | 0.20.3 | CDN oficial SheetJS | Apache-2.0 |
| TypeScript | 5.8.3 | npm | Apache-2.0 |

O projeto usa Node.js 22.23.2 de forma isolada no diretório `.tools`, que não integra o pacote publicado. Antes de atualizações, validar a matriz de compatibilidade do SPFx e repetir testes, typecheck e build de produção.

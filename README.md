# Importador Inteligente de Listas SharePoint

Solução prevista em SPFx, React e TypeScript para validar e importar arquivos Excel em listas SharePoint a partir do Microsoft Teams, usando as permissões do usuário autenticado.

## Situação do projeto

A versão 1.0 foi implementada em SPFx 1.23.2, React e TypeScript. O código compila em produção, os testes locais passam e o pacote está em `sharepoint/solution/importador-spfx.sppkg`. O Word original permanece intacto e o prompt revisado em Markdown é a referência técnica.

A integração ainda precisa ser homologada no tenant: pesquisa, permissões, tipos de conteúdo, fuso, pessoas, lookups, importação e auditoria dependem de listas e contas de teste reais. O solicitante realizará a publicação com o guia entregue.

## Funcionalidades

- Pesquisa por SharePoint Search e enumeração de listas nos sites configurados.
- Seleção de tipo de conteúdo e leitura do schema efetivo.
- Geração de template, leitura XLSX/XLS e mapeamento de colunas.
- Validação estrutural e por linha, com exportação de erros.
- Conversão explícita de números, booleanos, datas, pessoas, grupos e lookups.
- Importação em lotes, progresso, interrupção e reconciliação de resultados incertos.
- Auditoria por eventos em `ImportacoesSharePoint`.
- Modo de demonstração sem acesso ou gravação de dados reais.

## Documentação

- [Guia rápido e técnico em Word](docs/Guia%20Rapido%20e%20Tecnico%20-%20Importador%20Inteligente.docx) — visão resumida para uso, publicação, suporte e manutenção.
- [Prompt revisado em Markdown](Prompt/Prompt_Importador%20Inteligente%20de%20Listas%20SharePoint.md) — referência de desenvolvimento.
- [Alterações e decisões do prompt](docs/REVISAO_DO_PROMPT.md)
- [Análise de viabilidade e impedimentos](docs/ANALISE_PREVIA.md)
- [Plano de implementação e validação](docs/PLANO_DE_EXECUCAO.md)
- [Instalação e desenvolvimento](docs/INSTALACAO.md)
- [Publicação e homologação](docs/PUBLICACAO.md)
- [Publicação e manutenção no GitHub](docs/PUBLICACAO_GITHUB.md)
- [Guia de uso](docs/USO.md)
- [Matriz de suporte](docs/MATRIZ_DE_SUPORTE.md)
- [Arquitetura e segurança](docs/ARQUITETURA.md)
- [Dependências principais](docs/DEPENDENCIAS.md)
- [Evidências de teste](docs/TESTES.md)
- Prompt original: `Prompt/Prompt_Importador Inteligente de Listas SharePoint.docx`

## Comandos verificados

```powershell
./scripts/npm.ps1 install --no-audit --no-fund
./scripts/npm.ps1 test
./scripts/npm.ps1 run typecheck
./scripts/npm.ps1 run build
```

O pacote SPFx deve ser publicado no SharePoint App Catalog e sincronizado com o Teams. Ele não é um pacote Power Apps.

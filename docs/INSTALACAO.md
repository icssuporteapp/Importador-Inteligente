# Guia de instalação para desenvolvimento

## Requisitos

- Windows com PowerShell.
- Node.js 22 LTS. O projeto inclui um runtime 22.23.2 isolado em `.tools`, que não é versionado.
- Acesso aos repositórios de pacotes durante a instalação.
- SharePoint Online para homologação. O desenvolvimento local e os testes não precisam de credenciais corporativas.

As versões principais estão fixadas em `package.json`: SPFx 1.23.2, React 17.0.1, TypeScript 5.8.3, Fluent UI 8.125.5, PnPjs 4.17.0 e SheetJS 0.20.3. O SheetJS vem do CDN oficial porque o pacote `xlsx` no registro npm está desatualizado.

## Preparação

O runtime local não é enviado junto com o código. Para recriar o ambiente, baixe Node.js 22 para `.tools/node-v22.23.2-win-x64`, confira o SHA256 publicado em `https://nodejs.org/dist/v22.23.2/SHASUMS256.txt` e execute:

```powershell
./scripts/npm.ps1 install --no-audit --no-fund
./scripts/npm.ps1 test
./scripts/npm.ps1 run build
```

O script `npm.ps1` garante que os comandos usem o Node isolado e um cache dentro do projeto. O pacote de produção será gravado em `sharepoint/solution/importador-spfx.sppkg` quando a compilação terminar sem erros.

## Desenvolvimento local

O projeto está configurado para o tenant `climaesociedade.sharepoint.com`. Na primeira execução, abra o PowerShell na raiz do projeto e execute:

```powershell
./scripts/start-local.ps1 -TrustCertificate
```

Aceite a confirmação do Windows para confiar no certificado HTTPS local do SPFx. Nas execuções seguintes, basta usar:

```powershell
./scripts/start-local.ps1
```

Mantenha o PowerShell aberto. O navegador deverá abrir o Workbench hospedado em `https://climaesociedade.sharepoint.com/_layouts/15/workbench.aspx`. Adicione a web part **Importador Inteligente**, abra suas propriedades e ative **Modo de demonstração = Simulado** para testar sem gravar dados reais.

Se o navegador não abrir automaticamente, use:

`https://climaesociedade.sharepoint.com/_layouts/15/workbench.aspx?debugManifestsFile=https%3A%2F%2Flocalhost%3A4321%2Ftemp%2Fbuild%2Fmanifests.js&debug=true&noredir=true`

O Workbench hospedado foi marcado pela Microsoft para retirada em 1º de dezembro de 2026. Até essa data ele continua sendo a alternativa sem publicação para testar o componente no contexto autenticado do SharePoint.

Os testes locais usam adaptadores simulados e não comprovam acesso, permissões, pesquisa, fuso horário nem gravação em um tenant real.

## Erro ao carregar os manifestos de depuração

Se o Workbench mostrar erro para `https://localhost:4321/temp/build/manifests.js`:

1. Não clique em **Ignorar**. Feche a mensagem ou atualize a página somente depois que o terminal informar que o Webpack Dev Server iniciou.
2. Mantenha apenas uma execução de `start-local.ps1`; duas execuções simultâneas disputam a porta 4321.
3. Confirme no navegador que `https://localhost:4321/temp/build/manifests.js` abre como texto JavaScript sem aviso de certificado.
4. Se o certificado não estiver confiável, encerre o servidor com `Ctrl+C` e execute novamente `./scripts/start-local.ps1 -TrustCertificate` em uma janela normal do PowerShell.
5. Depois que o servidor estiver pronto, atualize o Workbench com `Ctrl+F5`.

O processo de compilação inicial pode levar alguns minutos. A janela do PowerShell precisa permanecer aberta durante todo o teste.

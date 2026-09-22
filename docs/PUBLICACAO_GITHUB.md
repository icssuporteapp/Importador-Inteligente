# Publicação e manutenção no GitHub

## Finalidade

O repositório GitHub deve guardar o código-fonte, as configurações e a documentação do Importador Inteligente. Ele deve ser criado como **privado** na organização do iCS e compartilhado somente com as equipes responsáveis por desenvolvimento, sustentação e aprovação.

O pacote compilado `importador-spfx.sppkg` deve ser anexado a uma versão publicada em **Releases**. Dessa forma, o administrador consegue identificar e baixar exatamente o pacote correspondente a cada versão sem manter arquivos binários no histórico do código.

## Primeira publicação

1. No GitHub, acesse a organização do iCS e selecione **New repository**.
2. Use o nome `importador-inteligente-sharepoint`.
3. Defina a visibilidade como **Private**.
4. Não adicione README, `.gitignore` ou licença na criação, pois esses arquivos já existem no projeto.
5. Copie o endereço HTTPS do repositório criado.
6. Abra a pasta do projeto no Visual Studio Code.
7. Abra **Controle do Código-Fonte** e escolha **Inicializar Repositório**.
8. Revise os arquivos apresentados. Não devem aparecer `node_modules`, `.env`, certificados, arquivos de homologação nem pastas de saída de compilação.
9. Registre o primeiro commit com a mensagem `feat: versão inicial do Importador Inteligente`.
10. Escolha **Publicar Branch** e selecione a organização e o repositório privado do iCS. Se o VS Code solicitar autenticação, entre com a conta corporativa autorizada.

Também é possível associar manualmente o repositório remoto pelo terminal:

```powershell
git remote add origin URL_HTTPS_DO_REPOSITORIO
git push -u origin main
```

## Publicação de uma nova versão

1. Crie uma branch para a alteração.
2. Faça a alteração e execute os testes, a verificação de tipos e a compilação.
3. Atualize a versão da solução no arquivo `config/package-solution.json`.
4. Abra um Pull Request para revisão.
5. Depois da aprovação, integre a alteração à branch `main`.
6. No GitHub, crie uma Release com a mesma versão da solução, por exemplo `v1.0.0.11`.
7. Anexe à Release o arquivo `sharepoint/solution/importador-spfx.sppkg` produzido pela compilação.
8. O administrador baixa esse pacote e substitui a versão existente no Catálogo de Aplicativos do SharePoint.

## Proteções recomendadas

- Exigir Pull Request antes de alterar a branch `main`.
- Exigir pelo menos uma aprovação da equipe responsável.
- Restringir a criação e exclusão de versões.
- Manter autenticação multifator e vínculo SSO da organização.
- Conceder acesso de escrita apenas aos responsáveis pela sustentação.
- Nunca registrar senhas, tokens, segredos, certificados ou dados reais de usuários e listas.

## Recuperação

Cada Release deve manter o pacote publicado e as notas das alterações. Para corrigir uma regressão, restaure o código da versão anterior, atribua um novo número de versão superior, gere outro `.sppkg` e publique-o novamente no catálogo.

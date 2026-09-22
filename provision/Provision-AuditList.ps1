param(
  [Parameter(Mandatory = $true)][ValidatePattern('^https://[^/]+\.sharepoint\.com(?:/.*)?$')][string]$SiteUrl
)
$ErrorActionPreference = 'Stop'
if (!(Get-Module -ListAvailable -Name PnP.PowerShell)) { throw 'Instale o módulo PnP.PowerShell conforme docs/INSTALACAO.md.' }
Connect-PnPOnline -Url $SiteUrl -Interactive
$listName = 'ImportacoesSharePoint'
$list = Get-PnPList -Identity $listName -ErrorAction SilentlyContinue
if (!$list) { $list = New-PnPList -Title $listName -Template GenericList -OnQuickLaunch:$false }
$fields = @(
  @{ Name='ExecutionId'; Display='Identificador da execução'; Type='Text'; Required=$true },
  @{ Name='EventId'; Display='Identificador do evento'; Type='Text'; Required=$true },
  @{ Name='StatusExecucao'; Display='Status'; Type='Choice'; Required=$true; Choices=@('Validado','Iniciado','Em andamento','Importado','Parcial','Falhou','Interrompido','Resultado desconhecido') },
  @{ Name='SiteDestino'; Display='Site de destino'; Type='Note'; Required=$true },
  @{ Name='ListaDestino'; Display='Lista de destino'; Type='Text'; Required=$true },
  @{ Name='ListaId'; Display='Identificador da lista'; Type='Text'; Required=$true },
  @{ Name='Arquivo'; Display='Arquivo'; Type='Text'; Required=$true },
  @{ Name='TotalRegistros'; Display='Total de registros'; Type='Number'; Required=$true },
  @{ Name='TotalErros'; Display='Total de erros'; Type='Number'; Required=$true },
  @{ Name='TotalImportados'; Display='Total importado'; Type='Number'; Required=$true }
)
foreach ($definition in $fields) {
  $existing = Get-PnPField -List $listName -Identity $definition.Name -ErrorAction SilentlyContinue
  if (!$existing) {
    $parameters = @{ List=$listName; InternalName=$definition.Name; DisplayName=$definition.Display; Type=$definition.Type; Required=$definition.Required; AddToDefaultView=$true }
    if ($definition.Choices) { $parameters.Choices = $definition.Choices }
    Add-PnPField @parameters | Out-Null
  }
}
Set-PnPList -Identity $listName -EnableVersioning $true -EnableAttachments $false | Out-Null
Set-PnPField -List $listName -Identity 'ExecutionId' -Values @{ Indexed = $true } | Out-Null
Set-PnPField -List $listName -Identity 'EventId' -Values @{ Indexed = $true; EnforceUniqueValues = $true } | Out-Null
Write-Host "Lista $listName pronta em $SiteUrl. Conceda aos usuários do aplicativo a permissão Adicionar Itens e restrinja a leitura conforme a política institucional."

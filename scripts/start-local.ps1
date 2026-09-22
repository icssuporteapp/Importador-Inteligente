param(
  [switch]$TrustCertificate
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$runtime = Join-Path $projectRoot '.tools/node-v22.23.2-win-x64'
$heft = Join-Path $projectRoot 'node_modules/.bin/heft.cmd'

if (!(Test-Path -LiteralPath (Join-Path $runtime 'node.exe'))) {
  throw 'Runtime Node 22 não encontrado. Consulte docs/INSTALACAO.md.'
}
if (!(Test-Path -LiteralPath $heft)) {
  throw 'Dependências não instaladas. Execute ./scripts/npm.ps1 install --no-audit --no-fund.'
}

$env:PATH = "$runtime;$env:PATH"
$env:npm_config_cache = Join-Path $projectRoot '.tools/npm-cache'
$env:SPFX_SERVE_TENANT_DOMAIN = 'climaesociedade.sharepoint.com'

Push-Location $projectRoot
try {
  if ($TrustCertificate) {
    Write-Host 'O Windows solicitará confirmação para confiar no certificado HTTPS local do SPFx.'
    & $heft trust-dev-cert
    if ($LASTEXITCODE -ne 0) { throw 'Não foi possível confiar no certificado de desenvolvimento.' }
  }

  Write-Host 'Iniciando o SPFx. Mantenha esta janela aberta durante os testes.'
  & $heft start
  exit $LASTEXITCODE
}
finally {
  Pop-Location
}

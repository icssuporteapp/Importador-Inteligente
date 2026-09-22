param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Arguments)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$runtime = Join-Path $projectRoot '.tools/node-v22.23.2-win-x64'
if (!(Test-Path (Join-Path $runtime 'node.exe'))) { throw 'Prepare o Node 22 conforme docs/INSTALACAO.md.' }
$env:PATH = "$runtime;$env:PATH"
$env:npm_config_cache = Join-Path $projectRoot '.tools/npm-cache'
Push-Location $projectRoot
try { & (Join-Path $runtime 'npm.cmd') @Arguments; exit $LASTEXITCODE } finally { Pop-Location }

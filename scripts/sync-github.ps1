$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$localGh = Join-Path $projectRoot '.tools\gh\bin'
if (Test-Path -LiteralPath $localGh) { $env:Path = $localGh + ';' + $env:Path }
Set-Location -LiteralPath $projectRoot
gh auth status
if ($LASTEXITCODE -ne 0) { throw 'Autenticación no disponible. Resolver la restricción o usar gh auth login --web.' }
$githubOwner = gh api user --jq .login
if ($LASTEXITCODE -ne 0 -or -not $githubOwner) { throw 'No se pudo verificar la identidad de GitHub.' }
$repositoryName = $githubOwner.Trim() + '/flecha-trampa'
$repoInfo = gh repo view $repositoryName --json nameWithOwner,isPrivate,url 2>&1
if ($LASTEXITCODE -ne 0) {
  if (($repoInfo | Out-String) -notmatch 'Could not resolve to a Repository|404|Not Found') { throw ($repoInfo | Out-String) }
  gh repo create $repositoryName --private --description 'Juego móvil de puzles de flechas desarrollado con TypeScript, Phaser y Capacitor.'
  if ($LASTEXITCODE -ne 0) { throw 'GitHub rechazó la creación del repositorio.' }
  $repoInfo = gh repo view $repositoryName --json nameWithOwner,isPrivate,url
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo verificar el repositorio creado.' }
}
$repository = ($repoInfo | Out-String) | ConvertFrom-Json
if (-not $repository.isPrivate) { throw 'El repositorio existente no es privado. Revisar su configuración antes de publicar.' }
$expectedRemote = $repository.url + '.git'
$existingOrigin = git remote get-url origin 2>$null
if ($existingOrigin) {
  if ($existingOrigin.TrimEnd('/') -ne $expectedRemote -and $existingOrigin -ne ('git@github.com:' + $repositoryName + '.git')) { throw 'Origin apunta a otro destino. Revisarlo sin sobrescribir su configuración.' }
} else {
  git remote add origin $expectedRemote
}
git push --all --set-upstream origin
if ($LASTEXITCODE -ne 0) { throw 'Push de ramas rechazado; no se han forzado cambios.' }
git push origin --tags
if ($LASTEXITCODE -ne 0) { throw 'Push de etiquetas rechazado.' }
gh repo view $repositoryName --json url,isPrivate,defaultBranchRef

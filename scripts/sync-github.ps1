$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'use-local-tools.ps1')

Set-Location -LiteralPath $projectRoot
gh auth status --active --hostname github.com
if ($LASTEXITCODE -ne 0) { throw 'Autenticación no disponible. Resolver la restricción o usar gh auth login --web.' }
$githubOwner = gh api user --jq .login
if ($LASTEXITCODE -ne 0 -or -not $githubOwner) { throw 'No se pudo verificar la identidad de GitHub.' }
$repositoryName = $githubOwner.Trim() + '/flecha-trampa'

# Scope the credential helper to these commands. Other projects and stored accounts are untouched.
function Invoke-GitHubGit {
  & git -c 'credential.helper=' -c 'credential.helper=!gh auth git-credential' @args
}

$ErrorActionPreference = 'Continue'
$repoInfo = gh repo view $repositoryName --json nameWithOwner,isPrivate,url 2>&1
$lookupExit = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
if ($lookupExit -ne 0) {
  if (($repoInfo | Out-String) -notmatch 'Could not resolve to a Repository|404|Not Found') { throw ($repoInfo | Out-String) }
  gh repo create $repositoryName --private --description 'Juego móvil de puzles de flechas desarrollado con TypeScript, Phaser y Capacitor.'
  if ($LASTEXITCODE -ne 0) { throw 'GitHub rechazó la creación del repositorio.' }
  $repoInfo = gh repo view $repositoryName --json nameWithOwner,isPrivate,url
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo verificar el repositorio creado.' }
}
$repository = ($repoInfo | Out-String) | ConvertFrom-Json
if (-not $repository.isPrivate) { throw 'El repositorio existente no es privado. Revisar su configuración antes de publicar.' }
$expectedRemote = $repository.url + '.git'
$existingOrigin = git config --get remote.origin.url
if ($existingOrigin) {
  if ($existingOrigin.TrimEnd('/') -ne $expectedRemote -and $existingOrigin -ne ('git@github.com:' + $repositoryName + '.git')) { throw 'Origin apunta a otro destino. Revisarlo sin sobrescribir su configuración.' }
} else {
  git remote add origin $expectedRemote
}
$remoteHeads = Invoke-GitHubGit ls-remote --heads origin
if ($LASTEXITCODE -ne 0) { throw 'No se pudo leer el historial remoto.' }
if ($remoteHeads) {
  if (-not ($remoteHeads -match 'refs/heads/main$')) { throw 'El remoto contiene ramas pero no main. Revisar su historial antes de publicar.' }
  foreach ($syncBranch in @('main', 'develop')) {
    if ($remoteHeads -match ('refs/heads/' + $syncBranch + '$')) {
      Invoke-GitHubGit fetch --no-tags origin ('refs/heads/' + $syncBranch + ':refs/remotes/origin/' + $syncBranch)
      if ($LASTEXITCODE -ne 0) { throw 'No se pudo comprobar la rama remota.' }
      git merge-base --is-ancestor ('origin/' + $syncBranch) $syncBranch
      if ($LASTEXITCODE -ne 0) { throw 'El remoto tiene cambios o un historial distinto. Revisar antes de sincronizar; no se ha forzado nada.' }
    }
  }
}
Invoke-GitHubGit push --all --set-upstream origin
if ($LASTEXITCODE -ne 0) { throw 'Push de ramas rechazado; no se han forzado cambios.' }
Invoke-GitHubGit push origin --tags
if ($LASTEXITCODE -ne 0) { throw 'Push de etiquetas rechazado.' }
gh repo view $repositoryName --json url,isPrivate,defaultBranchRef

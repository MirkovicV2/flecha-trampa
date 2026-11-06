# Ramas y publicación

## Trabajo diario

`main` contiene versiones verificadas. `develop` integra el desarrollo. Las ramas `feature/*` permanecen disponibles como historial de cada bloque. No se reescribe historial ni se usa force push.

```sh
git switch develop
git switch -c feature/nombre-concreto
# Implementar y verificar el bloque.
npm run check
npm run format:check
npm run test:e2e
git add <archivos-del-bloque>
git commit -m "feat(area): describe the resulting behavior"
git switch develop
git merge --no-ff feature/nombre-concreto
```

Cuando exista remoto, subir la feature y `develop` con seguimiento. Preferir PRs para revisión. No integrar una comprobación fallida. Las versiones de dependencias son exactas; acompañar cada actualización del lockfile y sus verificaciones.

## Recuperar GitHub

La cuenta guardada en GitHub CLI era `Mirkovic-beep`. `gh api user` y `gh repo create` devolvieron `HTTP 403: Sorry. Your account was suspended`. No se ha creado un remoto ni se han subido ramas. Ver [comprobación original](REMOTE_STATUS.md).

Tras resolver la restricción, ejecutar desde PowerShell:

```powershell
. .\scripts\use-local-tools.ps1
gh auth status
gh api user --jq .login
# Solo si es necesario volver a autenticar:
gh auth login --web --git-protocol https
.\scripts\sync-github.ps1
```

La autenticación usa el navegador y el almacén seguro. No escribir tokens en archivos del proyecto o mensajes de chat. El script obtiene la identidad real, crea `flecha-trampa` privado si falta, conserva un `origin` compatible y sube ramas y tags sin forzar. Un historial remoto diferente necesita revisión antes de sincronizar.

## Protección de main

**Estado actual: no activada ni verificable, por el rechazo de la cuenta y la ausencia de un repositorio creado.**

Después del primer push y de una ejecución correcta de CI, abrir Settings → Branches → Add branch protection rule para `main`. Exigir pull request, ramas actualizadas y comprobaciones `validate` y `browser-tests`. Impedir force push y borrado; aplicar también a administradores. Con una sola persona, el ejemplo exige PR y checks pero no una aprobación de otro revisor.

Puede aplicarse por API con el cuerpo revisable [branch-protection.json](../scripts/branch-protection.json):

```powershell
.\scripts\protect-main.ps1
```

El script hace PUT y después GET para comprobar el resultado. Un error de permisos o plan significa que la protección no está activa. Los repositorios privados necesitan un plan que admita estas reglas. [Documentación de protección de GitHub](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches).

## Release

Ejecutar `npm ci`, `npm run check`, `npm run format:check` y la batería completa de navegador. Revisar visualmente y comprobar `git status`. Integrar `develop` en `main` conservando historial y crear un tag anotado únicamente sobre el commit verificado.

Con protección remota, abrir PR `develop` → `main`, esperar ambos checks y fusionar mediante merge. Actualizar la copia local con `git pull --ff-only`, crear el tag y subirlo; después integrar `main` de vuelta en `develop`. Sin acceso remoto, realizar esos merges y la etiqueta localmente, dejando explícita la sincronización pendiente.

La versión v0.1.0 corresponde al MVP web. No equivale a una publicación en Google Play, App Store ni GitHub Releases.

# Estado de GitHub

Comprobado el 6 de noviembre de 2026 desde este ordenador con GitHub CLI 2.103.3.

## Cuenta y repositorio

- Autorización web de GitHub CLI completada; la credencial permanece en el almacén seguro de Windows.
- `gh auth status --active --hostname github.com` y `gh api user` confirman la cuenta activa `MirkovicV2`, identificador `352626378`.
- Repositorio creado y consultado por API: [MirkovicV2/flecha-trampa](https://github.com/MirkovicV2/flecha-trampa), **privado**, con permisos de administración y rama predeterminada `main`.
- `origin`: `https://github.com/MirkovicV2/flecha-trampa.git`.
- Se publicaron `main`, `develop` y las ramas de funcionalidad con seguimiento remoto, sin force push ni reescritura del historial.
- Etiqueta anotada `v0.1.0` comprobada por API: apunta al commit `6bb0af9fc1ad2139ebfa9757dd8c8228a524dc17`; no se ha movido.

## Integración continua

Actions está habilitado y el workflow `CI` está activo. Ejecuta `npm ci`, lint, formato, tests y build en `validate`, y pruebas de Chromium contra producción en `browser-tests`. Admite push, pull request y ejecución manual.

La [primera ejecución manual completa](https://github.com/MirkovicV2/flecha-trampa/actions/runs/42288421160), sobre el commit `2829cb458c515806af26da56a37e301708f3abc4`, terminó correctamente: `validate` y `browser-tests` con resultado `success`. Los logs confirman 64 pruebas de Vitest y 20 pruebas de navegador correctas en Linux. La ejecución anterior de la misma rama fue cancelada automáticamente por la regla de concurrencia al iniciar esta validación.

## Protección de main

El intento de aplicar las reglas mediante `scripts/protect-main.ps1` y la consulta de protección devolvieron **HTTP 403**:

```text
Upgrade to GitHub Pro or make this repository public to enable this feature.
```

La protección remota **no está activa**. Se conserva el repositorio privado. No se ha contratado un plan ni cambiado su visibilidad. El cuerpo de reglas está preparado en `scripts/branch-protection.json`; [el flujo documentado](GIT_WORKFLOW.md) explica cómo aplicarlo y comprobarlo cuando el plan lo permita.

## Autenticación y próximas sincronizaciones

La cuenta anterior `Mirkovic-beep` devolvía `HTTP 403: Sorry. Your account was suspended`. Esa credencial no se ha utilizado para crear ni subir este repositorio. El acceso quedó resuelto mediante autorización web de la cuenta `MirkovicV2`.

Desde PowerShell, ejecutar `scripts/sync-github.ps1`. El script consulta solo la identidad activa, conserva un remoto compatible, exige un repositorio privado, revisa el historial remoto y sube ramas y etiquetas sin forzar. El ayudante de credenciales de GitHub CLI se limita a sus comandos y no altera la configuración Git de otros proyectos.

Si fuera necesario volver a autenticar, utilizar `gh auth login --hostname github.com --web --git-protocol https --scopes workflow`. Completar la autorización en el navegador, sin introducir contraseñas ni tokens en el proyecto o en el chat.

# Estado de GitHub

## Versión 0.4.0 — 7 de noviembre de 2026

Cuenta activa verificada nuevamente con `gh auth status --active` y `gh api user`: `MirkovicV2`, identificador `352626378`. El repositorio conserva su visibilidad privada. Las nuevas funcionalidades se desarrollan en `feature/cosmetic-art`, `feature/chest-opening` y `feature/presentation-040`, integradas con merges controlados en `develop`. `feature/android-040` prepara la versión Android, la claridad de las siluetas y la comprobación nativa de las aperturas.

Las fuentes finales `575b649928fbc23b8b61720a0e320fd77e5a19fc` superan [CI web](https://github.com/MirkovicV2/flecha-trampa/actions/runs/42342520411), con 98 pruebas de lógica y 62 de navegador, y [Android release](https://github.com/MirkovicV2/flecha-trampa/actions/runs/42342520380), con una prueba nativa sin fallos, errores u omisiones. Los 18 archivos web de la APK firmada coinciden con los del candidato nativo probado. Ver [detalle y límites](VALIDATION.md).

La entrega se identifica con la etiqueta anotada `v0.4.0` y la [Release de Android](https://github.com/MirkovicV2/flecha-trampa/releases/tag/v0.4.0). El README contiene el enlace directo a `flecha-trampa-v0.4.0-android.apk`. Se conserva el certificado de actualización y las claves continúan fuera de Git. Los merges de publicación no cambian las fuentes del producto validado. Las versiones anteriores y su historial se conservan.

Las restricciones de protección de ramas descritas abajo continúan siendo aplicables; no se ha cambiado la visibilidad del repositorio para habilitarlas.

## Versión 0.3.0 — 7 de noviembre de 2026

La cuenta activa vuelve a estar verificada como `MirkovicV2` y el repositorio sigue siendo privado. Las funcionalidades se desarrollaron en `feature/seasonal-worlds`, `feature/preview-commerce` y `feature/frenzy-feedback`, con lint, tests y build antes de integrarlas en `develop`. `feature/android-030` añade la versión Android y el endurecimiento de la pausa.

El código `75ab59b008e155bf94d59b148f827f26e56cafcc` supera [CI web](https://github.com/MirkovicV2/flecha-trampa/actions/runs/42338601293) con 92 pruebas de lógica y 46 de navegador, y [Android release en emulador](https://github.com/MirkovicV2/flecha-trampa/actions/runs/42338601274) con 1 prueba sin fallos, errores u omisiones. La APK local conserva la firma anterior y contiene los mismos 11 archivos web que el candidato nativo comprobado por Actions.

La distribución se identifica con la etiqueta anotada `v0.3.0` y la [Release de Android](https://github.com/MirkovicV2/flecha-trampa/releases/tag/v0.3.0). El README contiene el enlace directo a `flecha-trampa-v0.3.0-android.apk`. Se publican los binarios como assets de Release; las claves y las credenciales siguen fuera de Git. El pase y los anuncios de esta versión son simulaciones etiquetadas, sin cobro real.

Los apartados siguientes conservan la comprobación y las restricciones de la publicación inicial.

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

## APK Android

La versión Android se distribuye en la [Release v0.1.1](https://github.com/MirkovicV2/flecha-trampa/releases/tag/v0.1.1), con APK firmada, SHA-256 y certificado público. El workflow adicional `android.yml` valida el proyecto nativo y ejecuta pruebas de guardado y de la interfaz release en emulador. La clave privada de distribución no se sube al repositorio ni a Actions. Ver [alcance Android](MOBILE.md).

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

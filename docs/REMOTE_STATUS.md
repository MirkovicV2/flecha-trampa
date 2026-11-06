# Estado de GitHub

Comprobado el 6 de noviembre de 2026 desde este ordenador con GitHub CLI 2.103.3.

- `gh auth status`: cuenta activa guardada en el almacén seguro, `Mirkovic-beep`; la credencial fue rechazada.
- `gh api user`: HTTP 403, `Sorry. Your account was suspended`.
- `gh repo create flecha-trampa --private --description "Juego móvil de puzles de flechas desarrollado con TypeScript, Phaser y Capacitor."`: `HTTP 403: Sorry. Your account was suspended (https://api.github.com/graphql)`.
- No se ha creado ni verificado ningún repositorio remoto. No se ha realizado ningún push.
- No se ha configurado protección de ramas en GitHub porque no hay repositorio accesible.

El historial y las ramas están disponibles localmente. Tras resolver la restricción de la cuenta, ejecutar `scripts/sync-github.ps1`. El script consulta la identidad real, conserva un remoto existente compatible, exige un repositorio privado y sube ramas y etiquetas sin force push.

Si es necesario volver a autenticar, utilizar `gh auth login --web --git-protocol https`; no introducir credenciales en el código ni en mensajes de chat. La suspensión debe resolverse con GitHub antes de sincronizar.

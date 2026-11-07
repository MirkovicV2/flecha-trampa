# Flecha Trampa 0.8.0 — candidato

Estado: fuentes preparadas para validación del SHA final; sin publicación ni firma de distribución. Android: `versionName 0.8.0`, `versionCode 9` (anterior: 0.7.0 / 8).

- Rediseño de pantallas y navegación móvil/escritorio; botón de pistas legible con hover, foco, estado deshabilitado y toque.
- Corrección del clic retrasado que convertía un arrastre cancelado en movimiento.
- Pruebas separadas para las 32 skins y guardado exacto del tablero; comprobación nativa conjunta de pistas restantes y pistas usadas.
- Preparación de CI para reducir ejecuciones duplicadas de ramas y evitar que un ANR del launcher robe el foco del emulador, conservando evidencia y fallos reales.

No cambia el generador, las semillas, los esquemas de progreso, la economía ni la identidad de firma. Los anuncios y compras siguen siendo simulaciones de prueba.

Antes de distribuir: completar en el mismo candidato los checks remotos de lógica, ambos proyectos de navegador y Android instrumentado, incorporar cualquier corrección de revisión y comprobar la APK firmada con la clave existente. La instrumentación remota **todavía no se ha ejecutado** para estas fuentes; las pruebas de Chromium y la compilación debug local no prueban teléfonos físicos.

Detalle de causas, evidencia y límites: [CI_STABILITY.md](CI_STABILITY.md). Historial: [CHANGELOG.md](../CHANGELOG.md). El coordinador realizará la validación remota y la publicación después de superar los gates.

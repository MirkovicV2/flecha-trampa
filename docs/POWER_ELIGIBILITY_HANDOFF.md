# Corrección de bolsa por elegibilidad · Desarrollo

Entrega del 8 de noviembre de 2026 para `flecha-trampa-lavado-20261107`. Trabajo realizado exclusivamente en el checkout aislado asignado, conservando todos los cambios recibidos. No se editó el repositorio original, ni se delegó, publicó, hizo commit, merge o push. Quedan QA y Revisión independientes en el pipeline acordado.

## Comportamiento implementado

La bolsa contiene Pulso, Rayo y Nova una vez por ciclo. Se reconstruye desde el inicio de la campaña usando semillas y tableros originales: solo avanza cuando el efecto que ocupa la siguiente posición tiene objetivos válidos. Un tablero incompatible conserva esa posición para el siguiente nivel; no busca otro efecto que le favorezca. No hay contadores de visitas, consumo por recarga, ni aleatoriedad nueva al reintentar. Una caché desechable de una campaña evita repetir prefijos ya calculados; acceder primero a un nivel avanzado calcula el mismo prefijo que acceder en orden.

Los intentos nuevos guardan `powerPolicy: 'eligible-v1'`. Esto distingue un reparto vacío deliberado de un guardado antiguo que debe conservar su comportamiento de introducción. La continuación mantiene tipo, identificador y estado gastado sin recalcular la bolsa. Reintentar un guardado antiguo conserva su tipo (Pulso si falta el campo) y su flecha identificada; reintentar un reparto nuevo vacío lo mantiene vacío. El validador acepta guardados antiguos y valida el nuevo marcador opcional.

Los niveles sin poder no muestran ayuda específica, distintivo ni anuncio/recompensa de especial. Se conserva la ayuda consultable después de gastar un poder que sí estaba asignado, la memoria de «Entendido» por tipo y el resto del feedback. El texto de reparto coincide con UX: «En cada grupo de tres niveles con objetivos válidos aparece una vez cada tipo, en orden barajado; reintentar o recargar conserva el poder». No se cambiaron diseño, controles, animaciones, semillas de tableros, economía, otros modos ni cadencia de Supervivencia.

## Regresiones y comprobaciones

- `tests/power-eligibility.test.ts`: usa exactamente `classic:qa-eligibility-0` y un fixture de nivel 1 sin objetivos; el nivel 1 entrega `null`, sin tipo ni ayuda, y los niveles 2–4 entregan **Rayo / Pulso / Nova**. El runId con la configuración de campaña actual, por sí solo, genera un nivel 1 que sí tiene objetivos para Rayo; por eso la regresión fija explícitamente la condición de tablero sin objetivos descrita por QA, sin modificar el generador del producto.
- Cubre 18 niveles elegibles con 18 no elegibles intercalados, seis ciclos completos, un tablero con objetivos para Pulso pero sin objetivos para el siguiente Rayo, acceso inverso y repetido, caché frente a reconstrucción desde cero, reintento, serialización y especial gastado. Los tests previos conservan cobertura de choques sin consumo, efectos, guardados antiguos, mapa y Supervivencia.
- `npm run check`: lint sin advertencias, **21 archivos / 164 tests correctos**, TypeScript y build de producción correctos. [Log final](../.artifacts/commercial-review/web-check-eligibility-final.log). Tras añadir la aserción explícita Rayo/Pulso/Nova se repitió la regresión: **3/3** correctas ([log](../.artifacts/commercial-review/regression-eligibility-final.log)).
- Playwright contra el build de producción terminado: **10/10**, móvil y escritorio. Incluye nivel sin poder al continuar/reiniciar/recargar, ausencia de ayuda/distintivo/anuncio y reintento de un guardado antiguo Nova; también pasan los ocho casos existentes de flujo, mapa, accesibilidad, ayuda, almacenamiento y Supervivencia. [Log final](../.artifacts/commercial-review/e2e-eligibility-final.log).
- Prettier sobre los ocho archivos de código/pruebas modificados y `git diff --check`: correctos. Las primeras comprobaciones detectaron un fixture que no respetaba el recuento del validador, una consulta Playwright ambigua y una tilde dañada al editar; quedaron corregidos antes de la verificación final. Un intento de navegador se inició durante el build y leyó assets anteriores; la evidencia final corresponde a una ejecución posterior al build completo.
- `cap sync android`, seguido de Gradle offline `:app:assembleDebug :app:lintDebug :app:testDebugUnitTest`: **BUILD SUCCESSFUL**, lint **0 errores / 11 avisos** existentes. `testDebugUnitTest` informa `NO-SOURCE`; no se presenta como una suite nativa ejecutada. [Log final](../.artifacts/commercial-review/android-build-eligibility-final.log).

## APK debug vigente

[flecha-trampa-eligibility-debug.apk](../.artifacts/commercial-review/flecha-trampa-eligibility-debug.apk), **4.535.204 bytes**, paquete `com.flechatrampa.game.debug`, versión 0.7.0 / código 8. La APK anterior se conserva separada.

SHA-256: `ef3b6dc95ee7be1a66d276d5d6f79eb5fc2b7c4812a7a5e610d0755c847fbf40`.

Firma v2 verificada y mismo certificado debug anterior: `5c8c37ab2f887312679c026f37897f790fda6c863056292cf5d5a7825419d0c5`. Se usó `ANDROID_USER_HOME=<checkout>/.android-home` para conservar la clave local. Alineación de 4 bytes y CRC correctos; **16/16 archivos de dist idénticos** a los empaquetados, sin assets de otro build; solo se añaden los dos puentes Cordova esperados. Evidencia: [validación](../.artifacts/commercial-review/apk-validation-eligibility.json), [firma](../.artifacts/commercial-review/apk-signature-eligibility.txt), [alineación](../.artifacts/commercial-review/apk-alignment-eligibility.txt).

Instalar sobre la variante debug anterior con `adb install -r .artifacts/commercial-review/flecha-trampa-eligibility-debug.apk`; no desinstalar si se quiere conservar el progreso.

## Archivos y riesgos para QA/Revisión

Modificados por esta corrección: `src/core/special-arrow.ts`, `src/services/session.ts`, `src/services/save-validation.ts`, `src/ui/app.ts`, `src/ui/game-screen.ts`, `tests/campaign-upgrade.test.ts`, `tests/power-eligibility.test.ts`, `e2e/campaign-upgrade.spec.ts`, este informe, `docs/DEVELOPMENT_HANDOFF.md` y `docs/COMMERCIAL_REVIEW.md`. La sincronización actualizó assets generados de Android; no cambió código nativo ni configuración de firma. El resto del checkout sucio recibido se conserva.

No hay dispositivos ADB conectados: falta instalación e instrumentación en hardware, además del juicio independiente de QA/Revisión. El cálculo en frío de un intento nuevo en una campaña muy avanzada requiere regenerar el prefijo de tableros (coste proporcional al nivel); la caché reduce el coste en accesos posteriores del mismo proceso, pero QA debe valorar ese arranque en Android con campañas largas. Continuar una sesión guardada no reconstruye ese prefijo. No hubo desviaciones visuales de UX; la elegibilidad se define por los objetivos del siguiente efecto de la bolsa, sin reroll alternativo.

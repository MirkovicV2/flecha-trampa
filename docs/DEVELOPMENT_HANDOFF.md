# Entrega de Desarrollo · Flecha Trampa

**Actualización vigente (8 de noviembre de 2026):** la corrección del bloqueo de QA, comprobaciones y APK actual están en [POWER_ELIGIBILITY_HANDOFF.md](POWER_ELIGIBILITY_HANDOFF.md). El informe siguiente conserva la entrega previa como historial; su descripción de bloques absolutos y su APK quedan sustituidas por esa actualización.

Trabajo realizado únicamente en el checkout aislado `workspaces/flecha-trampa`, sin delegar, commit, merge, push, publicación, despliegue, servicios de pago ni autoRun. El estado recibido ya contenía implementación y evidencia del mapa, portada, Pulso/Rayo/Nova y cadencia continua de Supervivencia; se conservaron esos cambios junto con el flujo móvil y la variante debug. Esta entrega completa y verifica esa implementación; QA y Revisión son las siguientes etapas del coordinador.

## Cambios completados en esta intervención

- Ayuda de especiales desplegable mediante toque o teclado, con nombre, símbolo, efectos de los tres tipos, requisito de salida libre y pérdida de vida al chocar. Aparece abierta la primera vez que se ofrece cada tipo; «Entendido» la cierra y devuelve el foco a su cabecera. Puede consultarse otra vez incluso después de gastar el especial.
- La ayuda queda después del tablero para priorizar el puzle y conserva objetivos táctiles de al menos 44 px. No usa modal, temporizadores ni bloqueo de controles.
- `powerTutorialsSeen` es opcional y guarda hasta tres tipos válidos en el perfil existente. Los perfiles anteriores conservan su forma y no necesitan migración ni reinicio. Un primer test detectó que añadir un array vacío durante la decodificación alteraba las comparaciones de perfiles antiguos; se corrigió antes de las comprobaciones finales.
- «Volver» en el mapa sigue la misma secuencia de Escape/atrás: cierra la ficha seleccionada y después vuelve al origen. El feedback del especial muestra el efecto adicional con «Rayo: +2 flechas», por ejemplo.

Archivos modificados en esta intervención: `src/ui/app.ts`, `src/ui/game-screen.ts`, `src/ui/campaign-map.css`, `src/services/progress.ts`, `src/services/save-validation.ts`, `tests/campaign-upgrade.test.ts`, `e2e/campaign-upgrade.spec.ts`, `docs/COMMERCIAL_REVIEW.md` y este informe. Los archivos ya modificados antes de recibir la tarea se conservaron; no se editó el juego original.

## Comprobaciones finales

- `npm run check` con Node local 24.11.1: lint sin advertencias, **20 archivos / 161 tests correctos**, TypeScript y build web correctos. [Log](../.artifacts/commercial-review/web-check-development.log).
- Playwright sobre producción: **8/8 pruebas correctas** en móvil y escritorio. Incluye portada a 320 × 568, mapa con nodos bloqueados, teclado, capítulos, drag sin selección, coste y CTA, ayuda descartable y recuperada tras recarga, guardados antiguos, avance, reducción de movimiento, límite de partículas, Supervivencia y fallo de almacenamiento. [Log](../.artifacts/commercial-review/e2e-development.log).
- Prettier sobre los archivos de código editados y `git diff --check`: correctos.
- `cap sync android` seguido de Gradle offline `:app:assembleDebug :app:lintDebug`: **BUILD SUCCESSFUL**, lint nativo **0 errores / 11 avisos** existentes de dependencias, orientación y recursos. [Log](../.artifacts/commercial-review/android-build-development.log).
- APK debug: firma v2 y certificado debug anterior verificados, alineación de 4 bytes correcta, CRC correcto y **16/16 archivos de dist idénticos** a los empaquetados, sin assets de builds anteriores. [Validación](../.artifacts/commercial-review/apk-validation.json), [firma](../.artifacts/commercial-review/apk-signature.txt), [alineación](../.artifacts/commercial-review/apk-alignment.txt).
- `adb devices` no muestra dispositivos: no se afirma instalación ni ejecución física. Los servidores de pruebas terminaron al acabar.

## APK y prueba en teléfono

[Descargar APK debug final](../.artifacts/commercial-review/flecha-trampa-commercial-review.apk), **4.597.258 bytes**. SHA-256: `74ae3f6b3286799e5775a6638b4a0cd1c90b5ea326d6b628c2113307077de83a`.

Paquete `com.flechatrampa.game.debug`, versión 0.7.0 / código 8, nombre FLECHA TRAMPA DEBUG. Instalar sobre la variante debug anterior con `adb install -r .artifacts/commercial-review/flecha-trampa-commercial-review.apk`, o abrir el archivo en Android. No desinstalar para conservar progreso; release mantiene almacenamiento independiente. Se conserva la firma debug con certificado SHA-256 `5c8c37ab2f887312679c026f37897f790fda6c863056292cf5d5a7825419d0c5`.

1. Abrir con guardado anterior y comprobar nivel, energía, tablero y continuación sin coste; consultar completados y bloqueados en el mapa, arrastrar y recorrer circuitos sin iniciar partida accidentalmente.
2. Jugar niveles consecutivos para observar Pulso, Rayo y Nova; consultar su ayuda, cerrar con «Entendido», pausar, guardar al mapa y recargar. La explicación cerrada debe seguir cerrada para el mismo tipo y poder abrirse otra vez. Un choque resta vida y conserva el especial; una salida legal muestra el número de piezas adicionales.
3. Comprobar combos, partículas y que el tablero acepta el siguiente movimiento al concluir la animación de salida. Activar reducción de movimiento del sistema y del juego y confirmar feedback textual sin partículas.
4. En Supervivencia observar entradas con piezas presentes, intervalo descendente hacia 2,2 s, umbral del 70 % y margen de diez segundos; pausa y segundo plano deben detener temporizadores. La prueba reproducible de diez minutos atraviesa oleadas y recargas con estados válidos.
5. Probar atrás Android, escalado de texto, áreas seguras, sonido y vibración reales. QA debe juzgar legibilidad y balance de partidas largas en hardware.

## Límites y riesgos concretos

La validación estructural acredita una APK firmada y empaquetada; falta instalarla en un teléfono autorizado y realizar QA/Revisión independientes. El mapa corto muestra menos nodos a la vez para mantener ficha y navegación, y los completados son consulta sin repetición para proteger progreso y recompensas, conforme a UX. El reparto actual baraja por bloques de tres niveles de campaña; si un tablero excepcional no tiene objetivos válidos para el efecto asignado, no se concede especial y no se desplaza la bolsa: diferencia con la frase «tres niveles elegibles» de UX que QA debe valorar, sin afectar semillas ni guardados existentes. No se alteraron campañas, economía, controles ni la curva activa de Supervivencia en esta intervención.

# Flecha Trampa: portada, mapa y ritmo

Entrega de Desarrollo del 7 de noviembre de 2026, exclusivamente en `workspaces/flecha-trampa`, para continuar el pipeline secuencial con QA y Revisión. No se ha hecho commit, merge, push, publicación, despliegue ni delegación. Se han conservado las modificaciones locales anteriores del flujo móvil, Supervivencia y la variante Android debug; no se ha accedido al repositorio original.

Actualización de esta entrega: véase [DEVELOPMENT_HANDOFF.md](DEVELOPMENT_HANDOFF.md) para los cambios sobre el estado local recibido, las comprobaciones repetidas y la APK regenerada. Ese informe y `apk-validation.json` contienen la evidencia final vigente.

## Comportamiento entregado

- Portada con «Jugar nivel N» / «Continuar nivel N», coste explícito y acceso directo al mapa. A 320 × 568 el CTA de campaña queda visible sin desplazamiento. Se conservan Inicio, Modos, Tu progreso, Recompensas, energía real y los modos anteriores.
- Mapa físico de circuito original con camino sinuoso, diez nodos por capítulo, números siempre visibles, verificación de completados, candados, aro y etiqueta de posición actual, selección y foco independientes. Se abre centrado en el actual y permite desplazamiento libre, capítulos contiguos e «Ir a mi nivel»; solo mantiene diez nodos montados incluso en campañas largas.
- Tocar selecciona; el CTA separado inicia o continúa el nivel actual. Un gesto que se desplaza más de 8 px no selecciona. Los bloqueados se pueden consultar. Los completados se infieren exclusivamente de `profile.level`, sin inventar estrellas ni recompensas: quedan en consulta, conforme a la alternativa explícita de UX para evitar sobrescribir la campaña o duplicar premios.
- Tab recorre los controles; flechas recorren los nodos, Inicio/Fin sus extremos y Enter/Espacio seleccionan. Escape/atrás Android y «Volver» cierran primero la selección y después regresan al origen. Pausa ofrece «Seguir jugando» y «Guardar y volver al mapa». Se conservan selección/desplazamiento al volver de la partida y se enfoca el nuevo nivel después de una victoria.
- En móvil, ficha y CTA quedan fijados por encima de la navegación; el camino adapta su altura y permite desplazarse dentro de él. En pantallas cortas se priorizan nodo y controles sobre el texto introductorio.
- Un aviso persistente explica el riesgo de perder la sesión si falla el almacenamiento. Sigue visible al cambiar de pantalla; no se declara un guardado exitoso cuando el almacenamiento falla.

## Especiales y efectos

Se conserva la salida legal como requisito: una flecha bloqueada pierde una vida y no consume ni activa el especial. Solo se retiran piezas, sin alterar direcciones ni posiciones ni crear bloqueadores nuevos.

| Especial | Distintivo | Efecto adicional máximo                                                                        |
| -------- | ---------- | ---------------------------------------------------------------------------------------------- |
| Pulso    | ✦ dorado   | Dos piezas cercanas de la misma dirección, distancia Manhattan ≤ 2; regla anterior conservada. |
| Rayo     | ↔ azul     | Tres piezas de la fila o columna de la flecha origen, priorizando cercanía.                    |
| Nova     | ✳ violeta  | Tres piezas vecinas, incluyendo diagonales, de cualquier dirección.                            |

Cada ciclo de tres niveles elegibles recibe los tres efectos en un orden barajado con semilla de campaña y ciclo; un tablero sin objetivos para el siguiente efecto no consume posición ni anuncia u otorga un poder. Repetir un intento o recargar conserva el mismo reparto. El identificador y el tipo se guardan; los guardados antiguos sin tipo siguen usando Pulso y un especial gastado permanece gastado. La corrección, sus regresiones y la APK vigente se documentan en [POWER_ELIGIBILITY_HANDOFF.md](POWER_ELIGIBILITY_HANDOFF.md); los tamaños, hashes y comprobaciones de APK indicados más abajo pertenecen a la entrega anterior conservada como historial.

La explicación se muestra junto al tablero y en el nombre accesible de la flecha. Al activarlo se anuncian nombre y piezas despejadas, y la explosión incorpora color y texto propios. Se mantienen los combos, sonidos sintetizados y vibración existentes. La capa decorativa no intercepta inputs, limita a 72 sus partículas DOM, limpia animaciones al navegar/pausar y respeta reducción de movimiento tanto del sistema como del juego; con reducción se conserva el feedback textual y se omiten partículas y callouts.

## Supervivencia

El intervalo depende ahora del tiempo **activo total**, no del número de oleadas: `2200 + 2800 × exp(−elapsedMs / 150000)` milisegundos. Comienza en 5 s, llega aproximadamente a 4,08 s al minuto, 3,23 s a los 2,5 minutos y 2,25 s a los diez minutos, acercándose suavemente al piso de 2,2 s. Cambiar de oleada no reinicia el ritmo; pausa y segundo plano conservan los temporizadores.

El HUD muestra tiempo activo, ocupación, siguiente entrada, intervalo y presión acumulada. Se conservan reserva resoluble, lotes acotados de 2–4 piezas por oleada, umbral de congestión del 70 %, margen de diez segundos y tres vidas para toda la sesión. El guardado anterior de entradas conserva su cuenta pendiente; al producirse la siguiente entrada se aplica el nuevo intervalo. Los guardados antiguos de oleadas siguen siendo aceptados.

## Archivos de esta intervención

| Archivo                                                           | Responsabilidad                                                                                   |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/ui/campaign-map.ts`, `src/ui/campaign-map.css`               | Mapa, composición original, estados y adaptación móvil.                                           |
| `src/ui/app.ts`                                                   | Navegación, teclado/atrás, reanudación, selección, drag, centrado, feedback y aviso de guardado.  |
| `src/ui/home.ts`, `src/ui/game-screen.ts`, `src/main.ts`          | Entrada comercial, explicación de especiales, HUD y carga de estilos.                             |
| `src/core/special-arrow.ts`, `src/core/game.ts`                   | Tres efectos, reparto y transición pura, preservando Pulso.                                       |
| `src/services/session.ts`, `src/services/save-validation.ts`      | Persistencia opcional de tipo y compatibilidad.                                                   |
| `src/services/survival.ts`                                        | Intervalo continuo por tiempo activo.                                                             |
| `src/ui/combo-effects.ts`                                         | Explosiones y textos propios de cada especial con límites existentes.                             |
| `tests/campaign-upgrade.test.ts`                                  | Seis tests nuevos de efectos, reparto, guardados, mapa y cadencia.                                |
| `e2e/campaign-upgrade.spec.ts`, `playwright.commercial.config.ts` | Flujo real en navegador sobre producción, puerto 49187 para evitar servicios ajenos en 4173/4187. |
| `eslint.config.js`, `.prettierignore`                             | Excluir cachés nativas generadas de las herramientas de código web.                               |
| `docs/COMMERCIAL_REVIEW.md`                                       | Informe e instrucciones.                                                                          |

No se han editado en esta intervención `.gitignore`, `android/app/build.gradle`, `src/core/types.ts`, `src/scenes/BoardScene.ts`, `src/services/progress.ts`, `src/ui/styles.css`, `src/ui/mobile-flow.css`, `docs/MOBILE_REVIEW.md` ni los recursos Android debug que ya estaban modificados. Las herramientas Android/Java descargadas y los resultados están dentro de carpetas ignoradas del checkout.

## Comprobaciones y evidencia

- `npm run check`: lint sin advertencias, **20 archivos / 161 tests**, TypeScript y build web correctos. Tras los últimos ajustes menores de mapa se repitieron lint, los seis tests nuevos y el build final.
- Prettier en todos los archivos de código intervenidos y `git diff --check`: correctos.
- Playwright sobre el build de producción con `playwright.commercial.config.ts`: **8/8 pruebas correctas**, en proyectos móvil y escritorio, de portada a 320 × 568, mapa a 390 × 844, bloqueo, teclado, drag, capítulos, coste, CTA por encima de navegación, continuación tras recarga, efectos limitados, victoria, avance, guardados antiguos, reducción de movimiento, Supervivencia y fallo persistente de guardado. Evidencia y resultado final en [log E2E](../.artifacts/commercial-review/e2e-preview.log).
- Gradle `:app:assembleDebug :app:lintDebug`: correcto; lint nativo **0 errores y 11 avisos**, relativos a dependencias/Gradle, orientación y recursos existentes. [Log nativo](../.artifacts/commercial-review/android-build-final.log). El primer intento offline identificó el AAR ausente de splashscreen; se resolvió con la dependencia oficial. Un intento de lint coincidió con regeneración de Capacitor; se repitió secuencialmente con éxito. El ensamblado definitivo se hace después del build web final.
- Capturas: [portada 320](../.artifacts/commercial-review/home-320.png), [mapa 390](../.artifacts/commercial-review/map-390.png), [avance](../.artifacts/commercial-review/map-progress.png), [especial](../.artifacts/commercial-review/power-explosion.png), [Supervivencia](../.artifacts/commercial-review/survival-390.png).
- Logs: [suite completa](../.artifacts/commercial-review/web-check.log), [lint final](../.artifacts/commercial-review/lint-final.log), [tests nuevos](../.artifacts/commercial-review/upgrade-tests-final.log), [build web final](../.artifacts/commercial-review/web-build-final.log).

## APK de revisión e instrucciones

APK final: [flecha-trampa-commercial-review.apk](../.artifacts/commercial-review/flecha-trampa-commercial-review.apk). Variante debug, paquete `com.flechatrampa.game.debug`, versión 0.7.0 / código 8; mantiene el nombre y la firma debug anterior. Convive con release y conserva los datos de la variante debug al actualizar con la misma firma; el paquete release tiene almacenamiento independiente. No desinstalar la variante debug anterior para conservar sus datos.

Tamaño final: **4.597.258 bytes**. SHA-256 de la APK: `74ae3f6b3286799e5775a6638b4a0cd1c90b5ea326d6b628c2113307077de83a`. Firma v2 y alineación de 4 bytes verificadas; los **16 archivos** del build web coinciden byte a byte y no hay assets de builds anteriores.

La firma, alineación, metadatos y coincidencia byte a byte de `dist` con `assets/public` de la APK quedan documentados en `apk-validation.json`, `apk-signature.txt`, `apk-alignment.txt` y `apk-badging.txt`, dentro de `.artifacts/commercial-review`.

Para recompilar con los datos y la firma anteriores, usar `ANDROID_USER_HOME=<checkout>/.android-home`, además de `JAVA_HOME=<checkout>/.tools/jdk21/jdk-21.0.13+9`, `ANDROID_HOME=<checkout>/.tools/android-sdk` y `GRADLE_USER_HOME=<checkout>/.gradle-home`. Después del build web y `cap sync android`, ejecutar `android/gradlew.bat --project-dir android --offline --no-daemon --max-workers=2 :app:assembleDebug :app:lintDebug`. La firma final conserva el certificado SHA-256 `5c8c37ab2f887312679c026f37897f790fda6c863056292cf5d5a7825419d0c5`, comprobado también contra la APK debug previa; no usar la clave global de otro entorno.

1. Transferir la APK al teléfono y abrirla con el instalador Android, o ejecutar `adb install -r .artifacts/commercial-review/flecha-trampa-commercial-review.apk` con un teléfono autorizado. Abrir **FLECHA TRAMPA DEBUG**.
2. Con un guardado previo debug, comprobar nivel, energía y continuación sin cobro. En portada probar el CTA y «Ver mapa»; consultar un completado y un bloqueado, arrastrar el camino y confirmar que no empieza una partida. Probar capítulos, «Ir a mi nivel» y volver.
3. Iniciar el actual, activar cada especial al aparecer y contrastarlo con su explicación. Un choque no activa el efecto. Completar tres niveles para observar el reparto; comparar número de piezas y vidas antes y después, combos y partículas. Pausar, guardar al mapa, cerrar y reabrir para verificar continuidad.
4. En Supervivencia comprobar las entradas con piezas todavía presentes, el intervalo decreciente, la congestión y las vidas; pausar y volver al segundo plano para comprobar que no se acumulan entradas. La prueba de lógica de diez minutos cubre reproducción y validez tras cada tick; la valoración humana del ritmo sigue siendo necesaria.
5. Activar reducción de movimiento del sistema y del juego, sonido/vibración y ampliación/rutas; probar Android atrás, barras del sistema, escala de texto y las pantallas más pequeñas disponibles.

## Límites y siguiente etapa

No hay teléfono conectado por ADB; **no se ha instalado ni ejecutado la APK en hardware físico** ni se ha realizado instrumentación Android. Firma y estructura se verifican con herramientas oficiales; la revisión física, audio/vibración real, áreas seguras y juicio de balance corresponden a QA/Revisión. El mapa muestra menos nodos simultáneos en 320 × 568 para conservar el CTA y la navegación; sigue permitiendo recorrer los diez de cada capítulo. La repetición de completados se deja expresamente en consulta para proteger campaña/recompensas, tal como permite UX.

Los servidores de Playwright se detienen al terminar. No se ha activado autoRun ni se ha iniciado ningún otro proyecto. El coordinador debe continuar con QA y Revisión, y decidir la integración posterior autorizada por Daniel.

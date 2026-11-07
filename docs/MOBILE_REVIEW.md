# Revisión móvil y Supervivencia — 7 de noviembre de 2026

Implementado en `workspaces/flecha-trampa`, rama `codex/flecha-trampa-mobile-flow`, sin commit, push, publicación ni delegación. El checkout ya tenía modificaciones locales en juego, guardado, interfaz y variante Android debug; se conservaron. No se leyeron ni editaron las fuentes del juego original: el coordinador autorizó únicamente ejecutar sus herramientas Node 24, JDK 21 y SDK Android ya instaladas, manteniendo cachés y salidas dentro de este checkout.

## APK para Daniel

- Archivo: [flecha-trampa-mobile-survival-review.apk](../.artifacts/mobile-review/flecha-trampa-mobile-survival-review.apk).
- Tamaño: **4.913.288 bytes**.
- SHA-256: `91AF3633536B86AC76CBC0D34B61BCC9E3648B570C62A4C41EDBC7315C83EC14`.
- Variante **debug**, paquete `com.flechatrampa.game.debug`, nombre **FLECHA TRAMPA DEBUG**, versión 0.7.0 / código 8. Convive con la aplicación release; su progreso es independiente del paquete release.
- Firma Android Debug existente, esquema v2 verificado por `apksigner`; certificado SHA-256 `5c8c37ab2f887312679c026f37897f790fda6c863056292cf5d5a7825419d0c5`.
- `zipalign -c 4`: correcto. Los **16 archivos** de `dist` coinciden byte a byte con los incluidos en `assets/public` de esta APK.
- Compilación final realizada después del último cambio de código. No se creó una versión release ni se generaron credenciales nuevas.

## Causa corregida y decisiones

La especial estaba limitada al nivel 5 y después a uno de cada tres niveles. Supervivencia encadenaba tableros completos tras vaciarlos, por lo que durante la partida se comportaba como campaña.

- La portada móvil coloca el botón de campaña y su progresión antes del contenido secundario. Mantiene la identidad gráfica propia de circuito, las tipografías y recursos locales; la decoración deja de empujar la acción principal hacia abajo.
- La especial se selecciona desde el nivel 1 cuando existen objetivos cercanos compatibles. Lleva borde dorado, símbolo **✦**, explicación junto al tablero y nombre accesible. Los guardados antiguos sin asignación y los intentos intactos sin especial reciben una selección; una especial consumida no vuelve a concederse al continuar.
- Su regla permanece: una salida legal elimina hasta dos piezas de la misma dirección a distancia Manhattan máxima 2, con selección determinista por cercanía. Un bloqueo solo resta una vida. El mensaje del pulso indica cuántas piezas se despejaron; la explicación se oculta al consumirlo.
- Feedback persistente con texto y color diferenciados para despeje, bloqueo, vida perdida, entrada de flechas, congestión y especial. La lectura de rutas conserva sus marcas y mensajes de selección; completar el tablero conserva la pantalla de resultado.
- Supervivencia comienza con **10 piezas** de un tablero de **6 × 6** y una reserva de piezas. En oleada 1 entran **2 cada 5 segundos**, incluso mientras quedan otras piezas. Cada oleada reduce 300 ms el intervalo hasta 2,2 s; el lote sube a 3 desde la oleada 4 y a 4 desde la 7. Desde la 6 el tablero pasa a 7 × 7.
- Congestión al alcanzar el 70 % de las celdas, redondeado hacia arriba: **26 piezas en 6 × 6** y **35 en 7 × 7**. El aviso muestra diez segundos para bajar de ese umbral; si no se consigue, resta una vida y reinicia el margen de diez segundos. Bajar del umbral cancela la cuenta. Tres vidas agotadas terminan la sesión; no se recuperan vidas al cambiar de oleada.
- Las entradas usan únicamente piezas de un mismo tablero generado y resoluble. Cualquier subconjunto conserva un grafo de bloqueos sin ciclos; las entradas no pueden crear un tablero imposible. No se declara victoria mientras queden piezas en reserva, aunque el tablero visible esté vacío.
- Se guardan reserva, próxima entrada y tiempo de congestión; pausa y segundo plano detienen la presión. Los guardados antiguos de Supervivencia conservan sus piezas y vidas y pasan a entradas progresivas en la siguiente oleada.
- El generador, semillas de campaña, diario UTC, retos compartidos, economía y recompensas no se modificaron. No se añadieron servicios, peticiones de red, analítica ni compras. Las animaciones de entradas usan la reducción de movimiento existente del renderer; el feedback nuevo usa texto, símbolos y superficies estáticas.

## Archivos de esta intervención

| Archivo | Cambio |
| --- | --- |
| `src/core/special-arrow.ts` | Retirar la espera hasta nivel 5 y la cadencia cada tres niveles. |
| `src/services/survival.ts` | Reserva, entradas, presión, congestión y compatibilidad con sesiones antiguas. |
| `src/services/session.ts` | Preparar oleadas progresivas y conservar vidas entre oleadas. |
| `src/services/save-validation.ts` | Validar reserva, temporizadores, estado y contadores sin relajar las comprobaciones anteriores. |
| `src/scenes/BoardScene.ts` | Incorporar al renderer las piezas recién llegadas. |
| `src/ui/app.ts` | Integrar tiempos, HUD, feedback accesible y especial; serializar entradas y movimientos durante sus animaciones. |
| `src/ui/game-screen.ts` | Consola de Supervivencia, explicación visible de la especial y región de estado. |
| `src/ui/home.ts` | Explicar las entradas y la congestión en el acceso al modo. |
| `src/ui/mobile-flow.css` | Jerarquía móvil, progreso legible, distintivo especial y estados visuales. |
| `src/main.ts` | Cargar la capa visual móvil después de las hojas existentes. |
| `docs/MOBILE_REVIEW.md` | Este informe. |

La sincronización de Capacitor actualizó también los assets de compilación ignorados por Git. No se editaron en esta intervención `.gitignore`, `android/app/build.gradle`, `src/core/game.ts`, `src/core/types.ts`, `src/services/progress.ts`, `src/ui/styles.css` ni los recursos debug que ya estaban modificados al comenzar.

## Comprobaciones ejecutadas

No se ejecutaron Vitest, Playwright ni la suite de tests automatizados.

- `npm run lint`: correcto, cero advertencias.
- `npm run typecheck` y `npm run build`: correctos con Node 24; el build final incluye `tsc --noEmit`.
- Prettier sobre los diez archivos de código tocados: correcto. `git diff --check`: correcto.
- `npx cap sync android` y Gradle `--offline --no-daemon --max-workers=2 :app:assembleDebug`: correctos; build final en 17 s, 128 tareas.
- Intento de `:app:lintDebug`: **no completado**. La caché aislada carece de `androidx.core:core-splashscreen:1.0.1` en AAR para la resolución de lint; el log contiene `No cached version available for offline mode`. No se descargaron dependencias para sortearlo. [Log](../.artifacts/mobile-review/android-build.log).
- Verificación de firma, alineación y contenido empaquetado: correctas. [Build final](../.artifacts/mobile-review/apk-build.log), [firma](../.artifacts/mobile-review/apk-signature.txt).
- Revisión del navegador local con pulsaciones reales en vista móvil **390 × 844**: especial visible en nivel 1; bloqueo mantiene la especial, contador 0/10 y baja de 3 a 2 vidas; tras abrir la ruta, el pulso retira dos piezas en un toque y cambia 2/10 a 4/10 sin perder otra vida.
- En esa misma partida, `decodeProfile` acepta el guardado con `moves: 5`, `errors: 1`, especial consumida `null` y seis piezas restantes.
- Supervivencia real: pasa de 10 a 14 piezas con piezas previas todavía presentes. Pausa y recarga restauran exactamente sus 14 piezas, 17 pendientes, tres vidas y **4088,699999988079 ms** hasta la próxima entrada. [Resultado de recarga](../.artifacts/mobile-review/reload-result.json).
- Comprobación puntual de mecánica ejecutada en el navegador, sin usar la suite: una oleada completa atraviesa **40 estados válidos y resolubles**, finaliza con tres vidas y avanza a oleada 2 con intervalo 4700 ms. Se comprueban derrota por congestión con cero vidas, rechazo de reserva corrupta, compatibilidad con sesión antigua, especial limitada a dos piezas adicionales y bloqueo sin efecto. [Resultado y diagnóstico reproducible](../.artifacts/mobile-review/diagnostic-result.json), [expresión utilizada](../.artifacts/mobile-review/diagnostic.js).
- Congestión real observada: 26 piezas, tres vidas, aviso naranja con nueve segundos restantes y anuncio de diez segundos en la región de estado.
- A **320 px** y **390 px**, no hay desbordamiento horizontal. A 320 px, CTA de aproximadamente 74 px y navegación de 48 px; las celdas de Supervivencia miden **52,25 px** a 390 px.
- Preferencia del sistema emulada `prefers-reduced-motion: reduce`, con ajuste interno en `full`: animaciones de portada, CTA y nodo actual devuelven `none`. [Resultado](../.artifacts/mobile-review/reduced-motion-result.json).

Capturas locales: [portada 390](../.artifacts/mobile-review/home-390.png), [portada 320](../.artifacts/mobile-review/home-320.png), [especial](../.artifacts/mobile-review/special-390.png), [Supervivencia](../.artifacts/mobile-review/survival-390.png), [congestión](../.artifacts/mobile-review/congestion-390.png).

## Límites de la entrega

Pendiente de Daniel: revisar esta APK en un móvil físico, especialmente sonido, vibración, áreas del sistema y sensaciones de presión. No se instaló la APK ni se ejecutó instrumentación Android. La dificultad y cadencia propuestas son revisables después de jugar; se han comprobado solvencia y persistencia, pero no se realizó un estudio de balance prolongado. La APK debug no actualiza ni migra por sí misma los datos del paquete release. El lint nativo queda pendiente de disponer de sus dependencias en la caché permitida.

El servidor local de revisión se detuvo antes de entregar.

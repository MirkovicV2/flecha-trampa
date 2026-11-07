# Estabilidad de CI e interfaz

Fecha: 7 de noviembre de 2026. Copia asignada: `C:\Users\brank\orca\workspaces\FlechaTrampa\estabilidad-interfaz`, rama `MirkovicV2/estabilidad-interfaz`, base `afb376ec0480724bafceebeee09bcfec576f175a`. Trabajo local, sin push, merge, tags ni APK de publicación. El ajuste de contraste de la revisión independiente pertenece a otra copia y no está incluido aquí.

Archivos: [entrada](../src/ui/board-input.ts), [rutas](../e2e/routes.spec.ts), [materiales](../e2e/cosmetics.spec.ts), [prueba de Preferences](../tests/platform.test.ts), [instrumentación nativa](../android/app/src/androidTest/java/com/flechatrampa/game/NativeGameSmokeTest.java), [CI web](../.github/workflows/ci.yml) y [CI Android](../.github/workflows/android.yml).

## Diagnóstico y cambios

### Un arrastre cancelado se convertía en movimiento

El [job desktop 128419617460](https://github.com/MirkovicV2/flecha-trampa/actions/runs/42377994005/job/128419617460) falla con 45 flechas esperadas y 44 reales. Se descargó su artefacto `browser-failures-desktop-1f90c7b44fe75a2945a2bc436948dbe62d191d6f` y se leyó la traza completa, sin ejecutar instrucciones de sus archivos de contexto.

En `1-trace.trace`, `mouseMove` que cancela el gesto empieza en 892801,568 ms y `mouseUp` en 894146,851 ms: hay **1345,283 ms** entre ambos. `BoardInput` conservaba el ID y la hora de cancelación, pero rechazaba el clic de compatibilidad solamente durante 900 ms. Después aceptaba ese clic como un nuevo movimiento. También podía aceptar el clic en otro ID tras un arrastre. El archivo de entrada es idéntico entre `1f90c7b` y `afb376e`; la nueva interfaz no introdujo este defecto.

Una reproducción dirigida sobre la interfaz actual, antes de corregir la entrada, arrastra 18 px, espera 1100 ms y suelta mediante eventos reales de ratón: quedan **9 flechas de 10**, cuando debían seguir 10. La corrección da a `pointerup` la responsabilidad exclusiva de los gestos con puntero; los clics con `detail !== 0` ya procesados como gesto no se reinterpretan. Los clics de teclado y tecnología de asistencia conservan la ruta con `detail === 0`. No cambia reglas, semillas, economía ni guardados.

La regresión permanente introduce esa suelta retrasada en el caso existente de rutas, conservando inspección por teclado, conteo exacto y movimiento posterior con Enter. Después del arreglo: **5/5 repeticiones desktop**, 51,9 s, sin retries. La batería completa conserva los taps táctiles reales durante animaciones, scroll táctil con CDP, hold, teclado, geometría y persistencia.

### Materiales: presupuesto global agotado

El mismo job agota 150000 ms en `cosmetics.spec.ts`, al llegar al clic de `a30`. La traza muestra escenarios anteriores completados y el equipamiento de `phoenix`, el duodécimo de los 14 materiales del bucle; no demuestra que `a30` estuviera bloqueado indefinidamente. El test empieza en 167777,714 ms y el último clic en 321606,417 ms; el presupuesto ya se había consumido durante el recorrido. Hay otro agotamiento del mismo caso en el [job 128370944896](https://github.com/MirkovicV2/flecha-trampa/actions/runs/42361544429/job/128370944896), en una acción distinta.

Se sustituye el bucle por **un caso independiente por cada una de las 32 skins del catálogo**, con el timeout normal de 40 s. Cada caso equipa desde colección, abre la partida densa de nivel 31, espera carga y canvas reales, retira una flecha calculada por las reglas, comprueba el conteo y la geometría de otra flecha, conserva tres vidas, vuelve al inicio y comprueba skin y tablero exactos guardados. Se mantienen los cuatro recorridos del inspector por rareza, con todas sus firmas de animación y aserciones de inventario.

La primera ejecución de los casos nuevos detectó un error del fixture de `classic`: ya estaba equipada y su botón estaba deshabilitado. Se interrumpió esa ejecución y se corrigió el fixture para partir de `chevron` solamente en ese caso; después pasan ambos proyectos para `classic` (2/2, 11,8 s). La batería completa final supera los **64 casos de materiales**, con duración individual de **3,753–5,607 s** (media 4,726 s), dentro del presupuesto normal de 40 s. No se usan force clicks, clics DOM sintéticos, skips ni retries para sortear controles deshabilitados.

Después de la batería completa se repiten Nova, Fénix y Eclipse tres veces cada una en escritorio: **9/9 correctos, 51,8 s**, sin retries. Incluye la skin Fénix que estaba activa al agotarse el presupuesto del recorrido remoto anterior.

### Android: el launcher retenía el foco

Se descargó y examinó el artefacto `android-reports-1f90c7b44fe75a2945a2bc436948dbe62d191d6f` del [job Android 128419397944](https://github.com/MirkovicV2/flecha-trampa/actions/runs/42377970788/job/128419397944). `native-focus-failure.png` muestra **Quickstep isn't responding**. `windows.txt:266` identifica `mCurrentFocus=Application Not Responding: com.android.launcher3`; no es una espera de botones de la aplicación ni un fallo atribuible a documentación de agentes.

El workflow compila la instrumentación release **antes de arrancar el emulador**, reduciendo competencia entre Gradle, arranque del launcher y WebView. Tras el arranque conserva ventanas y captura de preflight y detiene exclusivamente `com.android.launcher3`, el launcher ajeno a la aplicación que produjo el ANR observado. No cierra diálogos de la aplicación, no desactiva notificaciones y mantiene la aserción de foco antes de cada toque nativo. El script existente conserva código de salida, screenshot de foco, ventanas, energía y logcat cuando falla.

La eficacia del ajuste en un arranque frío Linux queda pendiente de instrumentación del candidato; no se atribuye éxito nativo a la compilación local.

### Android: aserción prematura de pistas persistidas

El [job 128370806027](https://github.com/MirkovicV2/flecha-trampa/actions/runs/42361544481/job/128370806027) informa `expected:<1> but was:<0>`. El XML del artefacto `android-reports-2fae0011b98056ba7937cc4f5d34a1f24e70441f` localiza exactamente `NativeGameSmokeTest.java:290`: `sharedSave.hintsUsed`. No es el conteo de partidas ni el número de llaves.

El test veía dos pistas en el DOM y esperaba hasta 15 s a un campo distinto de Preferences, `hints`; aunque esa espera agotara su plazo, continuaba a la aserción de `hintsUsed`, leyendo otra instantánea. Preferences serializa escrituras, incluidas las copias del reloj de juego. Los logs acreditan un emulador lento, pero no permiten demostrar pérdida permanente del guardado ni dar por resuelto un bug de producto.

Ahora se pulsa Atrás tras la señal DOM de pista consumida, se comprueba la pausa real y se espera una **misma instantánea nativa con `hints === 2` y `hintsUsed === 1`**, tanto en clásico como en reto. Pausar evita seguir añadiendo snapshots del reloj a la cola durante la espera. El presupuesto es el de preparación ya usado por el arnés (30 s); un agotamiento falla con los dos valores observados. Recrear la actividad sigue exigiendo el estado completo restaurado. La prueba de lógica añadida retiene artificialmente las confirmaciones de Preferences, comprueba que la UI puede ir por delante y verifica ID, tablero y ambos campos de pistas al drenar la cola. **La corrección nativa requiere todavía comprobación en emulador.**

## Infraestructura y auditoría

- Push automático solamente en `main` y `develop`; las ramas de trabajo se comprueban al abrir PR. Se evita ejecutar simultáneamente push de feature y PR para el mismo trabajo, y las ramas de documentación dejan de disparar por su prefijo. Se mantienen PR a ambas ramas y ejecución manual en los dos workflows.
- No hay filtros por rutas: incluso un PR documental conserva los checks exigibles; cambios UI/nativos siempre llegan al job Android. Antes de abrir PR una rama de trabajo ya no tiene ejecución automática, por diseño.
- Se mantienen cache npm/Gradle, lockfile, Node 24, artefactos por fallo, concurrencia y códigos de salida. No hay ampliación de timeouts globales, retries, `continue-on-error` ni reducción de aserciones. Se conserva la matriz móvil/escritorio y el script Android con `set -euo pipefail` y trap que devuelve el resultado original.
- Se revisaron las 19 suites de lógica y la batería web: generador y solver independientes, formas, progreso, transacciones, cofres/llaves, animaciones, teclado, hold, taps y scroll reales, pausa y recreación nativa. Los casos de resolución de formas siguen siendo compactos, con pruebas densas separadas. No se modifican reglas ni catálogo.
- Los dos casos Android siguen siendo recorridos integrados de 240 s; no se ha incrementado ese límite. El historial documenta casos cercanos a 197 s, por lo que su margen con emulación lenta continúa siendo un riesgo que debe medirse en el candidato remoto.

## Validación local

Herramientas: Node portátil **24.22.2**, npm **11.19.1**, JDK **21.0.13+9**, SDK existente y Gradle **8.14.3**. No se añadieron dependencias ni se modificó el lockfile.

| Comprobación                                                       | Resultado                                                                                                                                                                                |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                                           | 251 paquetes, 0 vulnerabilidades conocidas                                                                                                                                               |
| `npm run check`                                                    | lint, **156 pruebas / 19 archivos**, TypeScript y build correctos; Vitest final 27,60 s                                                                                                  |
| `npm run format:check`                                             | Correcto                                                                                                                                                                                 |
| Regresión de drag desktop, 5 repeticiones                          | **5/5**, 51,9 s                                                                                                                                                                          |
| Equipar `classic` tras corregir fixture                            | **2/2**, 11,8 s                                                                                                                                                                          |
| Batería completa de producción                                     | **162/162** (81 móvil y 81 escritorio), 995,737 s (16 min 36 s), 0 fallos, 0 omisiones y 0 casos flaky; sin retries                                                                      |
| YAML                                                               | Ambos workflows parseados con el parser YAML de Prettier; comprobados triggers push/PR/manual, orden de compilación nativa, conservación de artefactos y ausencia de `continue-on-error` |
| `git diff --check`                                                 | Correcto                                                                                                                                                                                 |
| Android `lintRelease`, `assembleDebug`, `assembleDebugAndroidTest` | **BUILD SUCCESSFUL**, 2 min 15 s, 355 tareas; lint: 0 errores y 11 avisos existentes                                                                                                     |
| Instrumentación Android                                            | **NO EJECUTADA**: `adb devices -l` vacío; no existe ejecutable de emulador ni AVD local                                                                                                  |

La comprobación Android genera solamente APKs debug de validación e instrumentación; no se ha generado ni firmado una release local. Los avisos nativos son de actualización de herramientas/dependencias, XML de SDK y recursos; no se han actualizado dependencias fuera de alcance.

### Comandos y evidencia

Se leyeron README, flujo Git, arquitectura, validación y flujo de agentes antes de editar. Se comprobó `git status --short --branch` y `git log -1 --oneline`. Para consultas remotas se usaron `fetch_workflow_job_logs`, `fetch_workflow_run_artifacts` del conector GitHub; para conservar ZIPs en disco, `gh run download <run> --repo MirkovicV2/flecha-trampa --name <artefacto> --dir .artifacts/ci-investigation/<destino>`. No se lanzó CI remoto.

```powershell
$env:PATH = 'C:/Users/brank/Documents/Proyectos/FlechaTrampa/.tools/node-v24.22.2-win-x64;' + $env:PATH
npm ci
npm run check
npm run format:check
git diff --check
git diff 1f90c7b afb376e -- src/ui/board-input.ts
node .artifacts/check-workflows.mjs
npx playwright test --config=.artifacts/playwright.local.config.ts --project=desktop e2e/routes.spec.ts --grep 'cancelled drags' --repeat-each=5
npx playwright test --config=.artifacts/playwright.local.config.ts --grep 'equipped classic'
npx playwright test --config=.artifacts/playwright.local.config.ts --reporter=list,json
npx playwright test --config=.artifacts/playwright.local.config.ts --project=desktop e2e/cosmetics.spec.ts --grep 'equipped (phoenix|eclipse|nova)' --repeat-each=3
$env:JAVA_HOME = 'C:/Users/brank/Documents/Proyectos/FlechaTrampa/.tools/jdk21/jdk-21.0.13+9'
$env:ANDROID_HOME = 'C:/Users/brank/Documents/Proyectos/FlechaTrampa/.tools/android-sdk'
$env:GRADLE_USER_HOME = 'C:/Users/brank/Documents/Proyectos/FlechaTrampa/.tools/gradle-home'
$env:PATH = $env:JAVA_HOME + '/bin;' + $env:PATH
npx cap sync android
./android/gradlew.bat --project-dir android --no-daemon --max-workers=2 :app:lintRelease :app:assembleDebug :app:assembleDebugAndroidTest
& "$env:ANDROID_HOME/platform-tools/adb.exe" devices -l
```

La primera orden estándar `npm run test:e2e:preview -- --project=desktop ...` construyó correctamente pero no pudo arrancar: 4173 pertenecía a otro proceso. Se empleó 4187 con servidor estricto exclusivo de esta copia, sin cerrar el servidor ajeno. El config ignorado `.artifacts/playwright.local.config.ts` importa `../playwright.preview.config`, mantiene proyectos y opciones, fija `testDir: '../e2e'`, `baseURL: 'http://127.0.0.1:4187'` y servidor `npm run preview -- --port 4187 --strictPort`, sin reutilización. La batería sirve el build de producción.

Evidencia local ignorada: `.artifacts/ci-investigation/` contiene los artefactos remotos completos y trazas expandidas; `.artifacts/web-production-output.log` recoge la ejecución completa. Los scripts locales de config/comprobación no forman parte del producto. Las capturas Android remotas prueban los fallos anteriores; las nuevas fuentes nativas solamente están compiladas. No se han probado teléfonos físicos ni iOS.

## Gate propuesto para la publicación

1. Combinar esta corrección con el ajuste de contraste de la revisión independiente y fijar un SHA candidato; conservar árbol limpio y versión/firma aprobadas por el coordinador.
2. Exigir `validate`, `browser-tests (mobile)`, `browser-tests (desktop)` y `android-build-and-smoke` en ese mismo candidato remoto, una ejecución deliberada. Los dos casos Android deben terminar con cero fallos/errores/omisiones y capturas pintadas; comprobar foco real, `hintsUsed` restaurado y márgenes frente a los 240 s.
3. Si reaparece ANR o falla la instantánea de pistas, conservar el artefacto y detener la publicación; este informe no considera esos fallos resueltos mediante una compilación local.
4. Solo después construir y firmar la APK de distribución con la firma existente, verificar paquete/versión, alineación/firma y coincidencia de assets con el candidato probado; el coordinador gestiona su publicación.

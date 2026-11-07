# Validación del juego

## Versión 0.3.0 — 7 de noviembre de 2026

En Windows se han completado lint, formato, TypeScript estricto y Vite build; las 92 pruebas Vitest de 11 archivos son correctas. Las 44 pruebas Playwright de móvil y escritorio pasan contra la compilación de producción. Tras aclarar los sellos faltantes en una vista previa bloqueada, se repitieron los dos recorridos de escenarios, también correctos.

El primer recorrido nativo agotó 240 segundos al pasar por pausa y cerrar ActivityScenario. Se ha detenido el bucle de Phaser detrás de los modales y se reactiva al continuar; destruir una escena dormida procesa también su frame de limpieza. Tras esta corrección pasan seis comprobaciones de pausa, animaciones en curso y conflicto entre pestañas. Una sonda de navegador mide cero callbacks RAF durante 700 ms en pausa y 26 callbacks durante los 500 ms posteriores a continuar. La suite ampliada contiene ahora 46 casos de navegador.

La cobertura nueva incluye migración y persistencia de fondos, sellos por primeras victorias sin explotación por reintentos, desbloqueo sin cambios de energía, previsualización de los seis eventos, compra de prueba cancelada/activada/restaurada/restablecida, anuncios completados y cancelados, limpieza al salir de primer plano y ausencia de recompensas prematuras. Se comprueban las cuatro vidas clásicas y la omisión de intersticiales con Plus de prueba. Los combos se prueban con diez extracciones simultáneas, máximo de 72 partículas DOM, geometría táctil constante, pausa y reducción de movimiento.

La [validación remota final](https://github.com/MirkovicV2/flecha-trampa/actions/runs/42338601293), sobre `75ab59b008e155bf94d59b148f827f26e56cafcc`, terminó correctamente: 92 pruebas Vitest y las 46 pruebas de navegador contra producción. La [prueba Android final](https://github.com/MirkovicV2/flecha-trampa/actions/runs/42338601274) también terminó con `success`: 1 caso nativo, 0 fallos, 0 errores y 0 omisiones, en 112,515 segundos. Incluye guardado, recreación de actividad, Atrás, skin, paleta Neón, fondo navideño y Pase Plus de prueba, con red desactivada.

La compilación y lint Android locales son correctos. La APK release 0.3.0 (`versionCode 4`) está firmada con el mismo certificado de 0.2.0, con firma v2/v3, alineación de 16 KB y depuración desactivada. Se han comparado por SHA-256 los 11 archivos de `dist/` con sus copias dentro de la APK: coinciden. Hash del instalador: `8f327db86e0005663883a2d359bd8d40fd50939ba26201e1162c40cb67c12a78`.

Se descargó también el candidato Android sin firmar del workflow final y se compararon sus 11 archivos web con los de la APK firmada localmente: son idénticos. La captura nativa final muestra el tablero renderizado con la skin equipada, Neón, Navidad y el contador 4/8 del pase restaurado. Los commits posteriores de documentación se comparan con el árbol validado para evitar cambios de código sin probar.

Se revisaron visualmente la galería, Navidad en partida, la vista previa Halloween, la pantalla de compra de prueba y el estado Imparable en móvil. Las capturas están en `.artifacts/`. Las simulaciones no constituyen pruebas de SDKs publicitarios, cobros o facturación real. No se ha validado esta versión en un teléfono físico o iOS.

## Versión 0.2.0 — 7 de noviembre de 2026

83 pruebas Vitest correctas, lint y compilación web correctos. Se comprobaron los 30 recorridos previos de navegador y cuatro comprobaciones posteriores de cofres/temas y vidas extra, sin fallos. La suite ampliada contiene 32 casos de navegador entre móvil y escritorio. Incluye eventos táctiles reales, arrastres, combos durante animaciones, energía agotada, recompensas únicas, persistencia de skins y cuatro vidas gratuitas al continuar.

La prueba Android de la variante release cubre además apertura de cofre, selección de skin y tema y conservación de energía al recrear la actividad, con red desactivada. Los workflows validan el árbol de fuentes antes de integrar la versión estable. Los informes y capturas quedan como artifacts de Actions. La compilación descargable se verifica con apksigner y zipalign y se compara por SHA-256 tras descargarla de Releases.

Las mediciones siguientes corresponden al MVP anterior; su cobertura no se atribuye a los módulos nuevos.

## Validación histórica 0.1.x

Fecha: 6 de noviembre de 2026. Equipo Windows 11 Pro, build 26200; proyecto en `C:\Users\brank\Documents\Proyectos\FlechaTrampa`. Node portátil 24.22.2, npm 11.19.1, Git 2.43.0.windows.1 y GitHub CLI 2.103.3.

## Comprobaciones realizadas

| Comprobación                                        | Resultado                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------------ |
| ESLint sin advertencias                             | Correcto                                                                       |
| TypeScript estricto y Vite build                    | Correcto                                                                       |
| Vitest                                              | 64 pruebas correctas en 7 archivos                                             |
| Generación masiva                                   | 1.000 tableros solucionados por solver y ejecutados por el motor, sin errores  |
| Chromium móvil y escritorio, servidor de desarrollo | 20 pruebas correctas                                                           |
| GitHub Actions, Node 24 en Linux                    | `validate` y `browser-tests` correctos: 64 pruebas de lógica y 20 de navegador |
| npm audit                                           | 0 vulnerabilidades conocidas en la última instalación revisada                 |

Verificación final completada: `npm ci` correcto, cero vulnerabilidades conocidas, lint y formato correctos, TypeScript y Vite correctos y 20 pruebas de navegador correctas contra la compilación de producción en `dist/`. Se verificaron además los 100 tamaños rectangulares de fallback entre 1 y 10 celdas por eje. La cobertura de líneas de los módulos instrumentados (core, generator, solver y services) es del 85,08 %. `cap doctor` confirma las cuatro dependencias Capacitor 8.6.0 y `cap sync` web finaliza correctamente. Los scripts PowerShell se han comprobado con el parser. No se detectaron firmas habituales de secretos en las fuentes.

La [ejecución remota 42288421160](https://github.com/MirkovicV2/flecha-trampa/actions/runs/42288421160) repitió instalación, lint, formato, Vitest, build y pruebas contra producción en un runner Linux, con ambos trabajos correctos. El commit comprobado fue `2829cb458c515806af26da56a37e301708f3abc4`; la lógica del juego coincide con la etiqueta `v0.1.0`.

## Cobertura de comportamiento

Extracción y bloqueos en cuatro direcciones, vidas y estados terminales, entrada repetida, geometrías inválidas, ciclos del solver, semillas Unicode, determinismo, progreso y densidades extremas, fallback, corrupción y recuperación de guardados, estadísticas idempotentes, UTC y rachas, enlaces alterados y versiones no admitidas, Web Share/copia/cancelación, límites de monetización y escrituras nativas ordenadas.

En navegador: tutorial completo, derrota y reinicio, pista válida, pausa del reloj, avance de nivel, ajustes y navegación, continuación tras recarga, diario completado persistente, enlace compartido reproducible, resultado copiable, pulsaciones rápidas, conflicto entre pestañas y tableros de 85 flechas en anchos 320/360/375/428. Las capturas están en `.artifacts/`, ignoradas por Git, y se han revisado visualmente.

## Límites de la validación

Las pruebas de providers usan adaptadores de prueba aislados; la app real conserva NoOp para publicidad y pagos. No se ha validado hardware Android/iOS ni Safari. El repositorio privado y los pushes ya se han verificado. Las ejecuciones de Actions y la restricción de plan que impide proteger `main` se registran en [estado remoto](REMOTE_STATUS.md).

## Android 0.1.1

Se instaló una cadena local aislada con Temurin 21.0.13+9, SDK 36 y Gradle 8.14.3. `:app:lintRelease`, `:app:assembleRelease` y `:app:assembleDebugAndroidTest` terminaron correctamente en Windows. El instalador release se firmó con una clave de prueba persistente y se verificaron firma v2/v3, alineación, identificador, versión, ausencia de depuración y presencia de los assets del juego. SHA-256 y certificado público acompañan al APK.

El [workflow Android](https://github.com/MirkovicV2/flecha-trampa/actions/workflows/android.yml) añade una prueba con Espresso-Web, Preferences reales y recreación de actividad en emulador API 35, en la variante release y sin red. El alcance y la reproducción se documentan en [MOBILE.md](MOBILE.md). La APK requiere validación adicional en teléfonos físicos; no se han generado AAB ni IPA de tienda.

## Repetir

```powershell
. .\scripts\use-local-tools.ps1
npm ci
npm run check
npm run format:check
npm run test:coverage
npm run test:e2e:preview
git diff --check
git status --short
```

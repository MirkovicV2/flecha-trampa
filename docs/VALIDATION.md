# Validación del MVP

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

El [workflow Android](https://github.com/MirkovicV2/flecha-trampa/actions/workflows/android.yml) añade una prueba con pulsaciones táctiles, Preferences reales y recreación de actividad en emulador API 35, en la variante release y sin red. El alcance y la reproducción se documentan en [MOBILE.md](MOBILE.md). La APK requiere validación adicional en teléfonos físicos; no se han generado AAB ni IPA de tienda.

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

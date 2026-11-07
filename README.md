# FLECHA TRAMPA

**[Descargar APK para Android (v0.5.0)](https://github.com/MirkovicV2/flecha-trampa/releases/download/v0.5.0/flecha-trampa-v0.5.0-android.apk)**

**Abre camino.** Juego de puzles para móvil: flechas, tres vidas y el orden justo para despejar el tablero. Versión 0.5.0 para web y Android, con TypeScript estricto, Phaser 3, Vite, Vitest y Capacitor 8.

## Descargar e instalar la APK

Pulsa **Descargar APK para Android** al principio de este README para descargar directamente el instalador. También puedes [ver la Release y sus archivos](https://github.com/MirkovicV2/flecha-trampa/releases/tag/v0.5.0).

El enlace directo funciona también desde el README en GitHub Mobile. El repositorio es privado: iniciar sesión con la cuenta que tiene acceso. Abrir el archivo descargado y seguir el instalador de Android.

Requiere Android 7.0 o posterior y Android System WebView actualizado. Es una APK universal de tipo release, firmada para pruebas, con el juego incluido para jugar sin conexión. La misma firma permite actualizar conservando las partidas. El modo clásico y el diario funcionan localmente; compartir retos fuera de la app necesita configurar una URL web pública. No es una publicación de Google Play. Ver [compilación, firma y alcance de las pruebas Android](docs/MOBILE.md).

## Novedades de esta versión

Partida revisada a partir de las fichas y capturas oficiales de Slide Arrows Match y Arrow Slide Puzzle. **Cinco composiciones**: cuadrícula, diamante, cruz, órbita y reloj de arena. Los nuevos niveles clásicos alternan formas desde el nivel 3; los retos permiten elegirlas. Generación inversa, solver independiente, enlaces y guardados conservan sus garantías. Los diarios y retos anteriores mantienen el mismo tablero.

**Mantén pulsada una flecha** para consultar su ruta y el primer bloqueo; al soltar no se mueve ni consume vidas o pistas. El botón **Rutas** permite inspeccionar también con ratón o teclado; desactívalo para volver a jugar. Los choques señalan el obstáculo real y las flechas recién liberadas reciben un destello. La cabecera es más compacta y el tablero conserva objetivos táctiles fijos.

**Estrellas por precisión**: una por completar, dos sin errores y tres si además no consumes pistas. El resultado muestra el mejor combo del intento y las estadísticas cuentan las victorias de tres estrellas. No se inventa el uso de pistas de partidas antiguas. Ver [referencias, reglas y decisiones de diseño](docs/DESIGN_REFERENCES.md).

### Cosméticos y progresión incluidos

Cofres con precinto animado, carrusel de piezas, clics sincronizados, frenado y revelación según rareza. El premio se guarda antes de animar: saltar, girar el móvil, pulsar Atrás o cerrar no repite el sorteo ni pierde la pieza. No hay llaves ni venta de cofres.

Ocho flechas redibujadas con siluetas, biseles y materiales propios. Colección con fichas, filtros e inspector que permite probar cada firma de movimiento: ecos, descargas, píxeles, cristal, órbitas, oro y plasma. El mismo dibujo aparece en la colección, la portada y el tablero. Ver [diseño, animación y garantías de los cofres](docs/COSMETICS.md).

Nueva identidad de taller con tipografías locales de licencia libre. Los fondos de Navidad, Halloween, sakura, neón, océano y faroles incorporan nieve, pétalos, burbujas y otros ambientes. Siguen desbloqueándose gratis por sellos, sin gastar ni dar energía. Los combos conservan Frenesí, Imparable y Leyenda y sus controles táctiles estables.

Hay anuncios locales y compra del Pase Plus **de prueba, sin cobro**, para revisar el flujo completo. La compra de 0,00 € activa cuatro vidas clásicas, capacidad de ocho cargas y omisión de intersticiales; cancelar no activa nada y Restaurar compras conserva la prueba. Los anuncios recompensados solo dan la recompensa local al completarlos y recogerla. No se solicitan tarjetas ni hay anunciantes o SDK de tienda. Ver [fondos y eventos](docs/EVENTS.md), [economía](docs/ECONOMY.md) y [límites del simulador](docs/MONETIZATION.md).

## Probar las novedades

Para probar las nuevas formas directamente: **Inicio → Reta a alguien → Forma del tablero**, elige Diamante u Órbita, crea el reto y juega. Usa una semilla propia para repetirlo. En partida, mantén una flecha pulsada para consultar una ruta; prueba Rutas para alternar entre inspeccionar y jugar. Completa el tablero sin errores ni pistas para conseguir tres estrellas. Las estrellas no alteran los premios ni la energía.

Los cofres, fondos y pase de prueba se prueban así:

1. Recompensas → **Colección** → **Abrir cofre**. Activa su botón de sonido para escuchar precinto, tarjetas y revelación. Si ya gastaste el cofre de bienvenida, el nivel 2 del pase gratuito concede otro y los niveles 5 y 9 conceden dos cada uno.
2. Pulsa la lupa de cualquier skin → **Probar animación**. Puedes inspeccionarlas todas aunque aún no sean tuyas; solo equipar o crear requiere propiedad o fragmentos.
3. Inicio → **Navidad. Halloween. Tu mundo.**, o Recompensas → **Fondos y eventos**. Un sello de bienvenida permite desbloquear Navidad; puedes previsualizar todos los demás.
4. Recompensas → Pase de temporada → **Probar Pase Plus · 0 €**. Cancelar, activar y restaurar funcionan. Ajustes → **Restablecer pase de prueba** permite repetir el flujo.
5. Pulsa energía → **Ver anuncio de prueba por energía**. Espera cuatro segundos y recoge; cerrar antes no otorga nada. Encadena flechas válidas en menos de 1,8 segundos para probar los combos.

## Estado de GitHub

Repositorio privado verificado: [MirkovicV2/flecha-trampa](https://github.com/MirkovicV2/flecha-trampa). `main`, `develop` y las ramas de funcionalidad están publicadas. `v0.1.0` conserva el MVP web original; `v0.5.0` identifica la entrega de formas, rutas y dominio, conservando los cofres y cosméticos de la 0.4.0. Las fuentes comprobadas superan 116 pruebas de lógica, 82 de navegador y dos casos Android. La cuenta activa se comprobó con `gh auth status` y `gh api user`. La protección remota de `main` no está activa: GitHub exige Pro para habilitarla en este repositorio privado; la API vuelve a confirmar HTTP 403. Ver [estado y comprobaciones de GitHub](docs/REMOTE_STATUS.md).

## Inicio rápido en este ordenador

Ruta: `C:\Users\brank\Documents\Proyectos\FlechaTrampa`.

```powershell
cd C:\Users\brank\Documents\Proyectos\FlechaTrampa
powershell -ExecutionPolicy Bypass -File scripts/dev.ps1
```

Abrir **http://127.0.0.1:5173**. El script utiliza Node 24 portátil y ejecuta Vite. `Ctrl+C` detiene el servidor.

La instalación global encontrada era Node 20.10.0. Las herramientas de este proyecto están aisladas en `.tools/` y no se versionan. Para usar todos los comandos desde PowerShell:

```powershell
. .\scripts\use-local-tools.ps1
node --version
npm ci
npm run dev
```

## Requisitos e instalación en otro equipo

- Node.js **24.x** con npm y Git. La versión principal está fijada en `.nvmrc`, `.node-version`, `engines` y CI.
- GitHub CLI para publicar y administrar el remoto.
- Navegador moderno con Canvas/WebGL y módulos ES. Admite ratón, pantalla táctil y teclado.
- Para pruebas de navegador: `npx playwright install chromium`. CI Linux utiliza `--with-deps`.

```sh
npm ci
npm run dev
```

Las dependencias tienen versiones exactas y lockfile versionado. El override de `minimatch` fija una versión corregida para las herramientas que usaban versiones afectadas. Revisar `npm audit` al actualizar dependencias.

## Comandos

| Comando                           | Función                                              |
| --------------------------------- | ---------------------------------------------------- |
| `npm run dev`                     | Desarrollo en el puerto 5173                         |
| `npm run lint`                    | ESLint sin advertencias permitidas                   |
| `npm run typecheck`               | Comprobación estricta de TypeScript                  |
| `npm run test` / `test:watch`     | Pruebas de lógica y servicios                        |
| `npm run test:coverage`           | Cobertura con V8                                     |
| `npm run test:e2e`                | Flujos reales en Chromium móvil y escritorio         |
| `npm run test:e2e:preview`        | La misma batería contra la compilación de producción |
| `npm run build`                   | Tipos y compilación a `dist/`                        |
| `npm run preview`                 | Servidor de la compilación de producción             |
| `npm run check`                   | Lint, tests y build, en ese orden                    |
| `npm run format` / `format:check` | Formato con Prettier                                 |
| `npm run cap:sync`                | Compilar y sincronizar las plataformas añadidas      |
| `npm run cap:android` / `cap:ios` | Abrir una plataforma previamente creada              |
| `npm run android:apk`             | Validar, compilar y firmar la APK local en Windows   |

En Windows, `scripts/dev.ps1 -Task check` o `-Task preview` selecciona también Node local.

## Reglas y experiencia

Cada flecha ocupa una celda y sale en línea recta según su orientación. Si su trayectoria hasta el borde está libre, sale y desaparece. Si encuentra otra flecha, permanece en su sitio y consume una vida. El intento comienza con tres vidas por defecto: despejar el tablero da la victoria y agotar las vidas termina el intento. Las reservas gratuitas y el Pase Plus de prueba permiten cuatro vidas en clásico; diario y retos compartidos conservan tres.

No hay límite de tiempo. El cronómetro excluye pausas y segundo plano. Las pistas destacan una flecha válida del tablero actual, sin moverla automáticamente. Las direcciones se distinguen por su forma y orientación, además del color.

El primer inicio ofrece un tutorial interactivo. Desde Ajustes se puede repetir el tutorial, activar sonido o vibración, reducir movimiento y elegir paleta. Hay pantallas de inicio, modos, partida, pausa, ajustes, progreso, victoria y derrota. La interfaz respeta zonas seguras y orientación vertical. Iconos, dibujos y sonidos son originales; las tipografías Barlow Condensed y Manrope se distribuyen con sus licencias OFL y sin descargas durante el juego.

## Modos

**Clásico.** Niveles sin una lista prefijada, dificultad progresiva, guardado automático y continuación exacta. Una derrota permite reintentar el mismo tablero; una victoria avanza el nivel.

**Desafío diario.** Un tablero de 7 × 7 y 33 flechas por fecha UTC. La semilla incluye fecha y versión del generador. Conserva intentos, mejores resultados, tiempo, errores, días completados y rachas. Repetir una fecha no suma otro día a la racha. Se renueva a las 00:00 UTC; una partida iniciada antes de medianoche conserva su fecha original.

**Retos compartidos.** Crear un reto eligiendo semilla, tamaño, densidad y complejidad. El enlace codifica todos los parámetros y la versión del generador: otra persona obtiene el mismo tablero sin cuenta ni backend. Hay Web Share, copia del enlace y selección manual cuando el navegador no permite copiar. Los resultados también se comparten.

Para compartir entre dispositivos, alojar `dist/` en un servidor estático HTTPS y configurar `VITE_PUBLIC_URL` en `.env.local`, usando `.env.example`. Un enlace a `127.0.0.1` solo sirve en el ordenador que aloja el juego. Las variables `VITE_*` son públicas: no deben contener secretos. Los rankings globales y los resultados verificables necesitarían backend.

## Generación de niveles

`inverse-v1` utiliza un PRNG de enteros de 32 bits. Con la misma semilla, configuración y versión, `generateLevel(seed, config)` reproduce el mismo tablero.

El generador inserta flechas con trayectoria libre respecto al tablero parcial. Las nuevas inserciones pueden bloquear flechas anteriores: deshacer las inserciones en orden inverso siempre ofrece una solución. Se prefieren dependencias para reducir movimientos triviales. Un solver independiente construye el grafo geométrico de bloqueos y valida una ordenación topológica, sin utilizar la función de movimiento del motor. Hay cuatro intentos como máximo y un fallback válido de capas con cuatro direcciones hacia el exterior.

| Progreso           | Tablero |
| ------------------ | ------- |
| Niveles 1–2        | 4 × 4   |
| Niveles 3–5        | 5 × 5   |
| Niveles 6–15       | 6 × 6   |
| Niveles 16–30      | 7 × 7   |
| Niveles 31–60      | 8 × 8   |
| Niveles 61–100     | 9 × 9   |
| Desde el nivel 101 | 10 × 10 |

Densidad y complejidad progresan por separado del tamaño. Desde el nivel clásico 3 se alternan cinco formas; la densidad se aplica a las celdas de su máscara y los huecos no bloquean las trayectorias. Las pruebas ejecutan las soluciones de 1.000 tableros rectangulares y 400 tableros con formas a través del motor real, sin errores ni pérdida de vidas; comprueban además 500 fallbacks para las máscaras. Los retos rectangulares conservan los enlaces FT1; las formas usan FT2 para que las APK antiguas no las interpreten como otro tablero. Ver [garantías y arquitectura](docs/ARCHITECTURE.md).

## Progreso y recompensas

Se guardan nivel clásico, sesiones de cada modo, partidas, victorias, victorias sin errores y de tres estrellas, mejor combo por intento, tiempo activo, flechas liberadas, rachas, resultados diarios, pistas y ajustes. Hay tres pistas iniciales y una pista adicional por cada tres victorias. Las paletas Aurora, Atardecer, Glaciar y Neón son gratuitas; Medianoche y Solar se ganan en el pase gratuito. Los fondos de evento se compran con sellos gratuitos obtenidos por primeras victorias, sin gastar ni otorgar energía.

En web se utiliza `localStorage`; en la app nativa, Capacitor Preferences con escrituras serializadas. Ambos usan un esquema validado y una copia anterior recuperable. La interfaz informa de guardados dañados o almacenamiento no disponible. Si otra pestaña actualiza el progreso, se bloquea la escritura antigua y se ofrece recuperar la versión reciente.

Los datos permanecen en el dispositivo. Borrar los datos del sitio o desinstalar la app puede eliminarlos. Las marcas locales no son un sistema contra trampas.

## Arquitectura

```text
src/
  core/        reglas puras y transiciones inmutables
  generator/   semillas, progresión y construcción inversa
  solver/      grafo independiente de dependencias
  scenes/      representación y animaciones de Phaser
  ui/          pantallas DOM, controles accesibles y coordinación
  services/    progreso, diario, compartir, feedback, plataforma y monetización
  config/      paletas, fondos, combos y catálogos
  utils/       PRNG, formatos y validación
  assets/      documentación de recursos originales
tests/         pruebas de lógica y servicios
e2e/           pruebas reales de navegador
public/        icono original
.github/workflows/ci.yml
```

Phaser se carga al abrir el tablero. Primero se aplica y guarda la transición pura; después se anima. La identidad estable de los controles evita dobles pulsaciones y permite encadenar jugadas durante animaciones; un contador de pantalla descarta respuestas de escenas antiguas. Los efectos decorativos no desplazan las zonas táctiles. El resultado se registra antes de terminar la animación para sobrevivir a una recarga.

## Ramas, contribución y releases

- `main`: versiones verificadas. No desarrollar funcionalidades directamente aquí.
- `develop`: integración permanente.
- `feature/*`: cada bloque nace de `develop`, pasa sus verificaciones y se integra con merge `--no-ff`.
- Conventional Commits: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `ci`.

Antes de integrar: `npm run check`, `npm run format:check` y pruebas de navegador afectadas. Antes de una release: `npm ci`, batería completa, revisión visual, árbol limpio, integración de `develop` en `main` y tag anotado. Nunca force push. La etiqueta `v0.1.0` se creó tras superar las verificaciones y está publicada sin modificar su destino.

CI usa Node 24. Los trabajos `validate` y `browser-tests` instalan dependencias, ejecutan lint, formato, tests, build y pruebas de navegador. Admite push, pull request y ejecución manual. El resultado remoto está enlazado en [estado de GitHub](docs/REMOTE_STATUS.md). Ver [flujo y protección de ramas](docs/GIT_WORKFLOW.md), [validación](docs/VALIDATION.md) y [changelog](CHANGELOG.md).

El workflow Android añade `android-build-and-smoke`: lint nativo, compilación release y pruebas en emulador de Preferences, recreación de actividad y la interfaz release mediante Espresso-Web. Las claves de firma de las APK publicadas permanecen en el ordenador.

## Android e iOS

Configuración: `appId: com.flechatrampa.game`, nombre `FLECHA TRAMPA`, `webDir: dist`, zonas seguras y adaptadores de Preferences, App e Haptics. El proyecto Android está versionado; la APK firmada se distribuye como archivo de Release y las claves quedan fuera de Git. No se ha publicado en tiendas.

```sh
npm run build
npx cap sync android
npm run cap:sync
npm run cap:android
```

En este PC se han instalado JDK 21 y Android SDK 36 dentro de `.tools/`, sin sustituir Java global. `. ./scripts/use-android-tools.ps1` prepara la sesión y `npm run android:apk` genera el instalador. Para iOS, ejecutar `npx cap add ios`, sincronizar y abrir Xcode en un Mac preparado. Ver [preparación móvil](docs/MOBILE.md).

## Monetización y limitaciones

Esta distribución interna habilita `PreviewAdsService` y `PreviewPurchasesService`. Todos los flujos dicen **PRUEBA · SIN COBRO** y el pase cuesta 0,00 € de prueba. Los derechos locales del simulador no son recibos de tienda. En Ajustes se puede restablecer el pase. `VITE_MONETIZATION_MODE=disabled` selecciona los adaptadores NoOp y desactiva anuncios y compra. Una distribución comercial debe desactivar el simulador hasta implementar proveedores reales y verificación de recibos. Ver [configuración y monetización futura](docs/MONETIZATION.md).

Pendiente: disponer de un plan compatible para activar y verificar protección de `main`; probar la APK en teléfonos físicos; preparar y firmar iOS en un Mac; alojar una URL pública para compartir entre equipos. No hay ranking global, sincronización en la nube, analítica ni caché PWA offline. Las pruebas automatizadas no sustituyen la validación en hardware real.

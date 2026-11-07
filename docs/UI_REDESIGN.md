# Renovación de interfaz: Camino abierto

La propuesta convierte el taller oscuro de v0.7.0 en una interfaz de puzles más serena y directa. Mantiene la identidad de las flechas y utiliza Manrope local, tinta azul, superficies cálidas y verde para las acciones del juego. La portada usa papel cálido para destacar el acceso a la partida y una marca coral para distinguir la navegación de las piezas.

## Cambios observables

- Inicio con nivel visible, Jugar/Continuar antes del arte en el DOM y una ilustración de ocho piezas con la skin equipada. La portada móvil evita el gran bloque de ilustración que retrasaba la acción principal.
- Navegación flotante persistente, con cuatro destinos, estado seleccionado y reserva de espacio al final de la página.
- HUD que reúne vidas, reloj y avance; combo con espacio estable; tablero cuadrado sin esquinas ornamentales y controles inferiores de rutas, ampliación, pistas y pausa.
- Colección con pieza equipada resumida, cofre y llaves en una tarjeta compacta, filtros desplazables, nuevas superficies de catálogo y acceso al inspector para la descripción completa.
- Pase con nivel/XP, siguiente premio gratuito y salto a la primera recompensa pendiente disponible. Las reglas extensas pasan a un desplegable; conserva las 80 acciones de las dos rutas y sus condiciones originales.
- Ajustes con interruptores en filas claras y modales de pausa/resultados con el mismo sistema de superficies, tipografía y acciones.
- Apertura de cofre: sustituye el texto incorrecto «SIN LLAVES» por el coste real de un cofre y una llave.

La paleta sigue la dirección del diseñador con una portada más clara y un acento coral de marca para que el cambio sea reconocible. Barlow permanece disponible localmente; Manrope ocupa también los titulares para dar coherencia y mayor legibilidad a nombres largos. Las microetiquetas decorativas se conservan donde no transportan una acción o una instrucción esencial.

## Organización y garantías

El sistema visual se concentra en [presentation.css](../src/ui/presentation.css), importado después de los estilos de componentes. Se han retirado 547 declaraciones anteriores sustituidas por el sistema compartido y el bloque antiguo de portada `atelier-hero`, evitando añadir otro archivo de overrides. Los estilos de interacción, animación, escenarios y geometría siguen junto a sus componentes.

Los cambios TypeScript solo calculan presentación o reorganizan markup en `home.ts`, `game-screen.ts`, `rewards.ts` y `chest-opening.ts`. No cambian `app.ts`, `board-input.ts`, servicios, reglas, generador, solver, economía, formatos de guardado o enlaces. Los atributos de acción y los nombres accesibles se conservan; las pestañas muestran nombres cortos con sus nombres completos en `aria-label`. Se mantienen inert, foco, safe areas y movimiento reducido.

## Validación

Entorno: Windows, Node portátil 24.22.2 y Chromium de Playwright. Instalación con `npm ci`, lockfile sin cambios, 251 paquetes y cero vulnerabilidades comunicadas por npm.

- `npm run check`: lint sin advertencias, 155 pruebas de lógica en 19 archivos, TypeScript estricto y build de Vite correctos.
- `npm run format:check` y `git diff --check`: correctos.
- `npm run test:e2e:preview -- --workers=2`: 100 recorridos correctos en 8,0 minutos, sin fallos. Incluyen tutorial, derrota/reintento, pistas, pausa/resultados, recarga y conflictos de guardado, diario, FT3, formas, interacción táctil, zoom, cofres/llaves, 32 diseños, pase y simulaciones de anuncios/compras.
- Tras el último ajuste del tamaño de las etiquetas de navegación a 320 px se repiten `npm run check`, formato y los seis recorridos de `redesign.spec.ts` y `presentation.spec.ts` contra producción: seis correctos en 38,5 segundos. Los logs locales están en `.artifacts/redesign/check-delivery.log`, `e2e-final.log` y `e2e-narrow-final.log`.
- Nueva prueba de navegación y juego en `e2e/redesign.spec.ts`: anchos 320/360/393/428 y escritorio 1440, sin desbordamiento horizontal, Jugar visible, modos, pase, colección, ajustes, juego real, pausa, resolución mediante clics y apertura/equipado de cofre sin forzar interacciones.

.artifacts/redesign/comparison.html reúne la comparación de portada móvil y escritorio en dos columnas. Las capturas se guardan en `.artifacts/redesign/` (directorio ignorado por Git). Comparación de portada: `before-home-mobile.png` / `after-home-393.png` y `before-home-desktop.png` / `after-home-1440.png`. Las familias `after-modes-*`, `after-pass-*`, `after-collection-*`, `after-settings-*`, `after-game-*`, `after-pause-*`, `after-result-*` y `after-chest-*` documentan el recorrido final; `review-*` contiene capturas adicionales a escala CSS.

Contrastes calculados de superficies sólidas: texto de portada 12,63:1, descripción de portada 5,55:1, acción principal 13,57:1 y texto secundario de ajustes 7,21:1. Son comprobaciones de esas combinaciones, no una auditoría completa de accesibilidad.

La revisión visual comprueba la ausencia de marcos que tapen flechas, contraste de títulos en superficies claras y modales terminados de animar. Las pruebas se realizan en Chromium con emulación móvil y escritorio; no demuestran compatibilidad con teléfonos físicos, WebView Android ni Safari/iOS. No se genera APK, publicación ni modificación remota.

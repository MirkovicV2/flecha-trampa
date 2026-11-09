# Corrección de paridad de skins · ronda QA 1

Se corrigió el criterio fallido de las 32 skins sobre el candidato existente. Fuente: `develop` `1c14cf2f997704980459740c33f4d576d5378444`, `src/ui/arrow-art.ts`, `src/config/arrow-designs.ts`, `src/config/theme.ts` y `src/scenes/BoardScene.ts:cosmeticExit`.

## Cambios

- `PieceArt` usa las tintas originales: borde blanco, sombra `#182432`, acento `#ffd58b`, cuerpo de material cuando existe y acento direccional cuando `paletteAccent` lo pide. Las seis paletas se aplican en portada, colección, campaña y Ritmo.
- Las 16 firmas conservan sus primitivas, número de elementos, colores, dimensiones, rotación, escalas, desplazamientos, duración y curva `Cubic.Out`. Prisma vuelve a una estela lineal. Petal recupera siete elipses, colores alternos, giro de 160 grados y reducción de escala. Los halos vuelven a girar y el resto de familias conserva sus geometrías originales.
- La colección ofrece **Probar animación** sin equipar ni desbloquear. Repetir cancela la animación anterior, salir libera el tween y movimiento reducido mantiene un cambio breve de opacidad sin estelas. El perfil no se modifica.
- Ritmo conserva ventanas, reloj de audio, receptores y contactos. Solo cambia la presentación cosmética: dirección/color del carril y vida máxima de 550 ms para la firma completa, con el límite existente de doce decoraciones. Campaña mantiene su límite de doce salidas. No cambian reglas, generador ni formato de guardado.

## Comparación reproducible

Con Node 24 local, ejecutar `node godot/tools/export-art-reference.mjs` y dar formato al JSON con Prettier. El script extrae y ejecuta el método TypeScript original mediante un adaptador que registra formas y tweens; no reimplementa sus ramas. `data/art-reference.json` registra SHA256 de la fuente, catálogo, tintas, paletas y 128 salidas (32 piezas por cuatro direcciones). No regenerar el fixture desde Godot.

Con Godot local `4.7.2.stable.official.ed1daf0bf`:

```text
godot --headless --path godot --script res://tests/art.gd
godot --path godot --script res://tests/art_ui.gd -- --screenshots=RUTA_ABSOLUTA
godot --headless --path godot --script res://tests/arcade.gd
godot --path godot --script res://tests/arcade_ui.gd
```

Resultados: **9728** comprobaciones de paridad, **130** de interfaz cosmética, **623** de reglas/guardado y **78** del recorrido existente; cero fallos. La paridad comprueba catálogo, tintas en seis paletas/cuatro direcciones y primitivas/tweens contra la ejecución de la fuente original, con muestras en inicio, 25 %, 50 % y final. La interfaz dibuja las 32 piezas y sus firmas en cuatro instantes, prueba repetición/cancelación y confirma que el perfil permanece idéntico. Render gráfico Compatibility con NVIDIA RTX 3060; entrada de escritorio sintética.

`npm run check`: lint, **156 tests**, TypeScript y Vite correctos. `npm run format:check` correcto. No cambió el runtime web; las pruebas de interfaz afectadas se ejecutaron en Godot, sin Playwright adicional.

## Artefactos y límites

En `.artifacts/godot-skins-fix/`, fuera del diff: logs, atlas de 32 piezas, capturas de firmas a 0/100/250/500 ms, vídeo automático actualizado de campaña y Ritmo, APK y manifiesto de copia. Se inspeccionaron el atlas actualizado junto al atlas SVG original de QA y la captura de firmas a 100 ms. Las diferencias de rasterización entre motores no se presentan como igualdad de píxeles.

El entorno ahora dispone de plantillas Android 4.7.2 y SDK. Se exportó `flecha-godot-skins.apk`, debug, paquete separado `com.flechatrampa.godot.preview`, desde una copia temporal, con el preset QA existente y `textures/vram_compression/import_etc2_astc=true` solo en esa copia. Comando: `godot --headless --path COPIA/godot --export-debug "Android QA" RUTA_ABSOLUTA/flecha-godot-skins.apk`. Exportación correcta; Godot avisó de que usó build-tools 35.0.1 al no encontrar una versión igual al target SDK. No se instalaron herramientas ni se instaló esta APK en emulador o teléfono.

Vídeo: escritorio, 1351 frames a 30 FPS, 45,03 segundos, 390×844, entrada sintética y audio de Ritmo acelerado por tres para la captura, como anuncia su portada. No acredita respuesta musical humana ni prueba física. QA debe repetir su comparación independiente y validar el candidato antes de Revisión e integración. La aprobación histórica de los otros criterios es contexto, sin atribuir sus pruebas Android/físicas a este dispatch. No se hicieron commits, push, merge, cambios de rama ni cambios de la instalación clásica.

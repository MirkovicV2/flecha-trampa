# Flecha Trampa · Godot Arcade

Migración jugable en `godot/`, separada del juego Phaser/Capacitor. Abre `project.godot` con **Godot 4.7.2** (motor local verificado, renderer Compatibility). No requiere descargar recursos para jugar. La escena `main.tscn` carga `scripts/main.gd`; los scripts híbridos históricos no forman parte del flujo jugable.

## Recorridos

- Inicio → Mapa → tocar ficha → Iniciar/Continuar → sacar flechas → resultado → mapa. Diez nodos por capítulo, arrastre separado del toque, consulta de completados/bloqueados e Ir a mi nivel.
- Inicio o Mapa → Ritmo → Tutorial/Introducción/Rápida → cuenta atrás → cuatro pads → resultado → reintento. Teclado: flechas o D/F/J/K. El reloj del audio determina tanto posición como juicio; no se acumula delta para juzgar notas.
- Colección → inspeccionar cualquiera de las 32 skins → desbloquear con fragmentos → equipar como acción separada. Cofres y fondos usan inventario propio del perfil importado/nuevo.
- Modos incluye Supervivencia, diario UTC, práctica y códigos FT1/FT2/FT3. Ritmo conserva récords propios sin energía, premios ni avance de campaña.
- Ajustes permite volumen de música/efectos independiente, vibración, movimiento reducido, ventanas asistidas, offset manual y calibración al pulso. La calibración estima latencia combinada de salida y respuesta humana; repetir al cambiar de salida.

Vertical, contenedor de zonas seguras en cuatro lados, botones de 48 unidades y celdas de campaña de al menos 48 con desplazamiento. Se han renderizado 320×568, 390×844 y 428×926 en escritorio. Esto no acredita zonas seguras, latencia, vibración ni tacto de un Android físico.

## Guardado e importación

Directorio Godot propio `FlechaTrampaGodotArcade`; esquema 2, slots `arcade-profile-a.json` / `arcade-profile-b.json`, generaciones alternas y escritura temporal validada antes de renombrar. Los slots `hybrid-demo` y las preferencias clásicas no se leen ni escriben. Los errores se muestran sin anunciar éxito y se intenta recuperar la última generación válida. Una victoria terminal sin recibo se reconcilia al abrir.

Selecciona **una copia JSON exportada** desde Ajustes; se valida tamaño (500000 bytes), versión, tipos, límites, inventario, referencias, geometría, solubilidad y estado de intentos. Antes de confirmar se muestran nivel, intento, skins, fondos, cofres, llaves, fragmentos y reclamados. Cancelar no modifica el perfil. Confirmar reemplaza solo Godot y conserva la generación anterior recuperable. No se importan compras ni se infieren derechos Plus. Los ejemplos son sintéticos; no se ha abierto ninguna partida personal.

Los perfiles clásicos aceptados conservan campos de campaña, intentos, cosméticos, cofres, llaves, fragmentos, recompensas reclamadas y ajustes dentro de `classic`. Los campos incompatibles o versiones inválidas se rechazan; no se transforman gemas híbridas en progreso clásico. Los perfiles clásicos anteriores que carezcan de campos exigidos requieren exportación previamente normalizada por la versión clásica vigente.

## Reproducir comprobaciones

Usar los ejecutables locales existentes. No instalar motor, plantillas ni SDK como parte de estas instrucciones.

```powershell
$godot = "$env:LOCALAPPDATA/CentroOperacionesTools/godot-4.7.2/Godot_v4.7.2-stable_win64_console.exe"
& $godot --version
& $godot --headless --path godot --editor --import --quit
& $godot --headless --path godot --script res://tests/arcade.gd
& $godot --headless --path godot --script res://tests/arcade_ui.gd
& $godot --path godot --script res://tests/arcade_ui.gd -- --screenshots=../.artifacts/godot-arcade/screens
```

Fixtures independientes del generador/fallback y poderes: Node 24 con `--experimental-transform-types godot/tools/export-commercial-reference.mjs`. Este comando ejecuta fuentes TypeScript clásicas sin cambiarlas y consulta GitHub por SHA exacto; no modifica ramas. Los fixtures se incluyen y las pruebas Godot no requieren red. `tools/export_licenses.gd` extrae los avisos del motor instalado. Los tests `run.gd` y `verify-fixture.mjs` describen exclusivamente el prototipo híbrido histórico; la aceptación actual usa `arcade.gd` y `arcade_ui.gd`.

## Paridad, evidencia y límites

Ver [inventario de paridad](PARITY.md) y [validación de Desarrollo](DEVELOPMENT.md). Los checks locales no sustituyen QA/Revisión independientes. Quedan pruebas Android de audio, safe areas, segundo plano y archivo nativo. No se ha probado en emulador ni teléfono físico. Falta autolectura de la preferencia de movimiento reducido del sistema; el ajuste del juego sí se aplica.

Exportación Android bloqueada: no hay plantillas Android Godot 4.7.2 ni SDK Android acreditados en este checkout/entorno. No se instalaron. El paquete previsto para una futura exportación verificada es `com.flechatrampa.godot.preview`, diferente de release/debug clásicos; no se debe exportar con el identificador clásico ni desinstalarlo. No hay APK de esta entrega.

## Recursos

Las 32 siluetas y capas, materiales y las 16 firmas de salida derivan del arte original del repositorio (`src/config/arrow-designs.ts`, `arrow-expansion.ts`). Música, metrónomo y confirmaciones son síntesis original en `arcade_audio.gd`, con pistas a 100/150 BPM. Fondos originales dibujados con geometría; no se copian canciones ni gráficos de StepMania. No hay recursos comprados ni descargas durante el juego.

La fuente predeterminada y componentes del motor conservan sus avisos, extraídos del ejecutable Godot 4.7.2 en [engine-licenses.json](data/engine-licenses.json), visibles desde Ajustes. Licencia del código y arte: política existente del repositorio; esta migración no concede una nueva licencia.

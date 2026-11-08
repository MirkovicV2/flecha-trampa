# Flecha Trampa: primera fase Godot

Demo vertical separada del clásico Phaser/Capacitor. No completa la migración del juego: no incluye economía, cosméticos, diario, retos, generador ni equivalencia de perfiles. El proyecto anterior se conserva.

## Estado y herramientas

Motor local acreditado: **Godot 4.7.2.stable.official.ed1daf0bf**, ejecutable port?til en `C:/Users/brank/AppData/Local/CentroOperacionesTools/godot-4.7.2/`. Renderer Compatibility. `config_version=5` identifica el formato, no la versi?n. Node port?til acreditado: **24.22.1**. No se descargaron ni instalaron herramientas.

Destino verificado mediante `games-checkout-guard.mjs`: checkout can?nico `C:/Users/brank/Documents/ChatGPT/Proyectos Dani/CentroOperaciones/workspaces/flecha-trampa-github`, ref `refs/heads/codex/godot-full-migration`, resultado `allowed: true`. El snapshot original del job dec?a `develop`; la decisi?n posterior de Daniel, confirmada y le?da de vuelta por el coordinador en el panel, sustituye ese destino por `codex/godot-full-migration`. No se cambiaron ramas ni remotes. GitHub queda pendiente del push autorizado despu?s de QA y Revisi?n; no se exige rama remota para implementar localmente.

Comandos ejecutados desde la ra?z del checkout con el ejecutable local `Godot_v4.7.2-stable_win64_console.exe`:

```text
<godot-local> --version
<godot-local> --headless --editor --path godot --quit
<godot-local> --headless --path godot --script res://tests/run.gd --quit-after 600
<godot-local> --headless --path godot --script res://tests/ui.gd --quit-after 600
<godot-local> --headless --path godot --quit-after 10
<node24-local> godot/tests/verify-fixture.mjs
```

Importaci?n y parser correctos tras corregir la inferencia de tipos de la trayectoria. Suite de reglas/persistencia: **77 comprobaciones, 0 fallos**. Suite de integraci?n de escena: **24 comprobaciones, 0 fallos**, incluyendo men?, match, guardado, Atr?s, ayuda, pausa de segundo plano, reinicio confirmado, derrota, victoria y l?mites geom?tricos a 320 ? 568, 390 ? 844 y 428 ? 926. Prueba entrada sint?tica: toque ?nico, pulsaci?n larga sin extracci?n, cancelaci?n por segundo dedo, arrastre y pausa. Arranque headless de la escena principal correcto. El fixture independiente Node tambi?n pasa. Los guardados de las pruebas usan directorios temporales propios y se eliminan al terminar; no leen los slots de uso normal.

Se compactaron la cabecera y el selector persistente para evitar desbordamiento a 320 ? 568; el tama?o del contenedor se aplica despu?s de propagar los m?nimos del tablero al redimensionar. El manejo de JSON corrupto usa el parser con resultado de error y recuperaci?n, sin errores esperados en el registro del motor. La cach? `.godot/` se excluye del repositorio.

Esto acredita ejecuci?n local headless y geometr?a de controles; **no acredita revisi?n visual, renderizado GPU, exportaci?n ni compatibilidad Android real**. No hay `export_presets.cfg` ni plantillas verificadas en `%APPDATA%/Godot/export_templates/4.7.2.stable`; no se inventaron destinos ni firmas, ni se produjo APK. La exportaci?n, SDK y prueba de dispositivo siguen pendientes. No hay `node_modules` en este checkout: `npm run check` se intent? y fall? porque falta `eslint`; `npm run format:check` se intent? y fall? porque falta `prettier`. Las pruebas de navegador no est?n disponibles sin restaurar dependencias; no se modific? el c?digo cl?sico.

## Reglas fijadas: hybrid-demo-v1

Tablero 5 × 5, 25 flechas, 3 vidas por intento; sin tiempo ni coste de reintento. Flechas fijas, gemas intercambiables. Familias: círculo ámbar, cuadrado turquesa y triángulo violeta. En Sacar, ruta libre al borde elimina flecha y gema; primer bloqueo conserva ambas y resta una vida. En Combinar, dos toques intercambian solo gemas vecinas ortogonales; se acepta únicamente una línea contigua horizontal/vertical de 3+ que incluya una celda intercambiada. Se eliminan todas las líneas simultáneamente, con unión de cruces. Sin gravedad, relleno, diagonales, cascadas ni poderes. Huecos rompen líneas, pero no bloquean extracciones. Victoria al vaciar, derrota con cero vidas; entrada terminal ignorada.

Familias iniciales, por filas (0 círculo, 1 cuadrado, 2 triángulo):

```text
0 1 0 2 1
1 0 2 0 2
2 1 0 1 0
0 2 1 2 1
1 0 2 0 2
```

Direcciones por fila: arriba, izquierda, derecha, izquierda, abajo. No hay tríos iniciales; intercambiar filas 1/2 de la columna 2 crea un trío en la fila 1 (coordenadas humanas). La esquina superior izquierda es extraíble. La prueba independiente construye dependencias geométricas por pares, obtiene una solución completa y la ejecuta mediante las reglas; repite tras el match inicial. El conjunto restante solo pierde bloqueos.

## Navegación, entrada y guardado

Inicio con jugar/continuar, ayuda, ajustes descriptivos y progreso anterior; partida con vidas/contador, selector Sacar/Combinar, Rutas y pausa; victoria/derrota y reintento gratuito confirmado. Pulsación de 420 ms inspecciona sin ejecutar al soltar; arrastre superior a 12 unidades lógicas cancela, un segundo dedo cancela el gesto. Las unidades lógicas requieren medir equivalencia con dp en Android real. La entrada no tiene hover. Atrás pausa y cierra primero los diálogos; volver de segundo plano conserva la pausa. Dibujo bajo demanda y temporizador activo solo durante el gesto. Sin sonido, vibración ni animaciones; no hay controles que dependan de ellas.

Cada jugada se guarda antes de dibujar su resultado. Dos archivos `user://hybrid-demo-a.json` y `user://hybrid-demo-b.json` alternan generaciones: se escribe temporal, se cierra y se renombra; la otra generación permanece recuperable. Carga limitada a 16 KiB, versión conocida y máximo 28 acciones; se reproducen acciones válidas desde el tablero fijo, sin confiar en vidas ni tablero proporcionados. Corrupción doble bloquea escrituras hasta confirmación de reinicio. Fallos de escritura muestran aviso y mantienen el intento en memoria; Guardar y salir no sale si falla. Un cierre forzado del sistema puede perder cambios que no alcanzaron almacenamiento. La recuperación de la copia anterior puede perder la última jugada. No se declara resistencia a edición maliciosa ni a dos procesos concurrentes.

## Progreso clásico: limitación y alternativa

El clásico usa `flecha-trampa:profile:v1` y `:backup` en localStorage/Capacitor Preferences, con validación TypeScript en [save-validation.ts](../src/services/save-validation.ts). La demo no abre, escribe ni sobrescribe esas claves y usa su propio directorio de aplicación Godot. No hay puente nativo ni copia de partida real autorizada disponible para validar una importación. Por ello **no se implementa ni se declara probada la importación**: se informa en Progreso anterior y se conserva el clásico como alternativa de continuación. No desinstalar ni borrar los datos del clásico. La fase siguiente requiere copia exportada explícitamente, validación del esquema y resumen previo a confirmar, almacenamiento separado y prueba de que el original permanece idéntico; no se debe reutilizar el identificador de paquete clásico como sustituto de migración.

## Recursos y procedencia

Arte original de esta entrega, generado mediante primitivas geométricas en [board.gd](scripts/board.gd): flechas, piezas, símbolos, fondos y bordes; sin assets externos, recursos de pago ni descargas. No se copian imágenes de Candy Crush. Se usa la fuente predeterminada del motor; revisar sus licencias junto con la distribución de Godot al preparar el paquete. No se incorporan tipografías ni sonidos adicionales. Licencia del código y arte: la misma política del repositorio; esta entrega no concede una licencia nueva sobre el proyecto.

## Compuertas pendientes

- Desarrollo: importación del editor, parser y suite GDScript con versión Godot local acreditada. Confirmar recuperación/reemplazo de archivos en Android y pausa del sistema.
- QA: recorrido de inicio, ambas acciones, inspección, multitáctil, derrota, victoria, reintento, restauración tras cierre, guardado fallido/corrupto y Atrás. Revisar capturas 320/390/428 de ancho, altura reducida, safe areas, lectura simultánea de flecha/gema y que controles no tapen tablero. Verificar 12 dp reales.
- Android: plantillas, SDK, renderer y export preset con identificador demo propio; exportar y probar solo con herramientas autorizadas existentes, sin claves incluidas. Teléfono físico es una comprobación distinta del emulador.
- Revisión independiente y aprobación de UX/Desarrollo/QA antes de push o integración. Rama propuesta/creada por autorización del panel: `codex/godot-full-migration`, desde `develop`; ninguna publicación forma parte de esta entrega.

El alcance siguiente de migración completa necesita UX adicional para los sistemas clásicos ausentes. Esta demo no concede recompensas, no consume reservas y no modifica generadores ni formatos clásicos.

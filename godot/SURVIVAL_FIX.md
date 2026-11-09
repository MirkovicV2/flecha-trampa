# Corrección de Supervivencia · Revisión 2

La siguiente oleada conservaba las vidas y el tiempo activo, pero reiniciaba
errores y movimientos. Tras ganar con una o dos vidas, el validador rechazaba
el perfil y la salida al mapa quedaba bloqueada por el fallo de guardado.

`scripts/main.gd` conserva el daño de la sesión como `initialLives - lives`.
Los movimientos del tablero nuevo empiezan con ese número de errores; las
extracciones del tablero anterior no se cuentan como extracciones del nuevo.
No cambia el esquema, el validador, el generador, el diario ni los retos.
Si falla la escritura, la oleada queda en pausa con el error visible.

## Comprobaciones locales

Godot local: **4.7.2.stable.official.ed1daf0bf**, Windows, modo headless.

```powershell
$godot = "$env:LOCALAPPDATA/CentroOperacionesTools/godot-4.7.2/Godot_v4.7.2-stable_win64_console.exe"
& $godot --headless --path godot --script res://tests/survival_ui.gd
```

La regresión reproduce choques reales, resuelve las reservas mediante las reglas
y gana con dos y una vidas. Comprueba la segunda oleada, validación estricta,
escritura, vuelta al mapa, destrucción y reapertura de la escena, restauración
exacta del intento, presión acumulada y pausa sin avance. Usa slots exclusivos
y los elimina al terminar; no abre el perfil personal ni el juego clásico.
También comprueba escritura fallida sin anunciar que la oleada está jugando.

Antes del arreglo: **12 fallos en 20 comprobaciones**. Después: **22/22**.
Suites existentes: reglas **623/623**, interfaz **78/78**, arte **9728/9728** e
interfaz de arte **130/130**. La interfaz existente avisa de objetos pendientes
al cerrar el harness; termina con código 0. `npm run check` con Node 24.22.1:
lint, **156 tests**, TypeScript y build correctos. `npm run format:check` y
`git diff --check` correctos.

Logs: `.artifacts/godot-survival-fix/`, `.artifacts/godot-survival-check.log` y
`.artifacts/godot-survival-format.log`. Esta ronda usa entrada sintética en
escritorio; no acredita una prueba física, emulador ni audio Android. La APK
y el vídeo anteriores corresponden al código anterior: QA debe regenerar la
APK y revalidar esta corrección antes de Revisión e integración.

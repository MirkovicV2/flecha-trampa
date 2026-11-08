extends Control

var game: DemoRules
var store := DemoSaveStore.new()
var page := "home"
var mode := "take"
var routes := false
var selection := -1
var busy := false
var box: VBoxContainer
var board: DemoBoard
var status: Label
var feedback := ""
var overlay: AcceptDialog

func _ready() -> void:
	get_tree().auto_accept_quit = false
	game = store.load_game()
	resized.connect(_layout)
	show_home()

func _notification(what: int) -> void:
	if not is_node_ready():
		return
	if what == NOTIFICATION_APPLICATION_PAUSED or what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		if page == "play":
			persist()
			show_pause()
	elif what == NOTIFICATION_WM_GO_BACK_REQUEST:
		go_back()
	elif what == NOTIFICATION_WM_CLOSE_REQUEST:
		if game != null:
			persist()
		if store.message.is_empty():
			get_tree().quit()
		else:
			show_pause()

func _unhandled_key_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel"):
		go_back()
		get_viewport().set_input_as_handled()

func go_back() -> void:
	if is_instance_valid(overlay):
		overlay.hide()
		overlay.queue_free()
		show_pause() if game != null else show_home()
	elif page == "play":
		persist()
		show_pause()
	elif page == "pause":
		show_home()
	else:
		show_home()

func clear(next_page: String) -> void:
	if is_instance_valid(board):
		board.enabled = false
		board.cancel_gesture()
	board = null
	for child in get_children():
		remove_child(child)
		child.queue_free()
	overlay = null
	page = next_page
	selection = -1
	box = VBoxContainer.new()
	box.add_theme_constant_override("separation", 8)
	add_child(box)
	_layout()

func _layout() -> void:
	if not is_instance_valid(box):
		return
	# Android safe-area values use physical pixels; convert to viewport coordinates.
	var inset_top := 16.0
	var inset_bottom := 16.0
	if OS.has_feature("android"):
		var safe := DisplayServer.get_display_safe_area()
		var screen := DisplayServer.screen_get_size()
		if screen.y > 0 and safe.size.y > 0:
			inset_top = maxf(16.0, safe.position.y * size.y / screen.y)
			inset_bottom = maxf(16.0, (screen.y - safe.end.y) * size.y / screen.y)
	var width := minf(390.0, size.x - 24.0)
	if is_instance_valid(board):
		var side := minf(width, maxf(250.0, size.y - inset_top - inset_bottom - 340.0))
		board.custom_minimum_size = Vector2(side, side)
		board.queue_redraw()
	box.position = Vector2((size.x - width) / 2.0, inset_top)
	# Container minimum sizes propagate at frame end after the board shrinks.
	box.set_deferred("size", Vector2(width, size.y - inset_top - inset_bottom))

func label_text(text: String, font_size := 18) -> Label:
	var label := Label.new()
	label.text = text
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size", font_size)
	box.add_child(label)
	return label

func button(text: String, callback: Callable) -> Button:
	var control := Button.new()
	control.text = text
	control.custom_minimum_size.y = 48
	control.pressed.connect(callback)
	box.add_child(control)
	return control

func show_home() -> void:
	clear("home")
	label_text("FLECHA TRAMPA", 30)
	label_text("Abre camino · Demo de flechas y gemas")
	label_text("Un tablero. Dos maneras de abrir camino.")
	button("Continuar demo" if game != null and not game.finished() else "Jugar demo", start_or_continue)
	button("Cómo jugar", show_help)
	button("Ajustes", show_settings)
	button("Progreso anterior", show_previous)
	label_text(store.message)

func start_or_continue() -> void:
	if store.protected:
		confirm_restart()
		return
	if game == null or game.finished():
		game = DemoRules.new()
		persist()
	show_play()

func persist() -> bool:
	return game == null or store.save_game(game)

func show_play() -> void:
	if game == null:
		return
	if game.finished():
		show_result()
		return
	clear("play")
	var header := HBoxContainer.new()
	box.add_child(header)
	var pause_button := button("Pausa", func() -> void:
		persist()
		show_pause())
	pause_button.reparent(header)
	var counters := label_text("Vidas %d/3 · Flechas %d/25" % [game.lives, 25 - game.remaining()], 16)
	counters.reparent(header)
	counters.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	counters.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var center := CenterContainer.new()
	box.add_child(center)
	board = DemoBoard.new()
	board.game = game
	center.add_child(board)
	board.tapped.connect(on_cell)
	board.inspected.connect(inspect_cell)
	var modes := HBoxContainer.new()
	box.add_child(modes)
	var take_button := button("Sacar ✓" if mode == "take" else "Sacar", func() -> void: set_mode("take"))
	var swap_button := button("Combinar ✓" if mode == "swap" else "Combinar", func() -> void: set_mode("swap"))
	var routes_button := button("Rutas ✓" if routes else "Rutas", func() -> void: routes = not routes; show_play())
	for control in [take_button, swap_button, routes_button]:
		control.reparent(modes)
		control.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label_text("Toca una flecha. Mantén 420 ms para inspeccionar." if mode == "take" else "Toca dos gemas vecinas para intercambiarlas.", 16)
	status = label_text(feedback + ("\n" + store.message if not store.message.is_empty() else ""), 16)
	_layout()

func set_mode(value: String) -> void:
	mode = value
	feedback = ""
	show_play()

func inspect_cell(cell: int) -> void:
	if page != "play" or not game.occupied(cell):
		return
	board.route = cell
	board.obstacle = game.blocker(cell)
	board.queue_redraw()
	status.text = "Ruta libre" if board.obstacle < 0 else "El borde rojo marca el primer obstáculo."

func on_cell(cell: int) -> void:
	if busy or page != "play" or not game.occupied(cell):
		return
	if routes:
		inspect_cell(cell)
		return
	if mode == "swap" and selection < 0:
		selection = cell
		board.selected = cell
		board.queue_redraw()
		return
	busy = true
	var result := game.extract(cell) if mode == "take" else game.combine(selection, cell)
	selection = -1
	if result.changed:
		# Save synchronously before any redraw or outcome screen; no animation owns state.
		persist()
		feedback = "Bloqueada: pierdes una vida." if result.get("blocker", -1) >= 0 else "¡Camino abierto!"
	else:
		feedback = "Sin línea de 3: intercambio revertido, sin coste."
	show_play()
	if is_instance_valid(board):
		board.obstacle = result.get("blocker", -1)
		board.queue_redraw()
	busy = false

func show_pause() -> void:
	clear("pause")
	label_text("En pausa", 30)
	button("Continuar", show_play)
	button("Reiniciar intento", confirm_restart)
	button("Guardar y salir", func() -> void:
		if persist():
			show_home()
		else:
			show_pause())
	button("Cómo jugar", show_help)
	button("Ajustes", show_settings)
	label_text(store.message)

func confirm_restart() -> void:
	var dialog := ConfirmationDialog.new()
	overlay = dialog
	dialog.title = "¿Reiniciar la demo?"
	dialog.dialog_text = "Restaura las 25 piezas y 3 vidas. El intento demo anterior se reemplaza; el progreso clásico permanece intacto."
	dialog.ok_button_text = "Reiniciar"
	dialog.cancel_button_text = "Cancelar"
	add_child(dialog)
	dialog.confirmed.connect(func() -> void:
		store.protected = false
		game = DemoRules.new()
		feedback = ""
		persist()
		show_play())
	dialog.canceled.connect(func() -> void:
		overlay = null
		dialog.queue_free())
	dialog.popup_centered(Vector2i(300, 200))

func show_result() -> void:
	clear("result")
	label_text("¡Victoria!" if game.remaining() == 0 else "Sin vidas", 32)
	label_text("Flechas %d/25 · Vidas %d/3" % [25 - game.remaining(), game.lives])
	label_text("Demo completada. El progreso clásico y sus reservas no cambian.")
	button("Reintentar gratis", confirm_restart)
	button("Inicio", show_home)
	label_text(store.message)

func information(title: String, text: String) -> void:
	if page == "play":
		persist()
		show_pause()
	var dialog := AcceptDialog.new()
	overlay = dialog
	dialog.title = title
	dialog.dialog_text = text
	add_child(dialog)
	dialog.confirmed.connect(func() -> void:
		overlay = null
		dialog.queue_free())
	dialog.popup_centered(Vector2i(320, 360))

func show_help() -> void:
	information("Cómo jugar", "Sacar: una flecha sale si su línea al borde está libre. Un bloqueo gasta 1 vida.\n\nCombinar: toca dos gemas vecinas. Solo se aceptan líneas rectas de 3 o más, que retiran gemas y flechas. Sin gravedad ni relleno.\n\nVacía el tablero para ganar. Con 0 vidas pierdes. Mantén 420 ms o activa Rutas para inspeccionar sin coste. Arrastrar cancela.\n\nAtrás abre pausa. La demo guarda cada jugada y se pausa al volver de segundo plano.")

func show_settings() -> void:
	information("Ajustes de la demo", "Demo silenciosa, sin vibración ni animaciones. Las tres familias usan color y símbolo. Juego vertical sin tiempo límite.\n\nLos ajustes y recursos del clásico se conservan en la aplicación original.")

func show_previous() -> void:
	information("Progreso anterior", "Tu progreso clásico permanece en la aplicación original. Esta demo guarda por separado.\n\nNo se ha validado la importación de una copia de partida real ni el acceso desde Godot a Capacitor Preferences. No se importan ni escriben claves clásicas.\n\nConserva la app original y sus datos. Importación y resumen previo quedan pendientes para una fase posterior.")

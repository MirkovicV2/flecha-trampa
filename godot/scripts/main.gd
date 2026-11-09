extends Control

var store := ProfileStore.new()
var audio: ArcadeAudio
var game: CampaignRules
var rhythm: RhythmRules
var page := "home"
var box: VBoxContainer
var board: CampaignBoard
var field: RhythmField
var map_view: CampaignMap
var status: Label
var counters: Label
var sheet: VBoxContainer
var overlay: Window
var chapter := 0
var map_offset := 0.0
var selected_level := -1
var routes := false
var feedback := ""
var campaign_combo := 0
var last_extraction := -10000
var resume_count := 0.0
var calibration := false
var samples: Array[float] = []
var calibration_last_beat := -1
var power_deals: Array = []
var power_position := 0
var autosave := 0.0
var active_contacts: Dictionary = {}

func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		if event.pressed and not event.canceled: active_contacts[event.index] = true
		else: active_contacts.erase(event.index)

func _ready() -> void:
	get_tree().auto_accept_quit = false
	store.load_profile()
	# Reconcile a terminal attempt saved before its result was acknowledged.
	if not store.protected:
		for key in ["classicSave", "dailySave", "sharedSave"]:
			if classic()[key] != null:
				var recovered := CampaignRules.restore(classic()[key])
				if recovered != null and recovered.finished() and not recovered.session.recorded:
					store.record_result(recovered); classic()[key] = recovered.session; store.save()
	audio = ArcadeAudio.new(); add_child(audio)
	apply_audio()
	resized.connect(_layout)
	show_home()

func classic() -> Dictionary:
	return store.profile.classic

func settings() -> Dictionary:
	return store.profile.rhythm.settings

func equipped() -> Dictionary:
	return PieceArt.design(store.catalog, classic().settings.skin)

func apply_audio() -> void:
	if is_instance_valid(audio): audio.configure(settings(), classic().settings.sound)

func _notification(what: int) -> void:
	if not is_node_ready(): return
	if what in [NOTIFICATION_APPLICATION_PAUSED, NOTIFICATION_APPLICATION_FOCUS_OUT]:
		if page in ["play", "rhythm_play"]: show_pause()
	elif what == NOTIFICATION_WM_GO_BACK_REQUEST: go_back()
	elif what == NOTIFICATION_WM_CLOSE_REQUEST:
		if page == "rhythm_play": audio.pause_song()
		if persist(): get_tree().quit()
		else: show_pause()

func _unhandled_key_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel") and not event.is_echo():
		go_back(); get_viewport().set_input_as_handled()

func go_back() -> void:
	if is_instance_valid(overlay):
		overlay.queue_free(); overlay = null; store.pending_import = {}; return
	if page in ["play", "rhythm_play"]: show_pause()
	elif page == "pause":
		if rhythm != null: audio.stop(); rhythm = null; show_rhythm_menu()
		else: show_map()
	elif page == "map" and selected_level >= 0:
		selected_level = -1; update_sheet()
	else: audio.stop(); rhythm = null; show_home()

func clear(next_page: String) -> void:
	if is_instance_valid(board): board.enabled = false; board.cancel_gesture()
	if is_instance_valid(field): field.enabled = false; field.cancel_contacts()
	if is_instance_valid(map_view): map_offset = map_view.offset
	board = null; field = null; map_view = null; sheet = null
	for child in get_children():
		if child == audio: continue
		remove_child(child); child.queue_free()
	overlay = null; page = next_page
	box = VBoxContainer.new(); box.add_theme_constant_override("separation", 6); add_child(box)
	box.minimum_size_changed.connect(_layout)
	queue_redraw()
	_layout()

func _layout() -> void:
	if not is_instance_valid(box): return
	var insets := Vector4(12, 12, 12, 12)
	if OS.has_feature("android"):
		var safe := DisplayServer.get_display_safe_area(); var screen := DisplayServer.screen_get_size()
		if screen.x > 0 and screen.y > 0 and safe.size.x > 0:
			insets = Vector4(maxf(12, safe.position.x * size.x / screen.x), maxf(12, safe.position.y * size.y / screen.y), maxf(12, (screen.x - safe.end.x) * size.x / screen.x), maxf(12, (screen.y - safe.end.y) * size.y / screen.y))
	var width := minf(428, size.x - insets.x - insets.z)
	box.position = Vector2(insets.x + (size.x - insets.x - insets.z - width) / 2, insets.y)
	box.set_deferred("size", Vector2(width, size.y - insets.y - insets.w))

func label_text(text: String, font_size := 16, parent: Node = null) -> Label:
	var label := Label.new(); label.text = text; label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label.add_theme_font_size_override("font_size", font_size)
	(parent if parent != null else box).add_child(label)
	return label

func button(text: String, callback: Callable, parent: Node = null) -> Button:
	var control := Button.new(); control.text = text; control.custom_minimum_size.y = 48
	control.add_theme_font_size_override("font_size", 16); control.pressed.connect(callback)
	var normal := PieceArt.tile(Color("20384a"), 12)
	normal.content_margin_left = 10; normal.content_margin_right = 10
	control.add_theme_stylebox_override("normal", normal)
	var focused := PieceArt.tile(Color("294c5b"), 12); focused.border_color = Color("d6ff89"); focused.set_border_width_all(2)
	control.add_theme_stylebox_override("focus", focused)
	control.add_theme_stylebox_override("pressed", PieceArt.tile(Color("3d635f"), 12))
	(parent if parent != null else box).add_child(control)
	control.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return control

func row(parent: Node = null) -> HBoxContainer:
	var value := HBoxContainer.new(); value.add_theme_constant_override("separation", 6)
	(parent if parent != null else box).add_child(value)
	return value

func scrolling() -> VBoxContainer:
	var scroll := ScrollContainer.new(); scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED; box.add_child(scroll)
	var content := VBoxContainer.new(); content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", 8); scroll.add_child(content)
	return content

func skin_preview(parent: Node, design: Dictionary, side := 70.0) -> Control:
	var preview := Control.new(); preview.custom_minimum_size = Vector2(side, side); preview.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(preview)
	preview.set_meta("motion_age", -1.0)
	preview.draw.connect(func() -> void:
		var age: float = preview.get_meta("motion_age")
		var center := preview.size / 2; var scale_side := minf(preview.size.x, preview.size.y) * 0.9
		var alpha := 1.0
		if age >= 0:
			if classic().settings.reducedMotion: alpha = 1 - sin(age / 0.55 * PI) * 0.4
			else:
				PieceArt.draw_exit(preview, design, center, scale_side, Vector2.UP, age / 0.55, classic().settings.theme)
				center += Vector2.UP * scale_side * age * 2; alpha = 1 - age / 0.55
		PieceArt.draw_piece(preview, design, center, scale_side, "up", alpha, classic().settings.theme))
	return preview

func play_skin_preview(preview: Control) -> void:
	if preview.has_meta("motion_tween"):
		var previous_tween: Tween = preview.get_meta("motion_tween")
		if previous_tween.is_valid(): previous_tween.kill()
	var tween := preview.create_tween(); preview.set_meta("motion_tween", tween)
	tween.tween_method(func(age: float) -> void: preview.set_meta("motion_age", age); preview.queue_redraw(), 0.0, 0.55, 0.55)
	tween.tween_callback(func() -> void: preview.set_meta("motion_age", -1.0); preview.queue_redraw())

func show_home() -> void:
	clear("home"); rhythm = null; calibration = false; audio.stop()
	label_text("FLECHA TRAMPA", 30)
	var hero := row(); skin_preview(hero, equipped(), 64)
	label_text("Abre camino.\n%s · Nivel %d" % [equipped().name, classic().level], 18, hero)
	button("Continuar nivel %d" % classic().level if classic().classicSave != null and classic().classicSave.state.status == "playing" else "Iniciar nivel %d · 1 carga" % classic().level, continue_campaign)
	button("Mapa de campaña", func() -> void: chapter = int((classic().level - 1) / 10); selected_level = -1; show_map(true))
	button("Ritmo", show_rhythm_menu)
	var actions := row(); button("Colección", show_collection, actions); button("Modos", show_modes, actions)
	button("Ajustes e importar copia", show_settings)
	status = label_text(store.message if not store.message.is_empty() else "Perfil Godot separado · Arcade en desarrollo", 16)

func continue_campaign() -> void:
	if classic().classicSave != null and classic().classicSave.state.status == "playing":
		game = CampaignRules.restore(classic().classicSave)
		if game == null: feedback = "Intento inválido; se ha conservado la copia."; show_home(); return
		show_play(); return
	start_campaign()

func canonical_board(level: int) -> Dictionary:
	return LevelGenerator.new().generate("classic:%s:%d" % [classic().runId, level], LevelGenerator.config_for_level(level))

func assign_power(value: CampaignRules) -> void:
	while power_deals.size() < value.session.level:
		var n := power_deals.size() + 1
		var kind := CampaignRules.power_at("classic:" + classic().runId, power_position)
		var source: Dictionary = value.session.initialBoard if n == value.session.level else canonical_board(n)
		var id := CampaignRules.select_power(source, kind)
		power_deals.append(kind if not id.is_empty() else "")
		if not id.is_empty(): power_position += 1
	var power: String = power_deals[value.session.level - 1]
	value.session.powerKind = power
	value.session.powerArrowId = CampaignRules.select_power(value.session.initialBoard, power) if not power.is_empty() else ""

func start_campaign() -> void:
	if store.protected: show_home(); return
	var before := store.profile.duplicate(true)
	if not store.spend_energy():
		information("Sin cargas", "Se recupera una carga cada diez minutos. Ritmo y la práctica de retos siguen disponibles."); return
	var level: int = classic().level
	var prior: Variant = classic().classicSave
	var retrying: bool = prior != null and prior.state.status == "lost" and prior.level == level
	game = CampaignRules.create(level, "classic:%s:%d" % [classic().runId, level], LevelGenerator.config_for_level(level))
	if game == null:
		store.profile = before; information("Generación no disponible", "No se ha cobrado ni cambiado la semilla."); return
	if retrying:
		# A retry preserves the board and an intentionally empty or legacy deal.
		game.session.seed = prior.seed; game.session.config = prior.config.duplicate(true)
		game.session.initialBoard = prior.initialBoard.duplicate(true)
		game.session.state.board = prior.initialBoard.duplicate(true)
		game.session.state.totalArrows = prior.initialBoard.arrows.size()
		game.session.powerArrowId = prior.get("powerArrowId", "")
		game.session.powerKind = prior.get("powerKind", "pulse")
		game.session.powerPolicy = prior.get("powerPolicy", "eligible-v1")
	else: assign_power(game)
	if classic().economy.collection.lifeTokens > 0:
		classic().economy.collection.lifeTokens -= 1
		game.session.lifeTokenSpent = true
		game.session.state.initialLives = 4; game.session.state.lives = 4
	game.session.energySpent = true; game.session.energyPolicy = "attempt-v2"
	classic().stats.played += 1; classic().classicSave = game.session
	if not persist(): store.profile = before; game = null; show_home(); return
	feedback = ""; campaign_combo = 0; show_play()

func show_map(center := false) -> void:
	if not persist(): information("Error de guardado", store.message); return
	clear("map")
	label_text("CAMPAÑA · Capítulo %d" % [chapter + 1], 22)
	var nav := row()
	button("‹", func() -> void: chapter = maxi(0, chapter - 1); selected_level = -1; map_offset = 0; show_map(), nav).disabled = chapter == 0
	button("Ir a mi nivel", func() -> void: chapter = int((classic().level - 1) / 10); selected_level = classic().level; show_map(true), nav)
	button("›", func() -> void: chapter += 1; selected_level = -1; map_offset = 0; show_map(), nav)
	map_view = CampaignMap.new(); map_view.chapter = chapter; map_view.current = int(classic().level); map_view.offset = map_offset
	map_view.custom_minimum_size.y = 160; map_view.size_flags_vertical = Control.SIZE_EXPAND_FILL; box.add_child(map_view)
	map_view.selected.connect(func(level: int) -> void: selected_level = level; update_sheet())
	sheet = VBoxContainer.new(); box.add_child(sheet); update_sheet()
	var actions := row(); button("Inicio", show_home, actions); button("Ritmo", show_rhythm_menu, actions)
	if center: map_view.call_deferred("center_current")

func update_sheet() -> void:
	for child in sheet.get_children(): sheet.remove_child(child); child.queue_free()
	if selected_level < 0:
		label_text("Toca un nivel para consultar su ficha.\nArrastra el camino para explorar.", 16, sheet); return
	var current: bool = selected_level == classic().level
	label_text("Nivel %d · %s" % [selected_level, "Estás aquí" if current else ("Completado" if selected_level < classic().level else "Bloqueado")], 20, sheet)
	if current:
		button("Continuar · sin coste" if classic().classicSave != null and classic().classicSave.state.status == "playing" else "Iniciar · 1 carga", continue_campaign, sheet)
	else:
		label_text("Consulta: las victorias anteriores no se repiten." if selected_level < classic().level else "Completa el nivel actual para avanzar.", 16, sheet)

func persist() -> bool:
	if game != null:
		var key := "classicSave" if game.session.mode == "classic" else ("dailySave" if game.session.mode == "daily" else "sharedSave")
		if game.session.mode == "endless": store.profile.endlessSave = game.session
		else: classic()[key] = game.session
	return store.save()

func show_play() -> void:
	if game == null: return
	if game.finished(): finish_campaign(); return
	clear("play"); rhythm = null
	var header := row(); button("Pausa", show_pause, header)
	counters = label_text("", 18, header); counters.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	board = CampaignBoard.new(); board.game = game; board.design = equipped(); board.reduced = classic().settings.reducedMotion
	board.color_theme = classic().settings.theme
	board.custom_minimum_size.y = 230; board.size_flags_vertical = Control.SIZE_EXPAND_FILL; box.add_child(board)
	board.tapped.connect(on_cell); board.inspected.connect(inspect_cell)
	var actions := row()
	button("Rutas ✓" if routes else "Rutas", func() -> void: routes = not routes; show_play(), actions)
	button("Pista (%d)" % classic().hints, hint, actions)
	if game.session.get("powerArrowId", "") != "" and game.session.get("powerArrowId") != null:
		var kind: String = game.session.get("powerKind", "pulse")
		button({"pulse": "✦ Pulso", "ray": "↔ Rayo", "nova": "✳ Nova"}.get(kind, "Pulso"), show_power_help, actions)
	status = label_text(feedback, 16)
	label_text("Toca para sacar · mantén para inspeccionar\nArrastra tableros grandes · flechas y Enter", 16)
	update_counters()

func show_power_help() -> void:
	var kind: String = game.session.get("powerKind", "pulse")
	var names := {"pulse": "Pulso", "ray": "Rayo", "nova": "Nova"}
	var texts := {"pulse": "Libera hasta 2 cercanas de igual dirección (distancia 2).", "ray": "Libera hasta 3 de la fila o columna.", "nova": "Libera hasta 3 vecinas, incluidas diagonales."}
	var dialog := AcceptDialog.new(); overlay = dialog; dialog.title = names[kind]
	dialog.dialog_text = texts[kind] + "\nSolo se activa al sacar su flecha por una ruta libre. Chocar no lo gasta."
	dialog.ok_button_text = "Entendido"; add_child(dialog)
	dialog.confirmed.connect(func() -> void:
		if not classic().has("powerTutorialsSeen"): classic().powerTutorialsSeen = []
		if kind not in classic().powerTutorialsSeen: classic().powerTutorialsSeen.append(kind)
		persist(); overlay = null; dialog.queue_free())
	dialog.popup_centered(Vector2i(mini(360, int(size.x) - 24), 230))

func update_counters() -> void:
	if not is_instance_valid(counters) or game == null: return
	counters.text = "♥ %d · %d flechas\nCombo %d" % [game.session.state.lives, game.board().arrows.size(), campaign_combo]
	if game.session.mode == "endless":
		counters.text = "♥ %d · %d/%d\n%.0f s · entrada %.1f s" % [game.session.state.lives, game.board().arrows.size(), int(ceil(game.board().width * game.board().height * 0.7)), game.session.elapsedMs / 1000, game.session.survival.arrivalInMs / 1000]
	if is_instance_valid(status): status.text = feedback + ("\n" + store.message if not store.message.is_empty() else "")

func inspect_cell(cell: int) -> void:
	var arrow := game.arrow_at(cell)
	if arrow.is_empty(): return
	board.route = cell; var obstacle := game.blocker(arrow)
	board.obstacle = -1 if obstacle.is_empty() else int(obstacle.y) * int(game.board().width) + int(obstacle.x)
	feedback = "Ruta libre" if obstacle.is_empty() else "Bloqueo real marcado en rojo"
	if arrow.id == game.session.get("powerArrowId", ""):
		feedback += " · " + {"pulse": "Pulso: 2 cercanas de igual dirección", "ray": "Rayo: 3 de fila o columna", "nova": "Nova: 3 vecinas"}.get(game.session.powerKind, "Pulso")
	board.queue_redraw(); update_counters()

func hint() -> void:
	if classic().hints < 1 or game.finished(): return
	for arrow in game.board().arrows:
		if game.blocker(arrow).is_empty():
			classic().hints -= 1; game.session.hintsUsed = game.session.get("hintsUsed", 0) + 1
			if persist(): inspect_cell(int(arrow.y) * int(game.board().width) + int(arrow.x))
			else: update_counters()
			return

func on_cell(cell: int) -> void:
	if page != "play" or game.finished(): return
	if routes: inspect_cell(cell); return
	var arrow := game.arrow_at(cell).duplicate()
	var result := game.extract(cell)
	if not result.changed: return
	if result.blocked:
		campaign_combo = 0; feedback = "Bloqueada · pierdes una vida"; board.obstacle = result.obstacle
	else:
		campaign_combo = campaign_combo + 1 if Time.get_ticks_msec() - last_extraction <= 1800 else 1
		last_extraction = Time.get_ticks_msec(); game.session.bestCombo = maxi(game.session.get("bestCombo", 0), campaign_combo)
		classic().stats.arrowsCleared += result.removed.size()
		classic().stats.bestCombo = maxi(classic().stats.bestCombo, campaign_combo)
		feedback = "¡Camino abierto!"
		var index := RhythmRules.THRESHOLDS.find(campaign_combo)
		if index >= 0: feedback = "¡%s!" % RhythmRules.TITLES[index]
	if not persist(): board.enabled = false; update_counters(); return
	audio.confirm_sound(not result.blocked)
	if classic().settings.haptics and OS.has_feature("android"): Input.vibrate_handheld(20)
	if not result.blocked: board.animate_exit(arrow)
	board.queue_redraw(); update_counters()
	if game.finished(): finish_campaign()

func finish_campaign() -> void:
	var first_result: bool = not game.session.recorded
	store.record_result(game)
	if not persist():
		if is_instance_valid(status): status.text = store.message
		return
	if first_result: audio.result_sound(game.session.state.status == "won")
	clear("campaign_result")
	label_text("¡Camino abierto!" if game.session.state.status == "won" else "Sin vidas", 30)
	skin_preview(box, equipped(), 90)
	label_text("Estrellas %d/3 · Mejor combo %d\nErrores %d · Pistas %d" % [game.stars(), game.session.get("bestCombo", 0), game.session.state.errors, game.session.get("hintsUsed", 0)], 20)
	button("Volver al mapa", func() -> void: chapter = int((classic().level - 1) / 10); selected_level = classic().level; show_map(true))
	if game.session.state.status == "lost" and game.session.mode == "classic": button("Reintentar · 1 carga", start_campaign)
	if game.session.mode == "endless" and game.session.state.status == "won": button("Siguiente oleada", start_survival_wave)
	button("Inicio", show_home)

func show_pause() -> void:
	var rhythm_active := rhythm != null
	if rhythm_active: audio.pause_song()
	else: persist()
	clear("pause"); label_text("En pausa", 30)
	button("Seguir", resume_rhythm if rhythm_active else show_play)
	if rhythm_active:
		button("Reintentar pista", func() -> void: start_rhythm(rhythm.track))
		button("Salir a Ritmo", func() -> void: audio.stop(); rhythm = null; show_rhythm_menu())
	else:
		button("Volver al mapa", func() -> void: show_map())
		button("Guardar de nuevo", func() -> void: persist(); show_pause())
	label_text(store.message)

func show_rhythm_menu() -> void:
	audio.stop(); rhythm = null; game = null; clear("rhythm_menu")
	label_text("RITMO", 30)
	var content := scrolling()
	label_text("Cuatro carriles. Toca los pads cuando la flecha cruce la línea dorada. Flechas o D F J K.", 16, content)
	button("Tutorial · 4 demostraciones", func() -> void: start_rhythm("tutorial"), content)
	button("Introducción · 100 BPM · 77 s", func() -> void: start_rhythm("intro"), content)
	button("Rápida · 150 BPM · 77 s", func() -> void: start_rhythm("fast"), content)
	button("Calibrar audio / entrada", start_calibration, content)
	button("Ajustes", show_settings, content)
	label_text("Récords propios · sin cargas ni premios de campaña", 16, content)
	for track in ["intro", "fast"]:
		var template := RhythmRules.new(track, settings().windows)
		var record: Dictionary = store.profile.rhythm.records.get(template.record_key(), {})
		label_text(("Introducción" if track == "intro" else "Rápida") + (" · Sin récord" if record.is_empty() else " · %d puntos · %.1f %%" % [record.score, record.accuracy]), 16, content)
	button("Inicio", show_home)

func start_rhythm(track: String) -> void:
	calibration = false; samples.clear(); resume_count = 0
	rhythm = RhythmRules.new(track, settings().windows, settings().offsetMs)
	audio.start(rhythm); build_rhythm_screen()

func build_rhythm_screen() -> void:
	clear("rhythm_play")
	var header := row(); button("Pausa", show_pause, header)
	counters = label_text("Combo 0 · 0", 20, header)
	status = label_text("Toca los pads al cruzar la línea dorada", 16)
	field = RhythmField.new(); field.rules = rhythm; field.audio = audio; field.design = equipped(); field.reduced = classic().settings.reducedMotion
	field.color_theme = classic().settings.theme
	field.contacts = active_contacts.duplicate()
	field.custom_minimum_size.y = 260; field.size_flags_vertical = Control.SIZE_EXPAND_FILL; box.add_child(field)
	field.lane_pressed.connect(on_lane)
	if rhythm.track == "tutorial": button("Saltar tutorial", show_rhythm_menu)
	label_text("← izquierda    ↓ abajo    ↑ arriba    → derecha", 16)

func on_lane(lane: int) -> void:
	if page != "rhythm_play" or resume_count > 0: return
	var now := audio.clock_seconds()
	if calibration:
		var beat := int(round(now * 100 / 60))
		if beat < 4 or beat == calibration_last_beat: return
		calibration_last_beat = beat
		var error := (now - beat * 0.6) * 1000
		if absf(error) <= 250: samples.append(error)
		status.text = "Muestras %d/16" % samples.size(); audio.confirm_sound(); field.flash(lane)
		if samples.size() >= 16: finish_calibration()
		return
	if now < rhythm.lead - rhythm.windows()[2] / 1000 or now > rhythm.duration: return
	var result := rhythm.hit(lane, now)
	status.text = result.message + (" · ¡%s!" % result.celebration if not result.celebration.is_empty() else "")
	field.flash(lane); audio.confirm_sound(result.hit)
	if result.hit and classic().settings.haptics and OS.has_feature("android"): Input.vibrate_handheld(15)

func _process(delta: float) -> void:
	if page == "play" and game != null and not game.finished():
		game.session.elapsedMs += delta * 1000; classic().stats.totalPlayMs += delta * 1000
		autosave += delta
		if game.tick_survival(delta * 1000):
			persist(); board.queue_redraw(); update_counters()
			if game.finished(): finish_campaign()
		if autosave >= 5: autosave = 0; persist()
		if game.session.mode == "endless": update_counters()
	if page != "rhythm_play" or rhythm == null: return
	if resume_count > 0:
		resume_count = maxf(0, resume_count - delta)
		field.countdown = str(int(ceil(resume_count)))
		if resume_count == 0:
			audio.resume_song(); field.paused = false; field.enabled = true; field.countdown = ""
		return
	var now := audio.clock_seconds()
	if calibration:
		field.countdown = str(4 - int(now / 0.6)) if now < 2.4 else "•"
		if now >= rhythm.duration - 1: finish_calibration()
		return
	field.countdown = str(maxi(1, int(ceil((rhythm.lead - now) * rhythm.bpm / 60)))) if now < rhythm.lead else ""
	if rhythm.expire(now) > 0: status.text = "Fallo · sigue el pulso"
	counters.text = "Combo %d · %d\nMejor %d · Fallos %d" % [rhythm.combo, rhythm.score, rhythm.best_combo, rhythm.misses]
	if now >= rhythm.duration: finish_rhythm()

func resume_rhythm() -> void:
	build_rhythm_screen(); field.paused = true; field.enabled = false; resume_count = 3.0 * 60 / rhythm.bpm

func finish_rhythm() -> void:
	audio.stop(); var result := rhythm.result()
	if rhythm.track != "tutorial":
		var key := rhythm.record_key(); var previous: Dictionary = store.profile.rhythm.records.get(key, {})
		if previous.is_empty() or result.score > previous.score or result.score == previous.score and result.accuracy > previous.accuracy:
			store.profile.rhythm.records[key] = result
		if not store.save():
			# Retain the pending result and offer a retry of persistence.
			clear("rhythm_save_error"); label_text("Resultado pendiente", 28); label_text(store.message)
			button("Guardar resultado de nuevo", finish_rhythm)
			return
	clear("rhythm_result"); label_text("¡Pista completada!", 30)
	audio.result_sound()
	label_text("Precisión %.2f %%\nPuntuación %d\nMejor combo %d\nFallos %d · Toques vacíos %d" % [result.accuracy, result.score, result.bestCombo, result.misses, result.empty], 22)
	label_text(store.message)
	button("Reintentar", func() -> void: start_rhythm(rhythm.track))
	button("Elegir pista", show_rhythm_menu)
	button("Inicio", show_home)

func start_calibration() -> void:
	calibration = true; samples.clear(); calibration_last_beat = -1
	rhythm = RhythmRules.new("calibration"); rhythm.duration = 16.0; rhythm.notes = []
	audio.start(rhythm); build_rhythm_screen()
	status.text = "Escucha 4 pulsos; luego toca 16 veces al pulso."

func finish_calibration() -> void:
	audio.stop(); clear("calibration_result")
	label_text("Calibración", 28)
	if samples.size() < 12:
		label_text("Faltan muestras válidas: al menos 12 dentro de ±250 ms.")
	else:
		samples.sort(); var middle := int(samples.size() / 2)
		var median: float = (samples[middle - 1] + samples[middle]) / 2 if samples.size() % 2 == 0 else samples[middle]
		var spread: float = samples[int(samples.size() * 0.75)] - samples[int(samples.size() * 0.25)]
		label_text("Offset %+d ms · dispersión %.0f ms\nPositivo corrige una respuesta registrada tarde. Incluye respuesta humana. Recalibra al cambiar salida." % [int(median), spread])
		if spread > 40: label_text("Dispersión alta: conviene repetir.")
		button("Aplicar", func() -> void: settings().offsetMs = clampi(int(round(median / 5) * 5), -250, 250); store.save(); show_rhythm_menu())
	button("Repetir", start_calibration); button("Cancelar", show_rhythm_menu)

func information(title: String, text: String) -> void:
	var dialog := AcceptDialog.new(); overlay = dialog; dialog.title = title; dialog.dialog_text = text
	add_child(dialog); dialog.confirmed.connect(func() -> void: overlay = null; dialog.queue_free())
	dialog.popup_centered(Vector2i(mini(360, int(size.x) - 24), 240))

func show_settings() -> void:
	clear("settings"); label_text("AJUSTES", 28)
	var content := scrolling()
	for key in ["music", "effects"]:
		label_text("Música" if key == "music" else "Efectos", 16, content)
		var slider := HSlider.new(); slider.min_value = 0; slider.max_value = 1; slider.step = 0.05
		slider.value = settings()[key]; slider.custom_minimum_size.y = 48; content.add_child(slider)
		slider.value_changed.connect(func(value: float) -> void: settings()[key] = value; apply_audio(); store.save())
	for key in ["sound", "haptics", "reducedMotion"]:
		var check := CheckButton.new(); check.text = {"sound": "Sonido", "haptics": "Vibración", "reducedMotion": "Movimiento reducido"}[key]
		check.button_pressed = classic().settings[key]; check.custom_minimum_size.y = 48; content.add_child(check)
		check.toggled.connect(func(value: bool) -> void: classic().settings[key] = value; apply_audio(); store.save())
	label_text("Ventanas de precisión", 16, content)
	var windows := OptionButton.new(); windows.add_item("Estándar · 45 / 90 / 140 ms"); windows.add_item("Asistido · 65 / 120 / 180 ms")
	windows.select(1 if settings().windows == "assisted" else 0); windows.custom_minimum_size.y = 48; content.add_child(windows)
	windows.item_selected.connect(func(index: int) -> void: settings().windows = "standard" if index == 0 else "assisted"; store.save())
	var offset_label := label_text("Offset %+d ms · positivo = respuesta tardía" % settings().offsetMs, 16, content)
	var offset := HSlider.new(); offset.min_value = -250; offset.max_value = 250; offset.step = 5; offset.value = settings().offsetMs; offset.custom_minimum_size.y = 48; content.add_child(offset)
	offset.value_changed.connect(func(value: float) -> void: settings().offsetMs = int(value); offset_label.text = "Offset %+d ms" % int(value); store.save())
	button("Restaurar offset cero", func() -> void: offset.value = 0, content)
	button("Calibrar al pulso", start_calibration, content)
	label_text("Importación: selecciona una copia JSON exportada. Nunca se abren preferencias de la app clásica.", 16, content)
	button("Seleccionar copia exportada", choose_import, content)
	button("Previsualizar datos de ejemplo", func() -> void: preview_import_text(FileAccess.get_file_as_string("res://data/classic-profile-example.json")), content)
	label_text("Versión Godot de prueba · Android pendiente de validación. El juego clásico conserva sus datos.", 16, content)
	button("Licencias del motor y fuentes", show_licenses, content)
	label_text(store.message, 16, content)
	button("Inicio", show_home)

func show_licenses() -> void:
	clear("licenses"); label_text("LICENCIAS", 26)
	var content := scrolling()
	label_text("Arte geométrico y música procedural originales de Flecha Trampa. Godot y sus componentes conservan sus licencias. Avisos completos del ejecutable local:", 16, content)
	var text := TextEdit.new(); text.editable = false; text.text = FileAccess.get_file_as_string("res://data/engine-licenses.json")
	text.custom_minimum_size.y = 360; content.add_child(text)
	button("Ajustes", show_settings)

func choose_import() -> void:
	var dialog := FileDialog.new(); overlay = dialog; dialog.file_mode = FileDialog.FILE_MODE_OPEN_FILE; dialog.access = FileDialog.ACCESS_FILESYSTEM
	dialog.use_native_dialog = true; dialog.filters = PackedStringArray(["*.json ; Copia exportada"])
	add_child(dialog)
	dialog.file_selected.connect(func(path: String) -> void:
		overlay = null; dialog.queue_free()
		var file := FileAccess.open(path, FileAccess.READ)
		if file == null or file.get_length() > ProfileStore.MAX_BYTES:
			information("Copia no válida", "No se puede leer o supera 500000 bytes."); return
		preview_import_text(file.get_as_text()))
	dialog.canceled.connect(func() -> void: overlay = null; dialog.queue_free())
	dialog.popup_centered(Vector2i(300, 400))

func preview_import_text(text: String) -> void:
	var summary := store.preview_import(text)
	if store.pending_import.is_empty(): information("No se importó", summary); return
	var dialog := ConfirmationDialog.new(); overlay = dialog; dialog.title = "Revisar importación"; dialog.dialog_text = summary
	dialog.ok_button_text = "Reemplazar perfil Godot"; dialog.cancel_button_text = "Cancelar"; add_child(dialog)
	dialog.canceled.connect(func() -> void: store.pending_import = {}; overlay = null; dialog.queue_free())
	dialog.confirmed.connect(func() -> void:
		overlay = null; dialog.queue_free()
		if store.confirm_import():
			game = null; rhythm = null; power_deals.clear(); power_position = 0; chapter = 0; selected_level = -1; apply_audio(); show_home()
		else: information("Error de guardado", store.message))
	dialog.popup_centered(Vector2i(mini(360, int(size.x) - 24), 350))

func show_collection() -> void:
	clear("collection"); label_text("COLECCIÓN · 32 piezas", 24)
	var c: Dictionary = classic().economy.collection
	label_text("Equipada: %s · Fragmentos %d\nCofres %d · Llaves %d (%d/5)" % [equipped().name, c.shards, c.chests, c.keys, c.keyProgress])
	var content := scrolling()
	button("Abrir cofre · 1 cofre + 1 llave", open_chest, content).disabled = c.chests < 1 or c.keys < 1
	for skin in store.catalog.skins:
		var item := row(content); skin_preview(item, skin, 56)
		var owned: bool = skin.id in c.ownedSkins
		button(skin.name + (" ✓" if skin.id == classic().settings.skin else (" · Ver" if owned else " · Candado")), func() -> void: inspect_skin(skin.id), item)
	button("Fondos y eventos", show_worlds)
	button("Inicio", show_home)

func inspect_skin(id: String) -> void:
	clear("skin"); var skin := PieceArt.design(store.catalog, id)
	label_text(skin.name, 28); var preview := skin_preview(box, skin, 100)
	var content := scrolling()
	button("Probar animación", func() -> void: play_skin_preview(preview), content)
	label_text("%s · %s\n%s\n%s\n%s" % [skin.rarity, skin.finish, skin.description, skin.effect, skin.workshop], 16, content)
	var c: Dictionary = classic().economy.collection
	if id in c.ownedSkins:
		button("Equipar", func() -> void: classic().settings.skin = id; store.save(); inspect_skin(id))
	else:
		button("Desbloquear · %d fragmentos" % skin.cost, func() -> void:
			if c.shards < skin.cost: return
			c.shards -= skin.cost; c.ownedSkins.append(id); store.save(); inspect_skin(id)).disabled = c.shards < skin.cost
	button("Colección", show_collection)

func open_chest() -> void:
	var c: Dictionary = classic().economy.collection
	if c.chests < 1 or c.keys < 1: return
	var roll := randf(); var rarity := "legendary" if roll >= 0.98 else ("epic" if c.sinceEpic >= 9 or roll >= 0.88 else ("rare" if roll >= 0.6 else "common"))
	var pool: Array = store.catalog.skins.filter(func(s: Dictionary) -> bool: return s.rarity == rarity and s.id != "classic")
	var skin: Dictionary = pool[randi_range(0, pool.size() - 1)]
	c.chests -= 1; c.keys -= 1; c.opened += 1; c.sinceEpic = 0 if rarity in ["epic", "legendary"] else c.sinceEpic + 1
	if skin.id in c.ownedSkins: c.shards = mini(99999, c.shards + {"common": 2, "rare": 5, "epic": 12, "legendary": 30}[rarity])
	else: c.ownedSkins.append(skin.id)
	if store.save(): inspect_skin(skin.id)
	else: information("Error de guardado", store.message)

func show_worlds() -> void:
	clear("worlds"); label_text("FONDOS Y EVENTOS", 24)
	label_text("Sellos %d · Equipado %s" % [classic().events.stamps, classic().settings.world])
	var content := scrolling()
	for world in store.catalog.worlds:
		label_text(world.name + " · " + world.description, 16, content)
		if world.id in classic().events.ownedWorlds:
			button("Equipar " + world.name, func() -> void: classic().settings.world = world.id; store.save(); show_worlds(), content)
		else:
			button("Desbloquear · %d sellos" % world.cost, func() -> void:
				if classic().events.stamps < world.cost: return
				classic().events.stamps -= world.cost; classic().events.ownedWorlds.append(world.id); store.save(); show_worlds(), content).disabled = classic().events.stamps < world.cost
	button("Colección", show_collection)

func show_modes() -> void:
	clear("modes"); label_text("OTRAS FORMAS DE JUGAR", 24)
	button("Supervivencia", start_survival)
	button("Diario UTC · 1 carga", start_daily)
	button("Retos compartidos · sin carga", show_shared)
	button("Práctica · sin carga", func() -> void: start_other("shared", "practice:%s:%d" % [classic().runId, classic().level], LevelGenerator.config_for_level(classic().level)))
	button("Inicio", show_home)

func start_other(mode: String, seed_text: String, config: Dictionary, date := "") -> void:
	var before := store.profile.duplicate(true)
	if mode == "daily" and not store.spend_energy(): information("Sin cargas", "Espera una recarga o juega en práctica."); return
	game = CampaignRules.create(1, seed_text, config, mode)
	if game == null: store.profile = before; information("Generador", "No se ha modificado el perfil."); return
	if mode == "daily":
		game.session.energySpent = true; game.session.energyPolicy = "attempt-v2"
	if not date.is_empty(): game.session.date = date
	classic().stats.played += 1
	if persist(): feedback = ""; campaign_combo = 0; show_play()
	else: store.profile = before; game = null; show_home()

func start_daily() -> void:
	var date := Time.get_date_string_from_system(true)
	if classic().dailySave != null and classic().dailySave.get("date") == date and classic().dailySave.state.status == "playing":
		game = CampaignRules.restore(classic().dailySave); show_play(); return
	start_other("daily", "daily:inverse-v1:" + date, {"width": 7, "height": 7, "density": 0.67, "complexity": 0.75}, date)

func start_survival() -> void:
	if store.profile.endlessSave != null and store.profile.endlessSave.state.status == "playing":
		game = CampaignRules.restore(store.profile.endlessSave); show_play(); return
	game = null; start_survival_wave()

func start_survival_wave() -> void:
	var level: int = game.session.level + 1 if game != null and game.session.mode == "endless" else 1
	var elapsed: float = game.session.elapsedMs if game != null and game.session.mode == "endless" else 0.0
	var lives: int = game.session.state.lives if game != null and game.session.mode == "endless" else 3
	var side := 6 if level < 6 else 7
	game = CampaignRules.create(level, "survival:%s:%d" % [classic().runId, level], {"width": side, "height": side, "density": 0.86, "complexity": minf(0.95, 0.6 + level * 0.025), "tuning": "chain-v2"}, "endless")
	if game == null: information("Generador", "No se pudo preparar la reserva."); return
	game.session.elapsedMs = elapsed; game.session.state.lives = lives; game.prepare_survival()
	# Lives and damage belong to the whole run; cleared arrows belong to this board.
	game.session.state.errors = game.session.state.initialLives - lives
	game.session.state.moves = game.session.state.errors
	classic().stats.played += 1
	if not persist(): show_pause(); return
	feedback = "Supervivencia · presión progresiva"; show_play()

func show_shared() -> void:
	clear("shared"); label_text("RETOS COMPARTIDOS", 24)
	label_text("Pega un código FT1, FT2 o FT3. La semilla y el generador viajan en el código.")
	var input := TextEdit.new(); input.custom_minimum_size.y = 140; input.size_flags_vertical = Control.SIZE_EXPAND_FILL; box.add_child(input)
	button("Jugar código", func() -> void:
		var spec := ChallengeCode.decode(input.text.strip_edges())
		if spec.is_empty(): information("Reto inválido", "Código, checksum o versión incompatibles."); return
		start_other("shared", spec.seed, spec.config))
	button("Crear y copiar reto actual", func() -> void:
		var code := ChallengeCode.encode("reto:%s:%d" % [classic().runId, classic().level], LevelGenerator.config_for_level(classic().level))
		input.text = code; DisplayServer.clipboard_set(code))
	button("Modos", show_modes)

func _draw() -> void:
	if store == null: return
	var world: String = classic().settings.world
	var colors := {"void": "0b1423", "christmas": "102f31", "halloween": "25162f", "sakura": "352333", "arcade": "151b3e", "ocean": "082c38", "lanterns": "302619"}
	draw_rect(Rect2(Vector2.ZERO, size), Color(colors.get(world, "0b1423")))
	# Static original ornaments remain quiet behind the controls and board.
	for i in range(12):
		var pos := Vector2(fmod(i * 71.0 + 25, maxf(1, size.x)), fmod(i * 137.0 + 60, maxf(1, size.y)))
		var color := Color(0.7, 0.8, 0.9, 0.035)
		if world == "sakura": draw_circle(pos, 7, Color(1, 0.6, 0.8, 0.07))
		elif world == "lanterns": draw_style_box(PieceArt.tile(Color(1, 0.7, 0.3, 0.06)), Rect2(pos, Vector2(15, 23)))
		elif world == "arcade": draw_line(pos, pos + Vector2(40, 0), color, 2)
		else: draw_circle(pos, 3 if world == "christmas" else 14, color, world == "christmas", 1)

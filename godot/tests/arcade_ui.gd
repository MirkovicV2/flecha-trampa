extends SceneTree

var checks := 0
var failures := 0
var app: Control
var test_slots: Array
var screenshot_dir := ""

func check(condition: bool, description: String) -> void:
	checks += 1
	if not condition: failures += 1; printerr("FAIL: " + description)

func _initialize() -> void:
	call_deferred("run")

func settle() -> void:
	for i in range(4): await process_frame

func touch(target: Control, pos: Vector2, pressed: bool, id := 0) -> void:
	var event := InputEventScreenTouch.new(); event.position = pos; event.pressed = pressed; event.index = id
	target._input(event)

func screenshot(name: String) -> void:
	if screenshot_dir.is_empty() or DisplayServer.get_name() == "headless": return
	await RenderingServer.frame_post_draw
	root.get_texture().get_image().save_png(screenshot_dir.path_join(name + ".png"))

func run() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--screenshots="): screenshot_dir = arg.trim_prefix("--screenshots="); DirAccess.make_dir_recursive_absolute(screenshot_dir)
	var scene: PackedScene = load("res://main.tscn")
	app = scene.instantiate()
	# Change storage before _ready: test never reads normal profile slots.
	var prefix := "user://ui-arcade-%d" % Time.get_ticks_usec()
	test_slots = [prefix + "-a.json", prefix + "-b.json"]
	app.store.slots = test_slots
	root.add_child(app); await settle()
	check(app.page == "home", "Home boots")
	for viewport_size in [Vector2i(320, 568), Vector2i(390, 844), Vector2i(428, 926)]:
		root.size = viewport_size; root.content_scale_size = viewport_size; app.size = viewport_size; app._layout(); await settle()
		check(app.box.position.x >= 0 and app.box.position.y >= 0 and app.box.get_global_rect().end.x <= viewport_size.x + 1, "Safe container width " + str(viewport_size))
		check(app.box.get_global_rect().end.y <= viewport_size.y + 1, "Home fits " + str(viewport_size))
		await screenshot("home-%d" % viewport_size.x)
	app.show_map(true); await settle()
	var map: CampaignMap = app.map_view
	check(map.current == 1 and map.chapter == 0, "Map current chapter")
	var point := map.global_position + map.node_position(0)
	touch(map, point, true); touch(map, point, false); await settle()
	check(app.selected_level == 1 and app.page == "map" and app.game == null, "Map tap opens sheet only")
	app.selected_level = -1; app.update_sheet()
	touch(map, point, true)
	var drag := InputEventScreenDrag.new(); drag.index = 0; drag.position = point + Vector2(0, -20); map._input(drag)
	drag.position = point; map._input(drag); touch(map, point, false)
	check(app.selected_level == -1, "Map out and back drag never selects")
	await screenshot("map")
	app.continue_campaign(); await settle()
	check(app.page == "play" and app.game != null, "Campaign starts")
	for viewport_size in [Vector2i(320, 568), Vector2i(390, 844), Vector2i(428, 926)]:
		root.size = viewport_size; root.content_scale_size = viewport_size; app.size = viewport_size; app._layout(); await settle()
		check(app.box.get_global_rect().end.x <= viewport_size.x + 1 and app.box.get_global_rect().end.y <= viewport_size.y + 1, "Campaign fits " + str(viewport_size))
		check(app.board.tile_side() >= 48, "Campaign cells remain tappable " + str(viewport_size))
		await screenshot("campaign-%d" % viewport_size.x)
	check(app.classic().economy.energy.amount == 4, "New campaign charges once")
	var saved_id: String = app.game.session.id
	var count: int = app.game.board().arrows.size()
	var board: CampaignBoard = app.board
	var arrow: Dictionary = app.game.board().arrows.back()
	var p := board.global_position + board.origin() + (Vector2(arrow.x, arrow.y) + Vector2.ONE * 0.5) * board.tile_side()
	touch(board, p, true); board.started -= 500; touch(board, p, false)
	check(app.game.board().arrows.size() == count and app.game.session.state.errors == 0, "Long press inspection no move")
	touch(board, p, true); touch(board, p, true, 1); touch(board, p, false)
	check(app.game.board().arrows.size() == count, "Second finger cancels campaign")
	app.show_pause(); await settle(); app.show_map(); await settle(); app.continue_campaign(); await settle()
	check(app.game.session.id == saved_id and app.classic().economy.energy.amount == 4, "Pause/map/continue same attempt no cost")
	await screenshot("campaign")
	check(app.box.get_global_rect().end.y <= app.size.y + 1, "Campaign visible without overflow")
	while not app.game.finished():
		var found := false
		for a in app.game.board().arrows.duplicate():
			if app.game.blocker(a).is_empty():
				app.on_cell(int(a.y) * int(app.game.board().width) + int(a.x)); found = true; break
		if not found: check(false, "Campaign solution progress"); break
	await settle()
	check(app.page == "campaign_result" and app.classic().level == 2, "Win advances campaign and result")
	var xp: int = app.classic().economy.pass.xp
	app.finish_campaign(); check(app.classic().economy.pass.xp == xp, "Result reward idempotent")
	await screenshot("campaign-result")
	app.show_map(true); await settle(); check(app.map_view.current == 2, "Win returns current map")
	var reopened := ProfileStore.new(); reopened.slots = test_slots.duplicate(); reopened.load_profile()
	check(reopened.profile.classic.level == 2, "Progress survives fresh store")
	app.classic().economy.collection.ownedSkins.append("chevron"); app.classic().settings.skin = "chevron"; app.store.save()
	app.show_collection(); await settle(); app.inspect_skin("dragon"); await settle()
	check(app.classic().settings.skin == "chevron" and "dragon" not in app.classic().economy.collection.ownedSkins, "Locked preview preserves equipped skin")
	var before: String = JSON.stringify(app.classic())
	app.start_rhythm("fast"); await settle()
	check(app.page == "rhythm_play" and app.field.design.id == "chevron", "Rhythm uses equipped skin")
	await screenshot("rhythm-live")
	var field: RhythmField = app.field
	var first: Dictionary = app.rhythm.notes[0]
	# Deterministic synthetic fixture injects an audible clock, not physical audio proof.
	app.audio.paused = true; app.audio.frozen = first.time
	var hit := field.global_position + Vector2((first.lane + 0.5) * field.size.x / 4, field.size.y - 35)
	touch(field, hit, true); touch(field, hit, true)
	check(app.rhythm.combo == 1, "One note per touch-down/contact")
	touch(field, hit, false)
	app.show_pause(); await settle(); var paused_at: float = app.audio.clock_seconds()
	await create_timer(0.05).timeout
	check(app.audio.clock_seconds() == paused_at, "Paused audible clock frozen")
	app.resume_rhythm(); await settle(); check(app.resume_count > 0 and not app.field.enabled, "Resume countdown disables judgment")
	app.resume_count = 0; app.field.enabled = true; app.field.paused = false
	for note in app.rhythm.notes:
		if not note.judged: app.rhythm.hit(note.lane, note.time)
	app.audio.frozen = first.time; await screenshot("rhythm")
	check(app.box.get_global_rect().end.y <= app.size.y + 1, "Rhythm receptors visible without overflow")
	app.finish_rhythm(); await settle()
	check(app.page == "rhythm_result" and app.rhythm.best_combo > 15, "Rhythm result with combos")
	check(JSON.stringify(app.classic()) == before, "Rhythm leaves campaign byte representation unchanged")
	await screenshot("rhythm-result")
	app.start_rhythm("fast"); await settle(); check(app.rhythm.score == 0 and app.rhythm.combo == 0 and app.rhythm.misses == 0, "Retry metrics reset")
	app.field.reduced = true; app.field.flash(0)
	check(app.field.decorations.is_empty(), "Reduced motion omits skin particles")
	var recovered_combo: int = app.rhythm.combo
	app.field.contacts[7] = true
	touch(app.field, app.field.global_position + Vector2(30, app.field.size.y - 30), true, 7)
	check(app.rhythm.combo == recovered_combo, "Pre-pause contact cannot produce fresh judgment")
	for skin in app.store.catalog.skins:
		app.inspect_skin(skin.id); await settle()
		check(app.classic().settings.skin == "chevron", "Inspecting skin never equips " + skin.id)
	app.game = null
	app.classic().economy.collection.lifeTokens = 1; app.start_campaign(); await settle()
	check(app.game.session.state.lives == 4 and app.classic().economy.collection.lifeTokens == 0, "Classic spends reserve for fourth life")
	var retry_board: String = JSON.stringify(app.game.session.initialBoard)
	var retry_power: String = app.game.session.powerKind
	while not app.game.finished():
		var blocked := false
		for a in app.game.board().arrows:
			if not app.game.blocker(a).is_empty():
				app.on_cell(int(a.y) * int(app.game.board().width) + int(a.x)); blocked = true; break
		if not blocked: break
	app.start_campaign(); await settle()
	check(JSON.stringify(app.game.session.initialBoard) == retry_board and app.game.session.powerKind == retry_power, "Paid retry preserves original board and deal")
	# Persist a terminal victory without result accounting, then recreate the scene.
	while not app.game.finished():
		for a in app.game.board().arrows.duplicate():
			if app.game.blocker(a).is_empty():
				app.game.extract(int(a.y) * int(app.game.board().width) + int(a.x)); break
	app.persist(); app.audio.stop(); app.queue_free(); await settle()
	app = scene.instantiate(); app.store.slots = test_slots; root.add_child(app); await settle()
	check(app.classic().level == 3 and app.classic().classicSave.recorded, "Reopen reconciles terminal reward exactly once")
	app.audio.stop(); app.show_home()
	for viewport_size in [Vector2i(320, 568), Vector2i(390, 844), Vector2i(428, 926)]:
		root.size = viewport_size; root.content_scale_size = viewport_size; app.size = viewport_size
		app.start_rhythm("intro"); await settle()
		check(app.box.get_global_rect().end.y <= viewport_size.y + 1, "Rhythm fits " + str(viewport_size))
		check(app.field.size.x / 4 >= 48, "Four thumb pads >=48")
		app.audio.stop(); app.rhythm = null
	app.queue_free(); await settle()
	for slot in test_slots: DirAccess.remove_absolute(slot)
	print("ARCADE UI: %d checks, %d failures (synthetic desktop input)" % [checks, failures])
	quit(1 if failures > 0 else 0)

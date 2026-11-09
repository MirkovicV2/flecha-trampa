extends SceneTree

# Automated desktop capture in disposable slots; not Android or manual QA.
var app: Control
var slots: Array

func _initialize() -> void:
	call_deferred("run")

func frames(count: int) -> void:
	for i in range(count): await process_frame

func run() -> void:
	root.size = Vector2i(390, 844); root.content_scale_size = root.size
	app = load("res://main.tscn").instantiate()
	var prefix := "user://walkthrough-%d" % Time.get_ticks_usec()
	slots = [prefix + "a.json", prefix + "b.json"]; app.store.slots = slots
	root.add_child(app)
	app.status.text = "Recorrido automático · escritorio\nRitmo acelerado ×3 para esta captura"
	await frames(40)
	app.show_map(true); await frames(40)
	app.selected_level = 1; app.update_sheet(); await frames(40)
	app.continue_campaign(); await frames(40)
	while not app.game.finished():
		for a in app.game.board().arrows.duplicate():
			if app.game.blocker(a).is_empty():
				app.on_cell(int(a.y) * int(app.game.board().width) + int(a.x)); break
		await frames(9)
	await frames(45)
	app.show_map(true); await frames(40)
	app.show_collection(); await frames(35)
	app.inspect_skin("chevron"); await frames(35)
	app.show_rhythm_menu(); await frames(40)
	app.start_rhythm("fast"); app.audio.music.pitch_scale = 3
	while app.page == "rhythm_play":
		var now: float = app.audio.clock_seconds()
		for note in app.rhythm.notes:
			if not note.judged and note.time <= now and now - note.time < 0.14:
				app.on_lane(note.lane)
		await process_frame
	await frames(60)
	app.audio.music.pitch_scale = 1
	app.start_rhythm("fast"); await frames(60)
	app.audio.stop(); app.queue_free(); await frames(4)
	for slot in slots: DirAccess.remove_absolute(slot)
	print("Automated desktop walkthrough complete. Rhythm audio accelerated x3 for capture.")
	quit()

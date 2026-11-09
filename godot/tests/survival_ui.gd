extends SceneTree

var checks := 0
var failures := 0

func check(condition: bool, description: String) -> void:
	checks += 1
	if not condition: failures += 1; printerr("FAIL: " + description)

func _initialize() -> void:
	call_deferred("run")

func settle() -> void:
	for i in range(4): await process_frame

func run() -> void:
	var scene: PackedScene = load("res://main.tscn")
	for remaining_lives in [2, 1]:
		var app: Control = scene.instantiate()
		var prefix := "user://survival-regression-%d-%d" % [Time.get_ticks_usec(), remaining_lives]
		var slots := [prefix + "-a.json", prefix + "-b.json"]
		app.store.slots = slots
		root.add_child(app); app.set_process(false)
		app.start_survival()
		var damaged := false
		var batches := 0
		while not app.game.finished() and batches < 100:
			if not damaged:
				for arrow in app.game.board().arrows:
					if not app.game.blocker(arrow).is_empty():
						for i in range(3 - remaining_lives):
							app.on_cell(int(arrow.y) * int(app.game.board().width) + int(arrow.x))
						damaged = true; break
			for id in LevelGenerator.solve(app.game.board()).order:
				for arrow in app.game.board().arrows.duplicate():
					if arrow.id == id: app.on_cell(int(arrow.y) * int(app.game.board().width) + int(arrow.x))
			if not app.game.finished():
				var elapsed: float = app.game.session.survival.arrivalInMs
				app.game.session.elapsedMs += elapsed
				app.game.tick_survival(elapsed)
			batches += 1
		check(damaged and app.game.session.state.status == "won" and app.game.session.state.lives == remaining_lives, "Win damaged wave with %d lives" % remaining_lives)
		var elapsed: float = app.game.session.elapsedMs
		app.start_survival_wave(); await settle()
		check(app.page == "play" and app.game.session.level == 2, "Next wave opens")
		check(app.game.session.state.lives == remaining_lives and app.game.session.state.errors == 3 - remaining_lives, "Session damage carries to next wave")
		check(app.game.session.state.moves == app.game.session.state.errors, "New board moves include carried damage only")
		check(app.game.session.elapsedMs == elapsed and app.game.session.survival.arrivalInMs == CampaignRules.arrival_interval(elapsed), "Active pressure does not reset")
		check(CampaignRules.restore(app.game.session) != null and app.store.valid_profile(app.store.profile), "New wave satisfies strict validation")
		check(app.persist(), "New wave persists")
		var saved: Dictionary = JSON.parse_string(JSON.stringify(app.game.session))
		app.show_pause(); app.show_map(); await settle()
		check(app.page == "map", "Damaged second wave can return to map")
		app.queue_free(); await settle()
		app = scene.instantiate(); app.store.slots = slots; root.add_child(app); app.set_process(false)
		app.start_survival(); await settle()
		check(app.page == "play" and app.game.session.recursive_equal(saved, 0), "Reopen restores exact second wave")
		app.show_pause(); app._process(10.0)
		check(app.game.session.recursive_equal(saved, 0), "Pause does not advance survival pressure")
		app.queue_free(); await settle()
		for slot in slots: DirAccess.remove_absolute(slot)
	var app: Control = scene.instantiate()
	var missing := "user://missing-survival-%d" % Time.get_ticks_usec()
	app.store.slots = [missing + "/a.json", missing + "/b.json"]
	root.add_child(app); app.set_process(false)
	app.start_survival(); await settle()
	check(app.page == "pause" and not app.store.message.is_empty(), "Write failure keeps wave paused with visible save error")
	check(app.game != null and CampaignRules.restore(app.game.session) != null, "Write failure retains a valid wave for retry")
	app.queue_free(); await settle()
	print("SURVIVAL UI: %d checks, %d failures (synthetic desktop input)" % [checks, failures])
	quit(1 if failures > 0 else 0)

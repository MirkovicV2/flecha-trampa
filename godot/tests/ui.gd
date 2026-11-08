extends SceneTree

var checks := 0
var failures := 0

func expect(value: bool, description: String) -> void:
	checks += 1
	if not value:
		failures += 1
		push_error(description)

func _initialize() -> void:
	call_deferred("run")

func settle() -> void:
	for frame in range(4):
		await process_frame

func run() -> void:
	var directory := "user://hybrid-ui-%d" % OS.get_process_id()
	DirAccess.make_dir_absolute(directory)
	var scene = load("res://main.tscn").instantiate()
	scene.store.slots = [directory + "/a.json", directory + "/b.json"]
	root.add_child(scene)
	await settle()
	expect(scene.page == "home", "Scene starts at menu")
	scene.start_or_continue()
	await settle()
	expect(scene.page == "play" and scene.game.remaining() == 25, "Menu starts fixed board")
	for viewport in [Vector2i(320, 568), Vector2i(390, 844), Vector2i(428, 926)]:
		root.size = viewport
		scene.size = Vector2(viewport)
		await settle()
		expect(scene.box.get_global_rect().end.y <= viewport.y - 15, "Layout fits safe bottom at %s: %s" % [viewport, scene.box.get_global_rect()])
		expect(scene.box.get_global_rect().end.x <= viewport.x - 11, "Layout fits right edge at %s" % viewport)
		expect(scene.board.size.x >= 250 and scene.board.size.x == scene.board.size.y, "Square board with 50px cells at %s" % viewport)
	scene.set_mode("swap")
	scene.on_cell(1)
	scene.on_cell(6)
	expect(scene.game.remaining() == 22 and scene.game.lives == 3, "UI match removes three with no life cost")
	var saved := DemoSaveStore.new()
	saved.slots = scene.store.slots
	var restored := saved.load_game()
	expect(restored != null and restored.gems == scene.game.gems, "UI persists accepted action")
	scene.go_back()
	expect(scene.page == "pause", "Back pauses")
	scene.show_help()
	scene.go_back()
	expect(scene.page == "pause" and scene.overlay == null, "Back closes help into pause")
	scene.show_play()
	scene._notification(MainLoop.NOTIFICATION_APPLICATION_PAUSED)
	expect(scene.page == "pause", "Background pauses without auto resume")
	scene.confirm_restart()
	scene.overlay.confirmed.emit()
	expect(scene.game.remaining() == 25 and scene.game.lives == 3, "Confirmed retry restores exact initial board")
	scene.set_mode("take")
	for hit in range(3):
		scene.on_cell(6)
	expect(scene.page == "result" and scene.game.lives == 0, "UI defeat after exactly three blocked actions")
	scene.confirm_restart()
	scene.overlay.confirmed.emit()
	while not scene.game.finished():
		for cell in range(25):
			if scene.game.occupied(cell) and scene.game.blocker(cell) < 0:
				scene.on_cell(cell)
				break
	expect(scene.page == "result" and scene.game.remaining() == 0, "UI extraction-only victory")
	validate_touch()
	scene.queue_free()
	await settle()
	for name in ["a.json", "b.json"]:
		DirAccess.remove_absolute(directory + "/" + name)
	DirAccess.remove_absolute(directory)
	print("Demo UI: %d checks, %d failures" % [checks, failures])
	quit(1 if failures > 0 else 0)

func touch(board: DemoBoard, index: int, pressed: bool, position: Vector2) -> void:
	var event := InputEventScreenTouch.new()
	event.index = index
	event.pressed = pressed
	event.position = position
	board._input(event)

func validate_touch() -> void:
	var board := DemoBoard.new()
	board.game = DemoRules.new()
	board.size = Vector2(250, 250)
	root.add_child(board)
	var signals := [0, 0]
	board.tapped.connect(func(_cell: int) -> void: signals[0] += 1)
	board.inspected.connect(func(_cell: int) -> void: signals[1] += 1)
	var point := Vector2(25, 25)
	touch(board, 0, true, point)
	touch(board, 0, false, point)
	expect(signals == [1, 0], "Touch release emits exactly one tap")
	touch(board, 0, true, point)
	board.started = Time.get_ticks_msec() - 500
	touch(board, 0, false, point)
	expect(signals == [1, 1], "Long release inspects without extraction even before process tick")
	touch(board, 0, true, point)
	touch(board, 1, true, Vector2(75, 25))
	touch(board, 0, false, point)
	touch(board, 1, false, Vector2(75, 25))
	expect(signals == [1, 1], "Second finger cancels gesture")
	touch(board, 0, true, point)
	var drag := InputEventScreenDrag.new()
	drag.index = 0
	drag.position = Vector2(40, 25)
	board._input(drag)
	touch(board, 0, false, point)
	expect(signals == [1, 1], "Drag beyond threshold cancels tap")
	touch(board, 0, true, point)
	board.cancel_gesture()
	touch(board, 0, false, point)
	expect(signals == [1, 1], "Pause cancellation suppresses pending release")
	board.queue_free()

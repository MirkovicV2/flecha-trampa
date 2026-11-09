extends SceneTree

var checks := 0
var failures := 0
var canvas: Control
var catalog: Dictionary
var draw_exits := false
var elapsed := 0.1
var output := ""

func check(condition: bool, message: String) -> void:
	checks += 1
	if not condition: failures += 1; printerr("FAIL: " + message)

func _initialize() -> void:
	call_deferred("run")

func settle() -> void:
	for i in range(4): await process_frame

func draw_atlas() -> void:
	canvas.draw_rect(Rect2(0, 0, 1280, 608), Color("142536"))
	for i in range(catalog.skins.size()):
		var skin: Dictionary = catalog.skins[i]
		var base := Vector2((i % 8) * 160, int(i / 8) * 152)
		var center := base + Vector2(80, 55)
		if draw_exits: PieceArt.draw_exit(canvas, skin, center, 64, Vector2.UP, elapsed / 0.55)
		else: PieceArt.draw_piece(canvas, skin, center, 110)
		canvas.draw_string(ThemeDB.fallback_font, base + Vector2(12, 132), skin.id, HORIZONTAL_ALIGNMENT_LEFT, 150, 16, Color.WHITE)

func capture(name: String) -> void:
	canvas.queue_redraw(); await settle()
	if not output.is_empty() and DisplayServer.get_name() != "headless":
		await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png(output.path_join(name + ".png"))

func find_preview(node: Node) -> Control:
	if node.has_meta("motion_age"): return node
	for child in node.get_children():
		var result := find_preview(child)
		if result != null: return result
	return null

func run() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--screenshots="): output = arg.trim_prefix("--screenshots="); DirAccess.make_dir_recursive_absolute(output)
	catalog = JSON.parse_string(FileAccess.get_file_as_string("res://data/catalog.json"))
	root.size = Vector2i(1280, 608); root.content_scale_size = root.size
	canvas = Control.new(); canvas.size = root.size; root.add_child(canvas); canvas.draw.connect(draw_atlas)
	await capture("godot-32")
	draw_exits = true
	for time in [0.0, 0.1, 0.25, 0.5]:
		elapsed = time; await capture("exits-%03dms" % int(time * 1000))
	canvas.queue_free(); await settle()
	var app = load("res://main.tscn").instantiate()
	var prefix := "user://art-ui-%d" % Time.get_ticks_usec()
	var slots := [prefix + "-a.json", prefix + "-b.json"]
	app.store.slots = slots
	root.size = Vector2i(320, 568); root.content_scale_size = root.size
	root.add_child(app); await settle()
	var original := JSON.stringify(app.classic())
	for skin in catalog.skins:
		app.inspect_skin(skin.id); await settle()
		var preview := find_preview(app)
		check(preview != null, skin.id + " inspector preview")
		app.play_skin_preview(preview); await settle()
		check(preview.get_meta("motion_age") >= 0, skin.id + " motion runs")
		var old: Tween = preview.get_meta("motion_tween")
		app.play_skin_preview(preview)
		check(not old.is_valid(), skin.id + " old preview canceled")
		check(JSON.stringify(app.classic()) == original, skin.id + " no ownership/equipment/progress mutation")
	app.classic().settings.reducedMotion = true
	app.inspect_skin("petal"); await settle()
	var preview := find_preview(app); app.play_skin_preview(preview)
	await create_timer(0.65).timeout
	check(preview.get_meta("motion_age") == -1.0, "Reduced preview returns to static glyph")
	app.play_skin_preview(preview); app.show_home(); await settle()
	check(app.page == "home", "Navigating clears animated preview safely")
	app.audio.stop(); app.queue_free(); await settle()
	for slot in slots: DirAccess.remove_absolute(slot)
	print("ART UI: %d checks, %d failures (synthetic desktop, 32 skins rendered)" % [checks, failures])
	quit(1 if failures else 0)

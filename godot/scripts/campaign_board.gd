class_name CampaignBoard
extends Control

signal tapped(cell: int)
signal inspected(cell: int)
var game: CampaignRules
var design: Dictionary
var color_theme := "aurora"
var enabled := true
var obstacle := -1
var route := -1
var keyboard_cell := 0
var finger := -2
var start := Vector2.ZERO
var previous := Vector2.ZERO
var offset := Vector2.ZERO
var started := 0
var held := false
var cancelled := false
var dragging := false
var reduced := false
var trails: Array = []

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP; focus_mode = Control.FOCUS_ALL
	clip_contents = true

func tile_side() -> float:
	return maxf(48, minf(size.x / game.board().width, size.y / game.board().height))

func origin() -> Vector2:
	return Vector2(maxf(0, (size.x - game.board().width * tile_side()) / 2), maxf(0, (size.y - game.board().height * tile_side()) / 2)) + offset

func cell_at(global: Vector2) -> int:
	var local := global - global_position
	if not Rect2(Vector2.ZERO, size).has_point(local): return -1
	local -= origin()
	if local.x < 0 or local.y < 0 or local.x >= game.board().width * tile_side() or local.y >= game.board().height * tile_side(): return -1
	return int(local.y / tile_side()) * int(game.board().width) + int(local.x / tile_side())

func cancel_gesture() -> void:
	finger = -2; held = false; cancelled = true; dragging = false

func _process(_delta: float) -> void:
	if not enabled: return
	if finger != -2 and not cancelled and not held and Time.get_ticks_msec() - started >= 420:
		held = true; inspected.emit(cell_at(start))
	if not trails.is_empty():
		trails = trails.filter(func(t: Dictionary) -> bool: return Time.get_ticks_msec() - t.time < 550)
		queue_redraw()

func animate_exit(arrow: Dictionary) -> void:
	if not reduced:
		trails.append({"arrow": arrow.duplicate(), "time": Time.get_ticks_msec()})
		if trails.size() > 12: trails.pop_front()
	queue_redraw()

func _gui_input(event: InputEvent) -> void:
	if not enabled: return
	if event is InputEventKey and event.pressed and not event.echo:
		var w: int = game.board().width
		match event.keycode:
			KEY_LEFT: keyboard_cell = maxi(0, keyboard_cell - 1)
			KEY_RIGHT: keyboard_cell = mini(w * int(game.board().height) - 1, keyboard_cell + 1)
			KEY_UP: keyboard_cell = maxi(0, keyboard_cell - w)
			KEY_DOWN: keyboard_cell = mini(w * int(game.board().height) - 1, keyboard_cell + w)
			KEY_ENTER, KEY_SPACE: tapped.emit(keyboard_cell)
		var target := origin() + (Vector2(keyboard_cell % w, int(keyboard_cell / w)) + Vector2.ONE * 0.5) * tile_side()
		if target.x < 24: offset.x += 24 - target.x
		elif target.x > size.x - 24: offset.x -= target.x - size.x + 24
		if target.y < 24: offset.y += 24 - target.y
		elif target.y > size.y - 24: offset.y -= target.y - size.y + 24
		queue_redraw(); accept_event()

func _input(event: InputEvent) -> void:
	if not enabled: return
	var pos := Vector2.ZERO; var pointer := -1; var down := false; var up := false; var motion := false
	if event is InputEventScreenTouch:
		pos = event.position; pointer = event.index; down = event.pressed; up = not down
		if event.canceled: cancel_gesture(); return
	elif event is InputEventScreenDrag:
		pos = event.position; pointer = event.index; motion = true
	elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.device == InputEvent.DEVICE_ID_EMULATION: return
		pos = event.position; down = event.pressed; up = not down
	elif event is InputEventMouseMotion:
		pos = event.position; motion = true
	else: return
	if down:
		if finger != -2: cancelled = true; return
		if not get_global_rect().has_point(pos): return
		finger = pointer; start = pos; previous = pos; started = Time.get_ticks_msec(); held = false; cancelled = false; dragging = false
		grab_focus()
	elif pointer == finger:
		if motion:
			if pos.distance_to(start) > 12: cancelled = true; dragging = true
			if dragging:
				offset += pos - previous
				offset.x = clampf(offset.x, minf(0, size.x - game.board().width * tile_side()), 0)
				offset.y = clampf(offset.y, minf(0, size.y - game.board().height * tile_side()), 0)
				queue_redraw()
			previous = pos
		if up:
			var cell := cell_at(pos)
			var inspect := not held and not cancelled and Time.get_ticks_msec() - started >= 420
			var tap := not held and not cancelled and cell >= 0 and cell == cell_at(start)
			cancel_gesture()
			if inspect: inspected.emit(cell)
			elif tap: tapped.emit(cell)

func _draw() -> void:
	if game == null: return
	var side := tile_side(); var base := origin(); var w: int = game.board().width
	for y in range(int(game.board().height)):
		for x in range(w):
			if not LevelGenerator.contains(game.session.config, x, y): continue
			var cell := y * w + x
			var rect := Rect2(base + Vector2(x, y) * side + Vector2(2, 2), Vector2.ONE * (side - 4))
			draw_style_box(PieceArt.tile(Color("142536"), 8), rect)
			if cell in [route, obstacle] or has_focus() and cell == keyboard_cell:
				draw_rect(rect, Color("ff8476") if cell == obstacle else Color("ffe8a3"), false, 2)
			var arrow := game.arrow_at(cell)
			if arrow.is_empty(): continue
			PieceArt.draw_piece(self, design, rect.get_center(), side * 0.78, arrow.direction, 1.0, color_theme)
			if arrow.id == game.session.get("powerArrowId", "") and not game.session.get("powerSpent", false):
				var power: String = game.session.get("powerKind", "pulse")
				var color := Color({"pulse": "ffda87", "ray": "9cddff", "nova": "e0b4ff"}.get(power, "ffda87"))
				draw_circle(rect.position + Vector2(10, 10), 9, Color("0b1626"))
				draw_string(ThemeDB.fallback_font, rect.position + Vector2(3, 16), {"pulse": "✦", "ray": "↔", "nova": "✳"}.get(power, "✦"), HORIZONTAL_ALIGNMENT_LEFT, -1, 16, color)
	for trail in trails:
		var age := float(Time.get_ticks_msec() - trail.time) / 550
		var a: Dictionary = trail.arrow
		var dir := Vector2(LevelGenerator.VECTORS[LevelGenerator.DIRECTIONS.find(a.direction)])
		var center := base + (Vector2(a.x, a.y) + Vector2.ONE * 0.5) * side
		PieceArt.draw_exit(self, design, center, side, dir, age, color_theme)
		PieceArt.draw_piece(self, design, center + dir * age * side * 2, side * 0.7, a.direction, 1 - age, color_theme)

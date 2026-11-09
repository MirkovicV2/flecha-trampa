class_name CampaignMap
extends Control

signal selected(level: int)
var chapter := 0
var current := 1
var offset := 0.0
var finger := -2
var start := Vector2.ZERO
var previous := Vector2.ZERO
var dragged := false
var focus_level := -1

func _ready() -> void:
	clip_contents = true; mouse_filter = Control.MOUSE_FILTER_STOP; focus_mode = Control.FOCUS_ALL

func node_position(index: int) -> Vector2:
	return Vector2(size.x * (0.5 + 0.3 * sin(index * PI / 2)), 60 + (9 - index) * 86 + offset)

func center_current() -> void:
	var index := clampi(current - chapter * 10 - 1, 0, 9)
	offset = clampf(size.y / 2 - (60 + (9 - index) * 86), minf(0, size.y - 900), 0)
	queue_redraw()

func _gui_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode in [KEY_UP, KEY_RIGHT]: focus_level = clampi(focus_level + 1, 0, 9)
		elif event.keycode in [KEY_DOWN, KEY_LEFT]: focus_level = clampi(focus_level - 1, 0, 9)
		elif event.keycode == KEY_HOME: focus_level = 0
		elif event.keycode == KEY_END: focus_level = 9
		elif event.keycode in [KEY_ENTER, KEY_SPACE]: selected.emit(chapter * 10 + maxi(0, focus_level) + 1)
		if focus_level >= 0:
			var y := node_position(focus_level).y
			if y < 35: offset += 35 - y
			elif y > size.y - 50: offset -= y - size.y + 50
			offset = clampf(offset, minf(0, size.y - 900), 0)
		queue_redraw(); accept_event()

func _input(event: InputEvent) -> void:
	var pos := Vector2.ZERO; var id := -1; var down := false; var up := false; var motion := false
	if event is InputEventScreenTouch:
		pos = event.position; id = event.index; down = event.pressed; up = not down
		if event.canceled: finger = -2; return
	elif event is InputEventScreenDrag: pos = event.position; id = event.index; motion = true
	elif event is InputEventMouseButton:
		if event.device == InputEvent.DEVICE_ID_EMULATION: return
		if event.button_index in [MOUSE_BUTTON_WHEEL_UP, MOUSE_BUTTON_WHEEL_DOWN] and get_global_rect().has_point(event.position):
			offset = clampf(offset + (55 if event.button_index == MOUSE_BUTTON_WHEEL_UP else -55), minf(0, size.y - 900), 0); queue_redraw(); return
		if event.button_index != MOUSE_BUTTON_LEFT: return
		pos = event.position; down = event.pressed; up = not down
	elif event is InputEventMouseMotion: pos = event.position; motion = true
	else: return
	if down:
		if finger != -2: dragged = true; return
		if not get_global_rect().has_point(pos): return
		finger = id; start = pos; previous = pos; dragged = false; grab_focus()
	elif id == finger:
		if motion:
			if pos.distance_to(start) > 8: dragged = true
			if dragged: offset = clampf(offset + pos.y - previous.y, minf(0, size.y - 900), 0); queue_redraw()
			previous = pos
		if up:
			finger = -2
			if dragged or not get_global_rect().has_point(pos): return
			for i in range(10):
				if (pos - global_position).distance_to(node_position(i)) <= 28:
					focus_level = i; selected.emit(chapter * 10 + i + 1); break

func _draw() -> void:
	var path := PackedVector2Array()
	for i in range(10): path.append(node_position(i))
	draw_polyline(path, Color("3d5767"), 5, true)
	var font := ThemeDB.fallback_font
	for i in range(10):
		var level := chapter * 10 + i + 1; var pos := node_position(i)
		var color := Color("d6ff89") if level == current else (Color("73d7c7") if level < current else Color("3c4d60"))
		draw_circle(pos, 25, color)
		if level == current or i == focus_level: draw_arc(pos, 30, 0, TAU, 40, Color.WHITE, 2, true)
		draw_string(font, pos + Vector2(-12, 6), str(level), HORIZONTAL_ALIGNMENT_LEFT, -1, 20, Color("0b1626") if level <= current else Color.WHITE)
		var text := "Estás aquí" if level == current else ("Completado ✓" if level < current else "Candado")
		draw_string(font, pos + Vector2(-47, 46), text, HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color("c1d2df"))

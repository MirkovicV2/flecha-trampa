class_name RhythmField
extends Control

signal lane_pressed(lane: int)
var rules: RhythmRules
var audio: ArcadeAudio
var design: Dictionary
var color_theme := "aurora"
var enabled := true
var reduced := false
var paused := false
var contacts: Dictionary = {}
var held_keys: Dictionary = {}
var flashes := [0.0, 0.0, 0.0, 0.0]
var decorations: Array = []
var labels := ["←", "↓", "↑", "→"]
var countdown := ""

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP; clip_contents = true
	# A replacement field must not turn a pre-pause held key into a fresh press.
	for key in [KEY_LEFT, KEY_DOWN, KEY_UP, KEY_RIGHT, KEY_D, KEY_F, KEY_J, KEY_K]:
		if Input.is_key_pressed(key): held_keys[key] = true
	if Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT): contacts[-1] = true

func _process(delta: float) -> void:
	if not paused:
		for i in range(4): flashes[i] = maxf(0, flashes[i] - delta)
		for item in decorations: item.age += delta
		decorations = decorations.filter(func(item: Dictionary) -> bool: return item.age < 0.55)
	queue_redraw()

func cancel_contacts() -> void:
	contacts.clear(); held_keys.clear(); decorations.clear(); flashes.fill(0.0)

func flash(lane: int) -> void:
	flashes[lane] = 0.12
	if not reduced:
		decorations.append({"lane": lane, "age": 0.0})
		if decorations.size() > 12: decorations.pop_front()

func _input(event: InputEvent) -> void:
	if event is InputEventKey:
		var keys := [KEY_LEFT, KEY_DOWN, KEY_UP, KEY_RIGHT, KEY_D, KEY_F, KEY_J, KEY_K]
		var index := keys.find(event.keycode)
		if index < 0: return
		if not event.pressed: held_keys.erase(event.keycode); return
		if event.echo or held_keys.has(event.keycode): return
		held_keys[event.keycode] = true
		if enabled and not paused: lane_pressed.emit(index % 4)
		get_viewport().set_input_as_handled()
		return
	var pos := Vector2.ZERO; var id := -1; var down := false; var up := false
	if event is InputEventScreenTouch:
		pos = event.position; id = event.index; down = event.pressed; up = not down
		if event.canceled: contacts.erase(id); return
	elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.device == InputEvent.DEVICE_ID_EMULATION: return
		pos = event.position; down = event.pressed; up = not down
	else: return
	if up: contacts.erase(id); return
	if down and not contacts.has(id):
		contacts[id] = true
		var local := pos - global_position
		if enabled and not paused and Rect2(0, size.y - 78, size.x, 78).has_point(local):
			lane_pressed.emit(clampi(int(local.x / (size.x / 4)), 0, 3))
			get_viewport().set_input_as_handled()

func _draw() -> void:
	if rules == null or audio == null: return
	var now := audio.clock_seconds()
	var w := size.x / 4
	var receiver := size.y - 92
	var font := ThemeDB.fallback_font
	for lane in range(4):
		var intensity := 0
		for threshold in RhythmRules.THRESHOLDS:
			if rules.combo >= threshold: intensity += 1
		var pulse := 0.0 if reduced or paused else (sin(now * rules.bpm / 60 * TAU) + 1) * (0.012 + intensity * 0.004)
		draw_rect(Rect2(lane * w + 2, 0, w - 4, size.y - 80), Color(0.055 + pulse, 0.11 + pulse, 0.17 + pulse))
		if flashes[lane] > 0: draw_rect(Rect2(lane * w + 2, receiver - 22, w - 4, 44), Color(0.65, 0.9, 0.7, 0.4), false, 3)
		draw_line(Vector2(lane * w + 5, receiver), Vector2((lane + 1) * w - 5, receiver), Color("ffe8a3"), 3)
		draw_style_box(PieceArt.tile(Color("274359")), Rect2(lane * w + 3, size.y - 74, w - 6, 68))
		draw_string(font, Vector2(lane * w + w / 2 - 12, size.y - 32), labels[lane], HORIZONTAL_ALIGNMENT_LEFT, -1, 28, Color.WHITE)
	for note in rules.notes:
		if note.judged: continue
		var y: float = receiver - (note.time - now) * maxf(100, receiver / 1.65)
		if y < -50 or y > receiver + 30: continue
		PieceArt.draw_piece(self, design, Vector2((note.lane + 0.5) * w, y), minf(w - 14, 46), ["left", "down", "up", "right"][note.lane], 1.0, color_theme)
	for item in decorations:
		var factor: float = item.age / 0.55
		var direction := Vector2(LevelGenerator.VECTORS[LevelGenerator.DIRECTIONS.find(["left", "down", "up", "right"][item.lane])])
		PieceArt.draw_exit(self, design, Vector2((item.lane + 0.5) * w, receiver), minf(38, w - 16), direction, factor, color_theme)
	if not countdown.is_empty():
		draw_string(font, Vector2(size.x / 2 - 18, size.y / 2), countdown, HORIZONTAL_ALIGNMENT_LEFT, -1, 42, Color("ffe8a3"))

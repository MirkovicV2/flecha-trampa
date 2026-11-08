class_name DemoBoard
extends Control

signal tapped(cell: int)
signal inspected(cell: int)
var game: DemoRules
var selected := -1
var obstacle := -1
var route := -1
var enabled := true
var finger := -2
var start := Vector2.ZERO
var started := 0
var held := false
var cancelled := false
const COLORS := [Color("f0b857"), Color("66d9c0"), Color("c2a0f7")]

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	set_process(false)

func cancel_gesture() -> void:
	finger = -2
	held = false
	cancelled = true
	set_process(false)

func _process(_delta: float) -> void:
	if finger != -2 and not cancelled and not held and Time.get_ticks_msec() - started >= 420:
		held = true
		inspected.emit(cell_at(start))
		set_process(false)

func cell_at(global: Vector2) -> int:
	var local := global - global_position
	if local.x < 0 or local.y < 0 or local.x >= size.x or local.y >= size.y:
		return -1
	return int(local.y / (size.y / 5)) * 5 + int(local.x / (size.x / 5))

func _input(event: InputEvent) -> void:
	if not enabled:
		return
	var position := Vector2.ZERO
	var pointer := -1
	var down := false
	var up := false
	var motion := false
	if event is InputEventScreenTouch:
		position = event.position
		pointer = event.index
		down = event.pressed
		up = not event.pressed
		if event.canceled:
			cancel_gesture()
			return
	elif event is InputEventScreenDrag:
		position = event.position
		pointer = event.index
		motion = true
	elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		position = event.position
		down = event.pressed
		up = not event.pressed
	elif event is InputEventMouseMotion:
		position = event.position
		motion = true
	else:
		return
	if down:
		if finger != -2:
			cancelled = true
			return
		if cell_at(position) < 0:
			return
		finger = pointer
		start = position
		started = Time.get_ticks_msec()
		held = false
		cancelled = false
		set_process(true)
	elif pointer == finger:
		if motion and position.distance_to(start) > 12.0:
			cancelled = true
			set_process(false)
		if up:
			var cell := cell_at(position)
			var should_tap := not held and not cancelled and cell == cell_at(start)
			# A slow frame must still suppress the release after a long press.
			var should_inspect := not held and not cancelled and Time.get_ticks_msec() - started >= 420
			cancel_gesture()
			if should_inspect:
				inspected.emit(cell)
			elif should_tap:
				tapped.emit(cell)

func _draw() -> void:
	if game == null:
		return
	var side := size.x / 5.0
	for i in range(25):
		var rect := Rect2(Vector2(i % 5, i / 5 as int) * side + Vector2(3, 3), Vector2.ONE * (side - 6))
		draw_style_box(_tile(Color("172733")), rect)
		if not game.occupied(i):
			continue
		if i == selected or i == obstacle or i == route:
			draw_rect(rect.grow(1), Color("ff756d") if i == obstacle else Color.WHITE, false, 3)
		var center := rect.get_center()
		var color: Color = COLORS[game.gems[i]]
		var gem_center := center + Vector2(-side * 0.21, side * 0.23)
		var radius := side * 0.1
		match game.gems[i]:
			0:
				draw_circle(gem_center, radius, color)
			1:
				draw_rect(Rect2(gem_center - Vector2.ONE * radius, Vector2.ONE * radius * 2), color)
			2:
				draw_colored_polygon(PackedVector2Array([gem_center + Vector2(0, -radius), gem_center + Vector2(radius, radius), gem_center + Vector2(-radius, radius)]), color)
		var direction := Vector2(DemoRules.STEPS[game.directions[i]])
		var normal := Vector2(-direction.y, direction.x)
		var head := center + direction * side * 0.25
		draw_line(center - direction * side * 0.24, head, Color.WHITE, 3, true)
		draw_line(head, head - direction * side * 0.16 + normal * side * 0.14, Color.WHITE, 3, true)
		draw_line(head, head - direction * side * 0.16 - normal * side * 0.14, Color.WHITE, 3, true)
	if game.occupied(route):
		var p := Vector2i(route % 5, route / 5 as int)
		var origin := (Vector2(p) + Vector2.ONE * 0.5) * side
		p += DemoRules.STEPS[game.directions[route]]
		while p.x >= 0 and p.x < 5 and p.y >= 0 and p.y < 5:
			var target := (Vector2(p) + Vector2.ONE * 0.5) * side
			draw_line(origin, target, Color("f0b857"), 2, true)
			if game.occupied(p.y * 5 + p.x):
				break
			p += DemoRules.STEPS[game.directions[route]]

func _tile(color: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.set_corner_radius_all(8)
	return style

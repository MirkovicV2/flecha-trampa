class_name PieceArt
extends RefCounted

# Fixed material inks and directional palettes from the classic catalog.
const MATERIAL_INKS := {"edge": 0xffffff, "shade": 0x182432, "accent": 0xffd58b}
const PALETTES := {
	"aurora": [0xd6ff89, 0xb9a5ff, 0xffa18b, 0x87dce8],
	"ember": [0xffd581, 0xffa18b, 0xeea7df, 0xa8d5ba],
	"arctic": [0xa5edff, 0xbdb5ff, 0xffbad2, 0xd4f9e5],
	"neon": [0xd5ff52, 0xff8cde, 0xffbf66, 0x67f6ed],
	"midnight": [0xd7cbff, 0x89c7ff, 0xffa8d8, 0x82e8cf],
	"solar": [0xffdf7f, 0xffb38b, 0xf4b4e9, 0xbcf0b1],
}

static func palette_color(direction: String, theme := "aurora") -> int:
	return PALETTES.get(theme, PALETTES.aurora)[LevelGenerator.DIRECTIONS.find(direction)]

static func inks(design_value: Dictionary, direction := "up", theme := "aurora") -> Dictionary:
	var palette := palette_color(direction, theme)
	return {"body": design_value.get("baseColor", palette), "edge": MATERIAL_INKS.edge, "shade": MATERIAL_INKS.shade, "accent": palette if design_value.get("paletteAccent", false) else MATERIAL_INKS.accent}

static func draw_piece(canvas: CanvasItem, design_value: Dictionary, center: Vector2, side: float, direction := "up", alpha := 1.0, theme := "aurora") -> void:
	var angle := LevelGenerator.DIRECTIONS.find(direction) * PI / 2
	var colors := inks(design_value, direction, theme)
	for layer in design_value.layers:
		var points := PackedVector2Array()
		for point in layer.points:
			points.append(center + ((Vector2(point[0], point[1]) - Vector2(50, 50)) * side / 100).rotated(angle))
		var color := Color.hex(int(colors[layer.get("fill", layer.get("stroke", "body"))]) * 256 + 255)
		color.a = layer.get("opacity", 1.0) * alpha
		if layer.has("fill") and points.size() >= 3: canvas.draw_colored_polygon(points, color)
		if layer.has("stroke") and points.size() >= 2: canvas.draw_polyline(points, color, maxf(0.01, layer.get("width", 1.0) * side / 100), true)

static func design(catalog: Dictionary, id: String) -> Dictionary:
	for skin in catalog.skins:
		if skin.id == id: return skin
	return catalog.skins[0]

static func tile(color: Color, radius := 12) -> StyleBoxFlat:
	var style := StyleBoxFlat.new(); style.bg_color = color; style.set_corner_radius_all(radius)
	return style

# Exact primitive parameters from BoardScene.cosmeticExit. Keep descriptors pure
# for comparison against execution of the original method, independent of rules.
static func primitive(kind: String, color: int, alpha: float, duration: float, target: Dictionary, x := 0.0, y := 0.0, width := 0.0, height := 0.0, rotation := 0.0) -> Dictionary:
	return {"kind": kind, "color": color, "alpha": alpha, "duration": duration, "target": target, "x": x, "y": y, "width": width, "height": height, "rotation": rotation, "scaleX": 1.0, "scaleY": 1.0, "strokeWidth": 0.0, "points": []}

static func exit_spec(design_value: Dictionary, side: float, direction: Vector2, color: int) -> Array:
	var style: String = design_value.exit
	var angle := direction.angle(); var dx := direction.x; var dy := direction.y
	var items: Array = []
	if style == "frost":
		for i in range(6):
			var theta := angle + i * PI / 3
			var item := primitive("triangle", 0xc7f1ff, 0.85, 360, {"x": cos(theta) * side * 0.8, "y": sin(theta) * side * 0.8, "scaleX": 1.8}, 0, 0, 0, 0, theta)
			item.points = [[0, -2], [side * 0.38, 0], [0, 2]]; items.append(item)
	elif style in ["flame", "meteor"]:
		for i in range(6):
			var offset := (-1 if i % 2 else 1) * (0.15 + i * 0.05) * side
			var x := -dy * offset; var y := dx * offset
			items.append(primitive("ellipse", 0xffd58b if i % 2 else color, 0.9, 300 + i * 35, {"x": x - dx * side * (0.5 + i * 0.2), "y": y - dy * side * (0.5 + i * 0.2), "scaleX": 0.2, "scaleY": 0.2}, x, y, side * (0.55 if style == "meteor" else 0.2), side * 0.09, angle + (offset / side if style == "meteor" else 0)))
	elif style in ["ink", "glitch"]:
		for i in range(5):
			var x := -dy * (i - 2) * side * 0.16; var y := dx * (i - 2) * side * 0.16
			items.append(primitive("rectangle", 0xf0f4ff if i % 2 else color, 0.8, 130 + i * 45 if style == "glitch" else 330, {"x": x + dx * side, "y": y + dy * side, "scaleX": 2.0 if style == "ink" else 0.3}, x, y, side * (0.4 + (i % 3) * 0.3), 2 if style == "ink" else 5, angle + (-0.45 if style == "ink" else 0)))
	elif style == "petal":
		for i in range(7):
			var theta := i * TAU / 7
			items.append(primitive("ellipse", 0xffc4d8 if i % 2 else color, 0.9, 550, {"x": cos(theta) * side, "y": sin(theta) * side, "angle": rad_to_deg(theta) + 160, "scale": 0.35}, 0, 0, side * 0.2, side * 0.1, theta))
	elif style == "ribbon":
		for i in range(3):
			var item := primitive("graphics", 0xf4eaff if i == 1 else color, 0.7, 500, {"scaleX": 1.8, "x": dx * side, "y": dy * side}, 0, 0, 0, 0, angle)
			item.strokeWidth = 3.0
			for step in range(17): item.points.append([step * side * 0.1, sin(step * 0.55 + i * 1.5) * side * 0.2])
			items.append(item)
	elif style in ["orbit", "crown", "sonar"]:
		for i in range(3 if style == "sonar" else 2):
			var rotation := angle + i * PI / 2
			var item := primitive("circle", 0xffd58b if style == "crown" else color, 0.75, 430, {"scaleX": 2.5, "scaleY": 2.5, "angle": rad_to_deg(rotation) + 70}, 0, 0, side * (0.25 + i * 0.12) * 2, side * (0.25 + i * 0.12) * 2, rotation)
			item.scaleY = 0.48 if style == "orbit" else 1.0
			item.strokeWidth = 3.0 if style == "crown" else 2.0; items.append(item)
	elif style == "electric":
		var item := primitive("graphics", 0xffd58b, 0.9, 240, {"scaleX": 2.3}, 0, 0, 0, 0, angle)
		item.strokeWidth = 2.5; item.points = [[-side * 0.3, 0]]
		for i in range(7): item.points.append([i * side * 0.12, (-1 if i % 2 else 1) * side * 0.13])
		items.append(item)
	else:
		# Prisma uses the original linear streak, never radial shards.
		var count := 3 if style == "nova" else (2 if style == "echo" else 1)
		for i in range(count):
			var offset := (i - (count - 1) / 2.0) * side * 0.18
			var x := -dy * offset; var y := dx * offset
			items.append(primitive("rectangle", 0xffffff if i == 1 else color, 0.7, 170 if style == "pixel" else 320, {"x": x + dx * side * 1.8, "y": y + dy * side * 1.8, "scaleX": 2.7}, x, y, side * (0.65 if style == "nova" else 0.4), 6 if style == "pixel" else 3, angle))
	return items

static func sample_exit(item: Dictionary, elapsed_ms: float) -> Dictionary:
	var state := item.duplicate(true)
	var progress := clampf(elapsed_ms / item.duration, 0, 1)
	var eased := 1 - pow(1 - progress, 3)
	state.alpha = item.alpha * (1 - eased)
	for key in item.target:
		var target: float = item.target[key]
		if key == "angle": state.rotation = lerpf(item.rotation, deg_to_rad(target), eased)
		elif key == "scale":
			state.scaleX = lerpf(item.scaleX, target, eased); state.scaleY = lerpf(item.scaleY, target, eased)
		else: state[key] = lerpf(item[key], target, eased)
	return state

static func draw_exit(canvas: CanvasItem, design_value: Dictionary, center: Vector2, side: float, direction: Vector2, age: float, theme := "aurora") -> void:
	var index := 0
	for i in range(4):
		if Vector2(LevelGenerator.VECTORS[i]) == direction: index = i
	var color_value := palette_color(LevelGenerator.DIRECTIONS[index], theme)
	for spec in exit_spec(design_value, side, direction, color_value):
		var state := sample_exit(spec, age * 550)
		if state.alpha <= 0: continue
		var points := PackedVector2Array()
		if state.kind in ["circle", "ellipse"]:
			for i in range(49):
				var theta := i * TAU / 48
				points.append(Vector2(cos(theta) * state.width / 2, sin(theta) * state.height / 2))
		elif state.kind == "rectangle":
			for p in [Vector2(-1, -1), Vector2(1, -1), Vector2(1, 1), Vector2(-1, 1)]: points.append(p * Vector2(state.width, state.height) / 2)
		else:
			for p in state.points: points.append(Vector2(p[0], p[1]))
			# Phaser subtracts displayOrigin (half the geometry's size).
			if state.kind == "triangle":
				var bounds := Rect2(points[0], Vector2.ZERO)
				for p in points: bounds = bounds.expand(p)
				for i in range(points.size()): points[i] -= bounds.size / 2
		canvas.draw_set_transform(center + Vector2(state.x, state.y), state.rotation, Vector2(state.scaleX, state.scaleY))
		var color := Color.hex(int(state.color) * 256 + 255); color.a = state.alpha
		if state.strokeWidth > 0: canvas.draw_polyline(points, color, state.strokeWidth, true)
		else: canvas.draw_colored_polygon(points, color)
		canvas.draw_set_transform(Vector2.ZERO)

extends SceneTree

var checks := 0
var failures := 0

func check(condition: bool, message: String) -> void:
	checks += 1
	if not condition: failures += 1; printerr("FAIL: " + message)

func same(a: Variant, b: Variant) -> bool:
	if LevelGenerator.number(a) and LevelGenerator.number(b): return absf(float(a) - float(b)) < 0.00001
	if a is Dictionary and b is Dictionary:
		if a.size() != b.size(): return false
		for key in a:
			if not b.has(key) or not same(a[key], b[key]): return false
		return true
	if a is Array and b is Array:
		if a.size() != b.size(): return false
		for i in range(a.size()):
			if not same(a[i], b[i]): return false
		return true
	return a == b

func _initialize() -> void:
	var catalog: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/catalog.json"))
	var reference: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/art-reference.json"))
	check(catalog.skins.size() == 32 and reference.cases.size() == 128, "32 skins, four directions")
	check(same(reference.inks, PieceArt.MATERIAL_INKS), "Original fixed material inks")
	for original in reference.skins:
		var skin := PieceArt.design(catalog, original.id)
		for key in original: check(same(skin.get(key), original[key]), original.id + " catalog " + key)
		for color_theme in reference.palettes:
			for direction in reference.palettes[color_theme]:
				var palette: int = reference.palettes[color_theme][direction]
				var expected: Dictionary = reference.inks.duplicate()
				expected.body = original.get("baseColor", palette)
				expected.accent = palette if original.get("paletteAccent", false) else reference.inks.accent
				check(same(PieceArt.inks(skin, direction, color_theme), expected), original.id + " inks " + color_theme + "/" + direction)
	for fixture in reference.cases:
		var skin := PieceArt.design(catalog, fixture.skin)
		var vector := Vector2(LevelGenerator.VECTORS[LevelGenerator.DIRECTIONS.find(fixture.direction)])
		var shapes := PieceArt.exit_spec(skin, reference.side, vector, reference.palettes.aurora[fixture.direction])
		check(same(shapes, fixture.shapes), fixture.skin + " actual classic exit " + fixture.direction)
		for i in range(mini(shapes.size(), fixture.shapes.size())):
			var original: Dictionary = fixture.shapes[i]
			for fraction in [0.0, 0.25, 0.5, 1.0]:
				var state := PieceArt.sample_exit(shapes[i], original.duration * fraction)
				var eased := 1 - pow(1 - fraction, 3)
				check(absf(state.alpha - original.alpha * (1 - eased)) < 0.00001, "Original cubic fade")
				for key in original.target:
					var target: float = original.target[key]
					if key == "angle": check(absf(state.rotation - lerpf(original.rotation, deg_to_rad(target), eased)) < 0.00001, "Original angular motion")
					elif key == "scale": check(absf(state.scaleX - lerpf(original.scaleX, target, eased)) < 0.00001 and absf(state.scaleY - lerpf(original.scaleY, target, eased)) < 0.00001, "Original uniform scale")
					else: check(absf(state[key] - lerpf(original[key], target, eased)) < 0.00001, "Original transition " + key)
	print("ART: %d checks, %d failures (original TypeScript method fixtures)" % [checks, failures])
	quit(1 if failures else 0)

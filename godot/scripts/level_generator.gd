class_name LevelGenerator
extends RefCounted

const DIRECTIONS := ["up", "right", "down", "left"]
const VECTORS := [Vector2i.UP, Vector2i.RIGHT, Vector2i.DOWN, Vector2i.LEFT]
var state: int

func seed_random(seed_text: String) -> void:
	state = hash_seed(seed_text)

static func hash_seed(text: String) -> int:
	var hash_value := 2166136261
	# JS charCodeAt hashes UTF-16 code units, including surrogate pairs.
	var bytes := text.to_utf16_buffer()
	for i in range(0, bytes.size(), 2):
		hash_value = ((hash_value ^ (bytes[i] | bytes[i + 1] << 8)) * 16777619) & 0xffffffff
	return hash_value

func random() -> float:
	state = (state + 0x6d2b79f5) & 0xffffffff
	var value := ((state ^ (state >> 15)) * (state | 1)) & 0xffffffff
	value = (value ^ ((value + (((value ^ (value >> 7)) * (value | 61)) & 0xffffffff)) & 0xffffffff)) & 0xffffffff
	return float((value ^ (value >> 14)) & 0xffffffff) / 4294967296.0

static func config_for_level(level: int) -> Dictionary:
	var side := 4 if level <= 2 else (5 if level <= 5 else (6 if level <= 15 else (7 if level <= 30 else (8 if level <= 60 else (9 if level <= 100 else 10)))))
	if level == 1:
		return {"width": side, "height": side, "density": 0.65, "complexity": 0.55}
	var shape: String = "square" if level == 2 else ["diamond", "cross", "ring", "hourglass", "square"][(level - 3) % 5]
	var config := {"width": side, "height": side, "density": minf(0.96, 0.72 + log(level + 1) / log(2) * 0.045 + (0.06 if shape != "square" else 0.0)), "complexity": minf(1, 0.55 + log(level + 1) / log(2) * 0.09), "tuning": "chain-v2"}
	if level != 2:
		config.shape = shape
	return config

static func contains(config: Dictionary, x: int, y: int) -> bool:
	var w: int = config.width
	var h: int = config.height
	if x < 0 or y < 0 or x >= w or y >= h:
		return false
	if mini(w, h) < 3:
		return true
	var nx := absf(2.0 * x / (w - 1) - 1)
	var ny := absf(2.0 * y / (h - 1) - 1)
	match config.get("shape", "square"):
		"diamond": return nx + ny <= 1.15
		"cross": return nx <= 0.4 or ny <= 0.4
		"ring": return maxf(nx, ny) >= 0.6
		"hourglass": return nx <= maxf(0.28, ny + 0.13)
	return true

static func valid_config(value: Variant) -> bool:
	if not value is Dictionary:
		return false
	for key in ["width", "height"]:
		if not number(value.get(key)) or value[key] != int(value[key]) or value[key] < 1 or value[key] > 10:
			return false
	for key in ["density", "complexity"]:
		if not number(value.get(key)) or value[key] < (0.1 if key == "density" else 0.0) or value[key] > 1:
			return false
	return value.get("shape", "square") in ["square", "diamond", "cross", "ring", "hourglass"] and value.get("tuning", "chain-v2") == "chain-v2"

static func number(value: Variant) -> bool:
	return (value is int or value is float) and is_finite(float(value))

# Independent pairwise dependency graph, not the movement implementation.
static func solve(board: Dictionary) -> Dictionary:
	var arrows: Array = board.arrows
	var edges: Array = []
	var ranks: Array = []
	for a in arrows:
		var dependencies: Array = []
		for b in arrows:
			if a.id == b.id:
				continue
			if (a.direction == "up" and a.x == b.x and b.y < a.y) or (a.direction == "down" and a.x == b.x and b.y > a.y) or (a.direction == "left" and a.y == b.y and b.x < a.x) or (a.direction == "right" and a.y == b.y and b.x > a.x):
				dependencies.append(b.id)
		edges.append(dependencies)
		ranks.append(1)
	var initial := 0
	var count := 0
	for edge in edges:
		initial += int(edge.is_empty())
		count += edge.size()
	var order: Array = []
	var depth := 0
	while order.size() < arrows.size():
		var progressed := false
		for i in range(arrows.size()):
			if arrows[i].id in order:
				continue
			var available := true
			for id in edges[i]:
				if id not in order:
					available = false
			if available:
				for id in edges[i]:
					for j in range(arrows.size()):
						if arrows[j].id == id:
							ranks[i] = maxi(ranks[i], ranks[j] + 1)
				depth = maxi(depth, ranks[i])
				order.append(arrows[i].id)
				progressed = true
		if not progressed:
			return {"solvable": false}
	return {"solvable": true, "order": order, "depth": depth, "initialMoves": initial, "dependencies": count}

func generate(seed_text: String, config: Dictionary, max_attempts := 4) -> Dictionary:
	assert(valid_config(config))
	var cells: Array[Vector2i] = []
	for y in range(int(config.height)):
		for x in range(int(config.width)):
			if contains(config, x, y): cells.append(Vector2i(x, y))
	var target := maxi(1, int(floor(cells.size() * config.density + 0.5)))
	var best: Dictionary = {}
	var best_quality := -INF
	for attempt in range(max_attempts):
		seed_random("%s|%s|%d" % [config.get("tuning", "inverse-v1"), seed_text, attempt])
		var arrows: Array = []
		var occupied: Dictionary = {}
		var ranks: Array = []
		for index in range(target):
			var pressure: Dictionary = {}
			var chains: Dictionary = {}
			var row_min: Array = []
			var row_max: Array = []
			var col_min: Array = []
			var col_max: Array = []
			row_min.resize(config.height); row_min.fill(config.width)
			row_max.resize(config.height); row_max.fill(-1)
			col_min.resize(config.width); col_min.fill(config.height)
			col_max.resize(config.width); col_max.fill(-1)
			for i in range(arrows.size()):
				var a: Dictionary = arrows[i]
				row_min[a.y] = mini(row_min[a.y], a.x); row_max[a.y] = maxi(row_max[a.y], a.x)
				col_min[a.x] = mini(col_min[a.x], a.y); col_max[a.x] = maxi(col_max[a.x], a.y)
				var step: Vector2i = VECTORS[DIRECTIONS.find(a.direction)]
				var p := Vector2i(a.x, a.y) + step
				while p.x >= 0 and p.y >= 0 and p.x < config.width and p.y < config.height:
					pressure[p] = pressure.get(p, 0) + 1
					chains[p] = maxi(chains.get(p, 0), ranks[i])
					p += step
			var choice: Dictionary = {}
			for cell in cells:
				if occupied.has(cell): continue
				if config.has("tuning"):
					var trapped := 0
					for c in cells:
						if c == cell or occupied.has(c): continue
						var min_x: int = mini(row_min[c.y], cell.x) if c.y == cell.y else row_min[c.y]
						var max_x: int = maxi(row_max[c.y], cell.x) if c.y == cell.y else row_max[c.y]
						var min_y: int = mini(col_min[c.x], cell.y) if c.x == cell.x else col_min[c.x]
						var max_y: int = maxi(col_max[c.x], cell.y) if c.x == cell.x else col_max[c.x]
						if c.x > min_x and c.x < max_x and c.y > min_y and c.y < max_y: trapped += 1
						if trapped > cells.size() - target: break
					if trapped > cells.size() - target: continue
				for d in range(4):
					var p: Vector2i = cell + VECTORS[d]
					var clear := true
					var future := 0
					while p.x >= 0 and p.y >= 0 and p.x < config.width and p.y < config.height:
						if occupied.has(p):
							clear = false; break
						if contains(config, p.x, p.y): future += 1
						p += VECTORS[d]
					if not clear: continue
					var complexity: float = config.complexity
					var score: float
					if config.has("tuning"):
						score = chains.get(cell, 0) * (0.8 + complexity * 2.4) + pressure.get(cell, 0) * (0.4 + complexity) + future * (0.45 + complexity * 0.5) + random() * (2.4 - complexity)
					else:
						score = pressure.get(cell, 0) * (0.4 + complexity * 3) + random() * 2
					if choice.is_empty() or score > choice.score:
						choice = {"id": "a%d" % index, "x": cell.x, "y": cell.y, "direction": DIRECTIONS[d], "score": score, "rank": chains.get(cell, 0) + 1}
			if choice.is_empty(): break
			ranks.append(choice.rank)
			occupied[Vector2i(choice.x, choice.y)] = true
			choice.erase("rank"); choice.erase("score")
			arrows.append(choice)
		if arrows.size() != target: continue
		var board := {"width": config.width, "height": config.height, "arrows": arrows}
		var solution := solve(board)
		if not solution.solvable: continue
		var quality: float = float(target - solution.initialMoves) / target + solution.depth * 0.15 + float(solution.dependencies) / target * 0.1
		if quality > best_quality:
			best_quality = quality; best = board
		var blocked := 1.0 - float(solution.initialMoves) / target
		var required: float = 0.55 + config.complexity * 0.25 if config.has("tuning") else 0.2 + config.complexity * 0.4
		var depth_required: int = mini(int(target * 0.5), 4 + int(config.complexity * 8)) if config.has("tuning") else mini(5, 2 + int(config.complexity * 3))
		if target < 4 or (blocked >= required and solution.depth >= depth_required): break
	if best.is_empty():
		# Same classic fallback: stable potential order and outward rays.
		seed_random(seed_text + "|fallback")
		for i in range(cells.size() - 1, 0, -1):
			var j := int(random() * (i + 1)); var temp := cells[i]; cells[i] = cells[j]; cells[j] = temp
		var picked: Array = []
		for i in range(target):
			var c := cells[i]
			picked.append({"cell": c, "index": i, "potential": maxi(absi(2 * c.x - int(config.width) + 1), absi(2 * c.y - int(config.height) + 1))})
		picked.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return a.potential < b.potential if a.potential != b.potential else a.index < b.index)
		var arrows: Array = []
		for i in range(picked.size()):
			var c: Vector2i = picked[i].cell
			var dx := 2 * c.x - int(config.width) + 1; var dy := 2 * c.y - int(config.height) + 1
			var horizontal := absi(dx) > absi(dy) or absi(dx) == absi(dy) and random() < 0.5
			arrows.append({"id": "a%d" % i, "x": c.x, "y": c.y, "direction": ("left" if dx < 0 else "right") if horizontal else ("up" if dy < 0 else "down")})
		best = {"width": config.width, "height": config.height, "arrows": arrows}
		assert(solve(best).solvable)
	return best

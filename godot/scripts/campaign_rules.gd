class_name CampaignRules
extends RefCounted

const POWERS := ["pulse", "ray", "nova"]
var session: Dictionary

func _init(value: Dictionary = {}) -> void:
	session = value.duplicate(true)

static func create(level: int, seed_text: String, config: Dictionary, mode := "classic") -> CampaignRules:
	var value := LevelGenerator.new().generate(seed_text, config)
	if value.is_empty(): return null
	return CampaignRules.new({"id": "%s-%d" % [seed_text, Time.get_ticks_usec()], "mode": mode, "level": level, "seed": seed_text, "date": null, "config": config, "initialBoard": value, "state": {"board": value.duplicate(true), "lives": 3, "initialLives": 3, "errors": 0, "moves": 0, "totalArrows": value.arrows.size(), "status": "playing"}, "elapsedMs": 0.0, "recorded": false, "counted": true, "generatorVersion": "inverse-v1", "hintsUsed": 0, "bestCombo": 0, "powerPolicy": "eligible-v1", "powerArrowId": "", "powerKind": "", "powerSpent": false})

func board() -> Dictionary:
	return session.state.board

func finished() -> bool:
	return session.state.status != "playing"

func arrow_at(cell: int) -> Dictionary:
	for arrow in board().arrows:
		if int(arrow.y) * int(board().width) + int(arrow.x) == cell: return arrow
	return {}

func blocker(arrow: Dictionary) -> Dictionary:
	var step: Vector2i = LevelGenerator.VECTORS[LevelGenerator.DIRECTIONS.find(arrow.direction)]
	var p := Vector2i(arrow.x, arrow.y) + step
	while p.x >= 0 and p.y >= 0 and p.x < board().width and p.y < board().height:
		var other := arrow_at(p.y * int(board().width) + p.x)
		if not other.is_empty(): return other
		p += step
	return {}

static func distance(a: Dictionary, b: Dictionary) -> int:
	return absi(int(a.x) - int(b.x)) + absi(int(a.y) - int(b.y))

static func position_before(a: Dictionary, b: Dictionary) -> bool:
	if a.y != b.y: return a.y < b.y
	if a.x != b.x: return a.x < b.x
	return a.id < b.id

static func targets(value: Dictionary, source: Dictionary, kind: String) -> Array:
	var candidates: Array = []
	for arrow in value.arrows:
		if arrow.id == source.id: continue
		if (kind == "ray" and (arrow.x == source.x or arrow.y == source.y)) or (kind == "nova" and maxi(absi(int(arrow.x) - int(source.x)), absi(int(arrow.y) - int(source.y))) <= 1) or (kind == "pulse" and arrow.direction == source.direction and distance(arrow, source) <= 2):
			candidates.append(arrow)
	candidates.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
		var da := distance(a, source); var db := distance(b, source)
		return da < db if da != db else position_before(a, b))
	return candidates.slice(0, 2 if kind == "pulse" else 3)

static func select_power(value: Dictionary, kind: String) -> String:
	var candidates: Array = value.arrows.duplicate()
	candidates.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
		var ca := targets(value, a, kind).size(); var cb := targets(value, b, kind).size()
		return ca > cb if ca != cb else position_before(a, b))
	return candidates[0].id if not candidates.is_empty() and not targets(value, candidates[0], kind).is_empty() else ""

static func power_at(run_id: String, position: int) -> String:
	var bag := POWERS.duplicate()
	var rng := LevelGenerator.new()
	rng.seed_random("powers:%s:%d" % [run_id, int(position / 3)])
	for i in range(2, 0, -1):
		var j := int(rng.random() * (i + 1))
		var temp: String = bag[i]; bag[i] = bag[j]; bag[j] = temp
	return bag[position % 3]

func extract(cell: int) -> Dictionary:
	var arrow := arrow_at(cell)
	if finished() or arrow.is_empty(): return {"changed": false}
	var obstacle := blocker(arrow)
	session.state.moves += 1
	if not obstacle.is_empty():
		session.state.lives -= 1; session.state.errors += 1
		if session.state.lives == 0: session.state.status = "lost"
		return {"changed": true, "blocked": true, "obstacle": int(obstacle.y) * int(board().width) + int(obstacle.x)}
	var removed := [arrow.id]
	if arrow.id == session.get("powerArrowId", "") and not session.get("powerSpent", false):
		for target in targets(board(), arrow, session.get("powerKind", "pulse")): removed.append(target.id)
		session.powerSpent = true
	# The classic persisted counter counts cleared pieces, including special targets.
	session.state.moves += removed.size() - 1
	session.state.board.arrows = board().arrows.filter(func(a: Dictionary) -> bool: return a.id not in removed)
	if board().arrows.is_empty() and session.get("survival", {}).get("pendingIds", []).is_empty(): session.state.status = "won"
	return {"changed": true, "blocked": false, "removed": removed}

func stars() -> int:
	return 0 if session.state.status != "won" else (1 if session.state.errors > 0 else (2 if session.get("hintsUsed", -1) != 0 else 3))

static func arrival_interval(elapsed_ms: float) -> float:
	return 2200 + 2800 * exp(-maxf(0, elapsed_ms) / 150000)

func prepare_survival() -> void:
	var pending: Array = []
	for a in session.initialBoard.arrows.slice(10): pending.append(a.id)
	session.survival = {"pendingIds": pending, "arrivalInMs": arrival_interval(session.elapsedMs), "congestionMs": 0.0}
	session.state.board.arrows = session.initialBoard.arrows.slice(0, 10).duplicate(true)

func tick_survival(delta_ms: float) -> bool:
	if finished() or session.mode != "endless": return false
	var state: Dictionary = session.survival
	state.arrivalInMs = maxf(0, state.arrivalInMs - delta_ms)
	var changed := false
	if state.arrivalInMs == 0 and not state.pendingIds.is_empty():
		for i in range(mini(state.pendingIds.size(), mini(4, 2 + int((session.level - 1) / 3)))):
			var id: String = state.pendingIds.pop_front()
			for a in session.initialBoard.arrows:
				if a.id == id: session.state.board.arrows.append(a.duplicate(true))
		state.arrivalInMs = arrival_interval(session.elapsedMs)
		changed = true
	state.congestionMs = state.congestionMs + delta_ms if board().arrows.size() >= ceil(board().width * board().height * 0.7) else 0.0
	if state.congestionMs >= 10000:
		state.congestionMs = 0; session.state.lives -= 1; session.state.errors += 1; session.state.moves += 1
		if session.state.lives == 0: session.state.status = "lost"
		changed = true
	return changed

static func valid_board(value: Variant) -> bool:
	if not value is Dictionary or not value.get("arrows") is Array: return false
	if not integer(value.get("width"), 1, 10) or not integer(value.get("height"), 1, 10) or value.arrows.size() > 100: return false
	var ids: Array = []; var cells: Array = []
	for a in value.arrows:
		if not a is Dictionary or not a.get("id") is String or a.id.length() < 1 or a.id.length() > 128: return false
		if not integer(a.get("x"), 0, value.width - 1) or not integer(a.get("y"), 0, value.height - 1) or a.get("direction") not in LevelGenerator.DIRECTIONS: return false
		var cell: int = int(a.y) * int(value.width) + int(a.x)
		if a.id in ids or cell in cells: return false
		ids.append(a.id); cells.append(cell)
	return LevelGenerator.solve(value).solvable

static func integer(value: Variant, low: int, high := 1000000000) -> bool:
	return LevelGenerator.number(value) and value == int(value) and value >= low and value <= high

static func restore(value: Variant) -> CampaignRules:
	if not value is Dictionary or value.get("generatorVersion") != "inverse-v1" or not LevelGenerator.valid_config(value.get("config")): return null
	if not value.get("state") is Dictionary or not valid_board(value.get("initialBoard")) or not valid_board(value.state.get("board")): return null
	if not value.get("id") is String or value.id.is_empty() or value.id.length() > 256 or not value.get("seed") is String or value.seed.is_empty() or value.seed.length() > 128 or not integer(value.get("level"), 1): return null
	if value.get("mode") not in ["classic", "daily", "shared", "endless"] or not value.get("recorded") is bool or not value.get("counted") is bool: return null
	var s: Dictionary = value.state
	if not integer(s.get("lives"), 0, 4) or not integer(s.get("errors"), 0) or not integer(s.get("moves"), 0): return null
	if not LevelGenerator.number(value.get("elapsedMs")) or value.elapsedMs < 0: return null
	if s.get("status") not in ["playing", "won", "lost"]: return null
	var initial_lives: Variant = s.get("initialLives", 3)
	if not integer(initial_lives, 3, 4) or value.mode != "classic" and initial_lives != 3: return null
	if s.lives > initial_lives or s.errors != initial_lives - s.lives or s.moves < s.errors: return null
	if value.recorded and s.status == "playing": return null
	if not integer(s.get("totalArrows"), 1, 100) or s.totalArrows != value.initialBoard.arrows.size(): return null
	if value.initialBoard.arrows.is_empty(): return null
	var cells := 0
	for y in range(int(value.config.height)):
		for x in range(int(value.config.width)):
			if LevelGenerator.contains(value.config, x, y): cells += 1
	if value.initialBoard.arrows.size() != maxi(1, int(floor(cells * value.config.density + 0.5))): return null
	if value.mode == "daily" and not ProfileStore.valid_date(value.get("date")): return null
	if value.get("date") != null and not ProfileStore.valid_date(value.date): return null
	if (s.status == "lost" and s.lives != 0) or (s.status != "lost" and s.lives == 0): return null
	if s.status == "won" and not s.board.arrows.is_empty(): return null
	if s.status == "playing" and s.board.arrows.is_empty() and value.get("survival", {}).get("pendingIds", []).is_empty(): return null
	if value.initialBoard.width != s.board.width or value.initialBoard.height != s.board.height: return null
	if value.config.width != s.board.width or value.config.height != s.board.height: return null
	for arrow in s.board.arrows:
		var found := false
		for original in value.initialBoard.arrows:
			if arrow == original: found = true
		if not found: return null
	for a in value.initialBoard.arrows:
		if not LevelGenerator.contains(value.config, int(a.x), int(a.y)): return null
	if value.get("powerKind", "pulse") not in ["", "pulse", "ray", "nova"]: return null
	if value.get("powerArrowId") != null and value.powerArrowId != "" and not value.initialBoard.arrows.any(func(a: Dictionary) -> bool: return a.id == value.powerArrowId): return null
	if value.get("powerPolicy", "eligible-v1") != "eligible-v1" or not value.get("powerSpent", false) is bool: return null
	if not integer(value.get("hintsUsed", 0), 0, 1000000) or not integer(value.get("bestCombo", 0), 0, 100): return null
	if value.get("survival") != null:
		var survival: Variant = value.survival
		if value.mode != "endless" or not survival is Dictionary or not survival.get("pendingIds") is Array or survival.pendingIds.size() > value.initialBoard.arrows.size(): return null
		for id in survival.pendingIds:
			if not id is String or survival.pendingIds.count(id) != 1 or s.board.arrows.any(func(a: Dictionary) -> bool: return a.id == id) or not value.initialBoard.arrows.any(func(a: Dictionary) -> bool: return a.id == id): return null
		for key in ["arrivalInMs", "congestionMs"]:
			if not LevelGenerator.number(survival.get(key)) or survival[key] < 0: return null
		if survival.arrivalInMs > 5000 or survival.congestionMs >= 10000: return null
	var pending: int = value.get("survival", {}).get("pendingIds", []).size()
	if s.moves != value.initialBoard.arrows.size() - s.board.arrows.size() - pending + s.errors: return null
	var restored := CampaignRules.new(value)
	if not restored.session.has("powerKind"): restored.session.powerKind = "pulse"
	if value.mode == "endless" and not restored.session.has("survival"):
		restored.session.survival = {"pendingIds": [], "arrivalInMs": arrival_interval(value.elapsedMs), "congestionMs": 0.0}
	return restored

class_name DemoRules
extends RefCounted

const VERSION := "hybrid-demo-v1"
const SIZE := 5
const FAMILIES := [0, 1, 0, 2, 1, 1, 0, 2, 0, 2, 2, 1, 0, 1, 0, 0, 2, 1, 2, 1, 1, 0, 2, 0, 2]
const STEPS := [Vector2i.RIGHT, Vector2i.DOWN, Vector2i.LEFT, Vector2i.UP]
var gems: Array[int] = []
var directions: Array[int] = []
var lives := 3
var actions: Array = []

func _init() -> void:
	for i in range(25):
		gems.append(FAMILIES[i])
		var row := i / SIZE as int
		directions.append(3 if row == 0 else (1 if row == 4 else (0 if row % 2 == 0 else 2)))

func remaining() -> int:
	var count := 0
	for gem in gems:
		if gem >= 0:
			count += 1
	return count

func finished() -> bool:
	return lives == 0 or remaining() == 0

func occupied(i: int) -> bool:
	return i >= 0 and i < 25 and gems[i] >= 0

func blocker(i: int) -> int:
	if not occupied(i):
		return -1
	var p: Vector2i = Vector2i(i % SIZE, i / SIZE as int) + STEPS[directions[i]]
	while p.x >= 0 and p.x < SIZE and p.y >= 0 and p.y < SIZE:
		var other: int = p.y * SIZE + p.x
		if occupied(other):
			return other
		p += STEPS[directions[i]]
	return -1

func extract(i: int) -> Dictionary:
	if finished() or not occupied(i):
		return {"changed": false}
	var obstacle := blocker(i)
	if obstacle >= 0:
		lives -= 1
	else:
		gems[i] = -1
	actions.append(["take", i])
	return {"changed": true, "blocker": obstacle}

func lines() -> Array[int]:
	var found: Array[int] = []
	for axis in [Vector2i.RIGHT, Vector2i.DOWN]:
		for i in range(25):
			if not occupied(i):
				continue
			var p := Vector2i(i % SIZE, i / SIZE as int)
			var run: Array[int] = []
			while p.x < SIZE and p.y < SIZE:
				var j := p.y * SIZE + p.x
				if gems[j] != gems[i]:
					break
				run.append(j)
				p += axis
			if run.size() >= 3:
				for j in run:
					if j not in found:
						found.append(j)
	return found

func combine(a: int, b: int) -> Dictionary:
	if finished() or not occupied(a) or not occupied(b):
		return {"changed": false}
	var delta := Vector2i(a % SIZE, a / SIZE as int) - Vector2i(b % SIZE, b / SIZE as int)
	if absi(delta.x) + absi(delta.y) != 1:
		return {"changed": false}
	var temp := gems[a]
	gems[a] = gems[b]
	gems[b] = temp
	var matched := lines()
	if a not in matched and b not in matched:
		temp = gems[a]
		gems[a] = gems[b]
		gems[b] = temp
		return {"changed": false}
	for i in matched:
		gems[i] = -1
	actions.append(["swap", a, b])
	return {"changed": true, "removed": matched.size()}

# Reconstruct from a bounded action journal; never trust saved board/lives values.
static func restore(value: Variant) -> DemoRules:
	if not value is Dictionary or value.get("rules") != VERSION or not value.get("actions") is Array:
		return null
	if value.actions.size() > 28:
		return null
	var game := DemoRules.new()
	for action in value.actions:
		if not action is Array or action.size() < 2 or not action[0] is String:
			return null
		for j in range(1, action.size()):
			if not (action[j] is float or action[j] is int) or action[j] != int(action[j]) or action[j] < 0 or action[j] >= 25:
				return null
		var result: Dictionary
		if action[0] == "take" and action.size() == 2:
			result = game.extract(int(action[1]))
		elif action[0] == "swap" and action.size() == 3:
			result = game.combine(int(action[1]), int(action[2]))
		else:
			return null
		if not result.changed:
			return null
	return game

func snapshot() -> Dictionary:
	return {"rules": VERSION, "actions": actions.duplicate(true)}

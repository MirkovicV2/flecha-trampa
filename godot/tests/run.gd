extends SceneTree

var failures := 0
var checks := 0

func expect(condition: bool, description: String) -> void:
	checks += 1
	if not condition:
		failures += 1
		push_error(description)

func _initialize() -> void:
	var game := DemoRules.new()
	expect(game.lines().is_empty(), "No automatic initial matches")
	expect(game.blocker(0) == -1, "At least one free extraction")
	var original_directions := game.directions.duplicate()
	expect(game.combine(1, 6).changed, "Known initial valid swap")
	expect(game.remaining() == 22, "Swap removes exactly three arrows")
	expect(game.directions == original_directions, "Gem swap never moves arrows")
	var restored := DemoRules.restore(JSON.parse_string(JSON.stringify(game.snapshot())))
	expect(restored != null and restored.gems == game.gems and restored.lives == game.lives, "Exact JSON journal restoration")
	game = DemoRules.new()
	var original := game.gems.duplicate()
	expect(not game.combine(0, 1).changed and game.gems == original and game.lives == 3, "Invalid swap reverts without life cost")
	expect(not game.combine(4, 5).changed, "Row wrap is not adjacency")
	expect(game.extract(6).blocker == 5 and game.lives == 2, "First obstacle costs exactly one life")
	game.extract(6)
	game.extract(6)
	expect(game.finished() and game.lives == 0, "Three blocked taps lose")
	expect(not game.extract(0).changed and game.lives == 0, "Terminal input ignored")
	expect(DemoRules.restore({"rules": DemoRules.VERSION, "actions": [["take", 6], ["take", 6], ["take", 6], ["take", 0]]}) == null, "Reject actions after defeat")
	expect(DemoRules.restore({"rules": "future", "actions": []}) == null, "Unknown rules rejected")
	expect(DemoRules.restore({"rules": DemoRules.VERSION, "actions": [["swap", 0, 1]]}) == null, "Reject impossible saved swap")
	expect(DemoRules.restore({"rules": DemoRules.VERSION, "actions": [["take", 0.5]]}) == null, "Reject fractional cell")
	game = DemoRules.new()
	game.gems.fill(-1)
	for i in [2, 7, 10, 11, 12, 13, 14, 17, 22]:
		game.gems[i] = 0
	expect(game.lines().size() == 9, "Five-by-five crossing counted as union, not ten")
	game.gems[12] = -1
	expect(game.lines().is_empty(), "Holes break matches; no diagonal or gap connections")
	validate_independent_solution()
	validate_saves()
	print("Demo: %d checks, %d failures" % [checks, failures])
	quit(1 if failures > 0 else 0)

func validate_independent_solution() -> void:
	var game := DemoRules.new()
	var remaining: Array[int] = []
	for i in range(25):
		remaining.append(i)
	var solution: Array[int] = []
	# Pairwise geometric dependencies, independent of the ray-walking blocker function.
	while not remaining.is_empty():
		var removable := -1
		for a in remaining:
			var blocked := false
			var x := a % 5
			var y := a / 5 as int
			for b in remaining:
				if a == b:
					continue
				var bx := b % 5
				var by := b / 5 as int
				match game.directions[a]:
					0: blocked = blocked or (by == y and bx > x)
					1: blocked = blocked or (bx == x and by > y)
					2: blocked = blocked or (by == y and bx < x)
					3: blocked = blocked or (bx == x and by < y)
			if not blocked:
				removable = a
				break
		if removable < 0:
			break
		solution.append(removable)
		remaining.erase(removable)
	expect(solution.size() == 25, "Independent graph has complete extraction solution")
	for cell in solution:
		expect(game.extract(cell).get("blocker") == -1, "Independent solution executes in real rules")
	expect(game.remaining() == 0 and game.lives == 3, "Extraction-only victory without lost lives")
	game = DemoRules.new()
	game.combine(1, 6)
	for cell in solution:
		if game.occupied(cell):
			expect(game.extract(cell).get("blocker") == -1, "Match preserves extraction solution")
	expect(game.remaining() == 0, "Hybrid match then extraction reaches victory")

func test_store(paths: Array) -> DemoSaveStore:
	var store := DemoSaveStore.new()
	store.slots = paths
	return store

func validate_saves() -> void:
	var directory := "user://hybrid-test-%d" % OS.get_process_id()
	expect(DirAccess.make_dir_absolute(directory) == OK, "Create isolated save fixture")
	var paths: Array = [directory + "/a.json", directory + "/b.json"]
	var game := DemoRules.new()
	var store := test_store(paths)
	expect(store.save_game(game), "First save")
	game.extract(0)
	expect(store.save_game(game), "Second save")
	var loaded := test_store(paths).load_game()
	expect(loaded != null and loaded.gems == game.gems, "Latest journal selected")
	game.extract(1)
	expect(store.save_game(game), "Slot replacement works")
	var file := FileAccess.open(paths[1], FileAccess.WRITE)
	file.store_string("truncated")
	file.close()
	loaded = test_store(paths).load_game()
	expect(loaded != null and loaded.remaining() == 24, "Corrupt newest falls back to previous valid journal")
	file = FileAccess.open(paths[0], FileAccess.WRITE)
	file.store_string("corrupt")
	file.close()
	store = test_store(paths)
	expect(store.load_game() == null and store.protected, "Two invalid slots protect existing data")
	expect(not store.save_game(game), "No silent overwrite of corrupt saves")
	var failing := test_store([directory + "/missing/a", directory + "/missing/b"])
	expect(not failing.save_game(game) and not failing.message.is_empty(), "Write failure reported; in-memory game unchanged")
	expect(game.remaining() == 23, "Persistence failure preserves memory")
	for slot in paths:
		DirAccess.remove_absolute(slot)
		DirAccess.remove_absolute(slot + ".tmp")
	DirAccess.remove_absolute(directory)

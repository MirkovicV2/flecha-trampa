extends SceneTree

var checks := 0
var failures := 0

func same(a: Variant, b: Variant) -> bool:
	if LevelGenerator.number(a) and LevelGenerator.number(b): return absf(float(a) - float(b)) < 0.000000001
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

func check(condition: bool, description: String) -> void:
	checks += 1
	if not condition:
		failures += 1; printerr("FAIL: " + description)

func _initialize() -> void:
	call_deferred("run")

func run() -> void:
	var fixtures: Array = JSON.parse_string(FileAccess.get_file_as_string("res://data/generator-fixtures.json"))
	var fallbacks: Array = JSON.parse_string(FileAccess.get_file_as_string("res://data/fallback-fixtures.json"))
	for fixture in fallbacks:
		check(same(LevelGenerator.new().generate(fixture.seed, fixture.config, 0), fixture.board), "Exact classic fallback")
	var powers: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/power-fixtures.json"))
	var position := 0
	for fixture in powers.fixtures:
		var kind := CampaignRules.power_at(powers.powerRunId, position)
		var value := LevelGenerator.new().generate("classic:%s:%d" % [powers.runId, fixture.level], LevelGenerator.config_for_level(int(fixture.level)))
		var id := CampaignRules.select_power(value, kind)
		check(kind == fixture.kind if not id.is_empty() else fixture.kind == null, "Commercial eligible power sequence")
		check(id == fixture.id if not id.is_empty() else fixture.id == null, "Commercial selected power arrow")
		if not id.is_empty():
			position += 1
			var source: Dictionary = value.arrows.filter(func(a: Dictionary) -> bool: return a.id == id)[0]
			check(CampaignRules.targets(value, source, kind).map(func(a: Dictionary) -> String: return a.id) == fixture.targets, "Commercial target order")
	for fixture in fixtures:
		var generated := LevelGenerator.new().generate(fixture.seed, fixture.config)
		check(same(generated, fixture.board), "Exact classic generator fixture level %d" % fixture.level)
		check(same(LevelGenerator.config_for_level(int(fixture.level)), fixture.config), "Classic config fixture %d" % fixture.level)
		if generated.is_empty(): continue
		var rules := CampaignRules.create(int(fixture.level), fixture.seed, fixture.config)
		var solution := LevelGenerator.solve(generated)
		for id in solution.order:
			for a in rules.board().arrows.duplicate():
				if a.id == id:
					var result := rules.extract(int(a.y) * int(generated.width) + int(a.x))
					check(result.changed and not result.blocked, "Independent solution executes " + id)
		check(rules.stars() == 3, "Three star clear")
		check(not rules.extract(0).changed, "Terminal ignores input")
	var special := CampaignRules.new({"initialBoard": {"width": 4, "height": 4, "arrows": [{"id": "p", "x": 0, "y": 1, "direction": "right"}, {"id": "b", "x": 2, "y": 1, "direction": "right"}, {"id": "c", "x": 0, "y": 2, "direction": "right"}]}, "state": {"board": {"width": 4, "height": 4, "arrows": [{"id": "p", "x": 0, "y": 1, "direction": "right"}, {"id": "b", "x": 2, "y": 1, "direction": "right"}, {"id": "c", "x": 0, "y": 2, "direction": "right"}]}, "lives": 3, "moves": 0, "errors": 0, "status": "playing"}, "powerArrowId": "p", "powerKind": "pulse", "powerSpent": false})
	check(special.extract(4).blocked and not special.session.powerSpent and special.board().arrows.size() == 3, "Blocked special never spent")
	check(not special.extract(6).blocked, "Clear blocker")
	check(special.extract(4).removed.size() == 2 and special.session.powerSpent, "Pulse spends exactly once after legal extraction")
	for kind in CampaignRules.POWERS:
		check(not CampaignRules.select_power(special.session.initialBoard, kind).is_empty(), "Eligible " + kind)
	for i in range(10):
		var bag := [CampaignRules.power_at("fixture", i * 3), CampaignRules.power_at("fixture", i * 3 + 1), CampaignRules.power_at("fixture", i * 3 + 2)]
		bag.sort(); check(bag == ["nova", "pulse", "ray"], "Seeded power bag")
	var dealing: Control = load("res://scripts/main.gd").new()
	dealing.classic().runId = "qa-eligibility-0"
	var no_targets := CampaignRules.new({"level": 1, "initialBoard": {"width": 1, "height": 1, "arrows": [{"id": "a0", "x": 0, "y": 0, "direction": "up"}]}})
	dealing.assign_power(no_targets)
	check(no_targets.session.powerKind == "" and dealing.power_position == 0, "Ineligible board preserves empty deal and bag position")
	var next_deal := CampaignRules.create(2, "classic:qa-eligibility-0:2", LevelGenerator.config_for_level(2))
	dealing.assign_power(next_deal)
	check(next_deal.session.powerKind == "ray" and dealing.power_position == 1, "Next eligible board receives waiting Ray without reroll")
	dealing.free()
	for windows in ["standard", "assisted"]:
		var template := RhythmRules.new("intro", windows)
		for category in range(3):
			for sign_value in [-1, 1]:
				var rules := RhythmRules.new("intro", windows)
				var note: Dictionary = rules.notes[0]
				var error: float = template.windows()[category] * sign_value
				var result := rules.hit(note.lane, note.time + error / 1000)
				check(result.hit and rules.score == [1000, 600, 300][category], "Inclusive judgment %s %s" % [windows, error])
		var outside := RhythmRules.new("intro", windows)
		check(not outside.hit(outside.notes[0].lane, outside.notes[0].time - (outside.windows()[2] + 0.01) / 1000).hit and not outside.notes[0].judged, "Outside window never consumes note")
	var rhythm := RhythmRules.new("fast")
	for note in rhythm.notes:
		if not note.judged: check(rhythm.hit(note.lane, note.time).hit, "Fast perfect fixture")
	check(rhythm.result().accuracy == 100 and rhythm.misses == 0, "100 percent accuracy")
	var expires := RhythmRules.new("intro")
	var note_time: float = expires.notes[0].time
	check(expires.expire(note_time + 0.14) == 0, "Miss boundary inclusive")
	check(expires.expire(note_time + 0.1401) == 1 and expires.expire(note_time + 0.1401) == 0, "Miss once only")
	var calibrated := RhythmRules.new("intro", "standard", 100)
	check(calibrated.hit(calibrated.notes[0].lane, calibrated.notes[0].time + 0.1).hit and calibrated.score == 1000, "Positive offset corrects late input")
	for pair in [[0, 5000.0], [60000, 4076.896], [150000, 3230.062], [600000, 2251.284]]:
		check(absf(CampaignRules.arrival_interval(pair[0]) - pair[1]) < 0.01, "Survival pressure %d" % pair[0])
	var store := ProfileStore.new()
	check(store.valid_profile(store.profile), "Default profile valid")
	var valid_session := CampaignRules.create(1, "validation", LevelGenerator.config_for_level(1))
	check(CampaignRules.restore(JSON.parse_string(JSON.stringify(valid_session.session))) != null, "Session numbers survive JSON round trip")
	for bad in ["lives", "totalArrows", "errors"]:
		var broken: Dictionary = valid_session.session.duplicate(true)
		broken.state[bad] = 99
		check(CampaignRules.restore(broken) == null, "Reject inconsistent session " + bad)
	var wrong_slot := store.profile.duplicate(true)
	wrong_slot.classic.dailySave = valid_session.session
	check(not store.valid_profile(wrong_slot), "Reject campaign in daily slot")
	var old_power: Dictionary = valid_session.session.duplicate(true)
	old_power.erase("powerKind")
	check(CampaignRules.restore(old_power).session.powerKind == "pulse", "Legacy power kind remains Pulse")
	var daily := CampaignRules.create(1, "daily:inverse-v1:2026-11-09", {"width": 7, "height": 7, "density": 0.67, "complexity": 0.75}, "daily")
	daily.session.date = "2026-02-30"
	check(CampaignRules.restore(daily.session) == null, "Invalid UTC date rejected")
	check(store.catalog.skins.size() == 32 and store.catalog.worlds.size() == 7, "All skins and worlds")
	var path := "user://test-arcade-%d" % Time.get_ticks_usec()
	store.slots = [path + "-a.json", path + "-b.json"]
	check(store.save(), "First profile atomic save")
	store.profile.classic.settings.skin = "chevron"; store.profile.classic.economy.collection.ownedSkins.append("chevron")
	check(store.save(), "Equipped profile atomic save")
	var reopened := ProfileStore.new(); reopened.slots = store.slots.duplicate(); reopened.load_profile()
	check(reopened.profile.classic.settings.skin == "chevron", "Reopened skin persisted")
	var original := FileAccess.get_file_as_string("res://data/classic-profile-example.json")
	var original_hash := original.sha256_text()
	var previous := JSON.stringify(reopened.profile)
	check(not reopened.preview_import(original).is_empty() and not reopened.pending_import.is_empty(), "Classic copy preview")
	check(JSON.stringify(reopened.profile) == previous, "Preview does not mutate profile")
	reopened.pending_import = {}
	check(JSON.stringify(reopened.profile) == previous, "Cancel no effect")
	reopened.preview_import(original)
	check(reopened.confirm_import(), "Confirmed classic import separate profile")
	check(FileAccess.get_file_as_string("res://data/classic-profile-example.json").sha256_text() == original_hash, "Original fixture unchanged")
	for bad in ["{broken", "{\"version\":999}", "[]", original.replace('"schema": 1', '"schema": 999')]:
		reopened.preview_import(bad); check(reopened.pending_import.is_empty(), "Reject corrupt/unknown import")
	var corrupt := FileAccess.open(store.slots[store.generation % 2], FileAccess.WRITE); corrupt.store_string("bad"); corrupt.close()
	var recovery := ProfileStore.new(); recovery.slots = store.slots.duplicate(); recovery.load_profile()
	check(not recovery.protected and not recovery.message.is_empty(), "Recover older generation visibly")
	for slot in store.slots: DirAccess.remove_absolute(slot)
	var failure := ProfileStore.new(); failure.slots = ["user://missing-directory/fail-a", "user://missing-directory/fail-b"]
	check(not failure.save() and not failure.message.is_empty(), "Write failure no false success")
	for fixture in fixtures:
		var code := ChallengeCode.encode(fixture.seed, fixture.config)
		var decoded := ChallengeCode.decode(code)
		check(not decoded.is_empty() and same(decoded.config, fixture.config), "Shared code round trip")
		check(ChallengeCode.decode(code + "x").is_empty(), "Shared checksum rejection")
	var legacy := "FT1.eyJzY2hlbWEiOjEsImdlbmVyYXRvciI6ImludmVyc2UtdjEiLCJzZWVkIjoibGVnYWN5LWZyb3plbiIsImNvbmZpZyI6eyJ3aWR0aCI6NSwiaGVpZ2h0Ijo1LCJkZW5zaXR5IjowLjcsImNvbXBsZXhpdHkiOjAuNjV9fQ.af350cad"
	var decoded_legacy := ChallengeCode.decode(legacy)
	check(not decoded_legacy.is_empty() and decoded_legacy.seed == "legacy-frozen", "Classic frozen FT1 decodes independently")
	check(ChallengeCode.encode(decoded_legacy.seed, decoded_legacy.config) == legacy, "Classic FT1 byte exact export")
	var daily_store := ProfileStore.new()
	for repeat in range(2):
		var daily_game := CampaignRules.create(1, "daily:inverse-v1:2026-11-09", {"width": 7, "height": 7, "density": 0.67, "complexity": 0.75}, "daily")
		daily_game.session.date = "2026-11-09"; daily_store.profile.classic.stats.played += 1
		for id in LevelGenerator.solve(daily_game.board()).order:
			for a in daily_game.board().arrows.duplicate():
				if a.id == id: daily_game.extract(int(a.y) * 7 + int(a.x))
		daily_store.record_result(daily_game); daily_store.record_result(daily_game)
	check(daily_store.profile.classic.daily.completedDays == 1 and daily_store.profile.classic.economy.pass.xp == 175 and daily_store.profile.classic.economy.collection.keyProgress == 1, "Repeated UTC daily never duplicates progression")
	print("ARCADE: %d checks, %d failures" % [checks, failures])
	quit(1 if failures > 0 else 0)

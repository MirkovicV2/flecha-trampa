class_name ProfileStore
extends RefCounted

const VERSION := 2
const MAX_BYTES := 500000
var slots := ["user://arcade-profile-a.json", "user://arcade-profile-b.json"]
var profile: Dictionary
var generation := 0
var protected := false
var message := ""
var pending_import: Dictionary = {}
var catalog: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/catalog.json"))

func _init() -> void:
	profile = fresh_profile()

static func fresh_profile() -> Dictionary:
	var classic: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/classic-profile-example.json"))
	classic.runId = "%08x-%04x-4%03x-8%03x-%012x" % [randi(), randi() & 65535, randi() & 4095, randi() & 4095, randi()]
	classic.economy.energy.updatedAt = int(Time.get_unix_time_from_system() * 1000)
	classic.settings.sound = true
	return {"version": VERSION, "classic": classic, "rhythm": {"records": {}, "settings": {"music": 0.65, "effects": 0.65, "offsetMs": 0, "windows": "standard"}}, "endlessSave": null}

func valid_profile(value: Variant) -> bool:
	if not value is Dictionary or value.get("version") != VERSION or not valid_classic(value.get("classic")): return false
	if not value.get("rhythm") is Dictionary or not value.rhythm.get("records") is Dictionary or not value.rhythm.get("settings") is Dictionary: return false
	var settings: Dictionary = value.rhythm.settings
	for key in ["music", "effects"]:
		if not LevelGenerator.number(settings.get(key)) or settings[key] < 0 or settings[key] > 1: return false
	if not CampaignRules.integer(settings.get("offsetMs"), -250, 250) or settings.get("windows") not in ["standard", "assisted"]: return false
	if value.rhythm.records.size() > 100: return false
	for key in value.rhythm.records:
		var record: Variant = value.rhythm.records[key]
		if not key is String or key.length() > 128 or not record is Dictionary: return false
		for field in ["score", "bestCombo", "misses", "empty"]:
			if not CampaignRules.integer(record.get(field), 0, 10000000): return false
		if not LevelGenerator.number(record.get("accuracy")) or record.accuracy < 0 or record.accuracy > 100: return false
	if value.get("endlessSave") != null:
		var endless := CampaignRules.restore(value.endlessSave)
		if endless == null or endless.session.mode != "endless": return false
	return true

func valid_classic(value: Variant) -> bool:
	if not value is Dictionary or value.get("schema") != 1: return false
	if not value.get("runId") is String or value.runId.length() != 36 or not CampaignRules.integer(value.get("level"), 1, 100000): return false
	if RegEx.create_from_string("^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$").search(value.runId) == null: return false
	if not CampaignRules.integer(value.get("hints"), 0, 99) or not value.get("tutorialDone") is bool: return false
	for slot in ["classicSave", "dailySave", "sharedSave"]:
		if not value.has(slot): return false
		if value[slot] != null:
			var restored := CampaignRules.restore(value[slot])
			if restored == null or restored.session.mode != {"classicSave": "classic", "dailySave": "daily", "sharedSave": "shared"}[slot]: return false
	if value.get("endlessSave") != null:
		var endless := CampaignRules.restore(value.endlessSave)
		if endless == null or endless.session.mode != "endless": return false
	if value.has("powerTutorialsSeen"):
		if not value.powerTutorialsSeen is Array or value.powerTutorialsSeen.size() > 3: return false
		for power in value.powerTutorialsSeen:
			if power not in CampaignRules.POWERS or value.powerTutorialsSeen.count(power) != 1: return false
	if not value.get("settings") is Dictionary: return false
	for key in ["sound", "haptics", "reducedMotion"]:
		if not value.settings.get(key) is bool: return false
	if value.settings.get("theme") not in ["aurora", "ember", "arctic", "neon", "midnight", "solar"]: return false
	if not value.get("economy") is Dictionary: return false
	var economy: Dictionary = value.economy
	for key in ["collection", "pass", "energy"]:
		if not economy.get(key) is Dictionary: return false
	var collection: Dictionary = economy.collection
	for key in ["shards", "chests", "keys", "keyProgress", "lifeTokens", "opened", "sinceEpic"]:
		var cap: int = {"shards": 99999, "chests": 999, "keys": 999, "keyProgress": 4, "lifeTokens": 99, "opened": 1000000000, "sinceEpic": 9}[key]
		if not CampaignRules.integer(collection.get(key), 0, cap): return false
	var skin_ids: Array = catalog.skins.map(func(s: Dictionary) -> String: return s.id)
	if not valid_ids(collection.get("ownedSkins"), skin_ids, "classic"): return false
	if value.settings.get("skin") not in collection.ownedSkins: return false
	if not valid_ids(collection.get("ownedThemes"), ["aurora", "ember", "arctic", "neon", "midnight", "solar"], "aurora"): return false
	if not CampaignRules.integer(economy.energy.get("amount"), 0, 99) or not CampaignRules.integer(economy.energy.get("updatedAt"), 0, 9007199254740991): return false
	if economy.pass.get("season") != "S1-CAMINOS" or not CampaignRules.integer(economy.pass.get("xp"), 0, 1000000): return false
	if not economy.pass.get("claimed") is Array or economy.pass.claimed.size() > 80: return false
	var claims: Array = []
	for claim in economy.pass.claimed:
		if not claim is String: return false
		var parts: PackedStringArray = claim.split(":")
		if parts.size() != 2 or parts[0] not in ["free", "premium"] or not parts[1].is_valid_int() or int(parts[1]) < 1 or int(parts[1]) > 40 or int(parts[1]) * 100 > economy.pass.xp or claim in claims: return false
		claims.append(claim)
	if not value.get("events") is Dictionary: return false
	var events: Dictionary = value.events
	if not CampaignRules.integer(events.get("stamps"), 0, 99999) or not CampaignRules.integer(events.get("earned"), 0, 99999) or events.stamps > events.earned: return false
	if not valid_ids(events.get("ownedWorlds"), catalog.worlds.map(func(w: Dictionary) -> String: return w.id), "void"): return false
	if value.settings.get("world") not in events.ownedWorlds: return false
	if not value.get("stats") is Dictionary: return false
	for key in ["played", "wins", "flawless", "totalPlayMs", "arrowsCleared", "bestCombo", "mastered"]:
		if not LevelGenerator.number(value.stats.get(key)) or value.stats[key] < 0: return false
		if key != "totalPlayMs" and value.stats[key] != int(value.stats[key]): return false
	if value.stats.flawless > value.stats.wins or value.stats.wins > value.stats.played or value.stats.mastered > value.stats.flawless: return false
	if not value.get("daily") is Dictionary or not value.daily.get("records") is Dictionary or value.daily.records.size() > 10000: return false
	for key in ["streak", "bestStreak", "completedDays"]:
		if not CampaignRules.integer(value.daily.get(key), 0): return false
	for date in value.daily.records:
		var record: Variant = value.daily.records[date]
		if not valid_date(date) or not record is Dictionary or not record.get("completed") is bool or not CampaignRules.integer(record.get("attempts"), 1): return false
		if not LevelGenerator.number(record.get("lastTimeMs")) or record.lastTimeMs < 0 or not CampaignRules.integer(record.get("lastErrors"), 0, 3) or record.get("lastResult") not in ["won", "lost"]: return false
		if record.completed:
			if not LevelGenerator.number(record.get("bestTimeMs")) or record.bestTimeMs < 0 or not CampaignRules.integer(record.get("bestErrors"), 0, 2): return false
		elif record.get("bestTimeMs") != null or record.get("bestErrors") != null: return false
	if value.daily.get("lastCompleted") != null and not valid_date(value.daily.lastCompleted): return false
	return true

static func valid_date(value: Variant) -> bool:
	if not value is String or value.length() != 10 or value[4] != "-" or value[7] != "-": return false
	if not value.substr(0, 4).is_valid_int() or not value.substr(5, 2).is_valid_int() or not value.substr(8, 2).is_valid_int(): return false
	var year := int(value.substr(0, 4)); var month := int(value.substr(5, 2)); var day := int(value.substr(8, 2))
	if year < 1970 or year > 9999 or month < 1 or month > 12 or day < 1: return false
	var days := [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
	return day <= days[month - 1]

static func valid_ids(value: Variant, choices: Array, required: String) -> bool:
	if not value is Array or value.size() > choices.size() or required not in value: return false
	var seen: Array = []
	for id in value:
		if id not in choices or id in seen: return false
		seen.append(id)
	return true

func read_envelope(path: String) -> Dictionary:
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null or file.get_length() > MAX_BYTES: return {}
	var parser := JSON.new()
	if parser.parse(file.get_as_text()) != OK or not parser.data is Dictionary: return {}
	var envelope: Dictionary = parser.data
	if not CampaignRules.integer(envelope.get("generation"), 1) or not valid_profile(envelope.get("profile")): return {}
	return envelope

func load_profile() -> void:
	var existed := false; var invalid := false
	for slot in slots:
		if not FileAccess.file_exists(slot): continue
		existed = true
		var envelope := read_envelope(slot)
		if envelope.is_empty(): invalid = true; continue
		if envelope.generation > generation:
			generation = int(envelope.generation); profile = envelope.profile
	if existed and generation == 0:
		protected = true; message = "Guardado ilegible: originales conservados. Importa una copia válida para recuperar."
	elif invalid:
		message = "Se recuperó la generación anterior; puede faltar la última acción."

func save() -> bool:
	if protected: return false
	if not valid_profile(profile):
		message = "Perfil inválido. No se ha sobrescrito la copia guardada."
		return false
	var next := generation + 1
	var target: String = slots[next % 2]
	var temp := target + ".tmp"
	var file := FileAccess.open(temp, FileAccess.WRITE)
	if file == null:
		message = "No se pudo guardar; no cierres la aplicación."
		return false
	file.store_string(JSON.stringify({"generation": next, "profile": profile}))
	file.flush()
	var error := file.get_error(); file.close()
	if error != OK or read_envelope(temp).is_empty() or DirAccess.rename_absolute(temp, target) != OK:
		message = "No se pudo confirmar el guardado; no cierres la aplicación."
		return false
	generation = next; message = ""
	return true

func preview_import(text: String) -> String:
	pending_import = {}
	if text.to_utf8_buffer().size() > MAX_BYTES: return "Copia demasiado grande."
	var parser := JSON.new()
	if parser.parse(text) != OK: return "JSON dañado."
	var value: Variant = parser.data
	if value is Dictionary and value.get("schema") == 1:
		if not valid_classic(value): return "Perfil clásico incompatible o inválido. No se ha escrito nada."
		pending_import = fresh_profile(); pending_import.classic = value.duplicate(true)
		pending_import.endlessSave = value.get("endlessSave")
	elif valid_profile(value): pending_import = value.duplicate(true)
	else: return "Formato o versión incompatible. No se ha escrito nada."
	var c: Dictionary = pending_import.classic
	return "Nivel %d · intento %s\n%d skins · %d fondos\nCofres %d · llaves %d · fragmentos %d\n%d premios reclamados · ajustes\nReemplaza SOLO el perfil Godot; la generación anterior se conserva. No importa compras ni derechos comerciales." % [c.level, "sí" if c.classicSave != null else "no", c.economy.collection.ownedSkins.size(), c.events.ownedWorlds.size(), c.economy.collection.chests, c.economy.collection.keys, c.economy.collection.shards, c.economy.pass.claimed.size()]

func confirm_import() -> bool:
	if pending_import.is_empty(): return false
	var previous := profile; var was_protected := protected
	profile = pending_import.duplicate(true); protected = false
	if not save():
		profile = previous; protected = was_protected; return false
	pending_import = {}
	return true

func regenerate_energy() -> void:
	var energy: Dictionary = profile.classic.economy.energy
	var now := int(Time.get_unix_time_from_system() * 1000)
	if now < energy.updatedAt or energy.amount >= 5: return
	var ticks := int((now - energy.updatedAt) / 600000)
	if ticks < 1: return
	energy.amount = mini(5, energy.amount + ticks)
	energy.updatedAt = now if energy.amount == 5 else energy.updatedAt + ticks * 600000

func spend_energy() -> bool:
	regenerate_energy()
	var energy: Dictionary = profile.classic.economy.energy
	if energy.amount < 1: return false
	if energy.amount >= 5: energy.updatedAt = maxi(energy.updatedAt, int(Time.get_unix_time_from_system() * 1000))
	energy.amount -= 1
	return true

func record_result(game: CampaignRules) -> void:
	var session: Dictionary = game.session
	if session.recorded or not game.finished(): return
	session.recorded = true
	if session.mode == "endless": return
	var c: Dictionary = profile.classic
	var won: bool = session.state.status == "won"
	var first_classic: bool = won and session.mode == "classic" and session.level >= c.level
	var date: String = session.get("date") if session.get("date") != null else ""
	var previous: Dictionary = c.daily.records.get(date, {})
	var first_daily: bool = won and session.mode == "daily" and not previous.get("completed", false)
	if won:
		if session.get("energySpent", false) and session.get("energyPolicy", "legacy") != "attempt-v2":
			regenerate_energy(); c.economy.energy.amount = mini(99, c.economy.energy.amount + 1)
		c.stats.wins += 1
		if session.state.errors == 0: c.stats.flawless += 1
		if game.stars() == 3: c.stats.mastered += 1
		if int(c.stats.wins) % 3 == 0: c.hints = mini(99, c.hints + 1)
	if first_classic or first_daily:
		c.economy.pass.xp = mini(1000000, c.economy.pass.xp + (100 if first_classic else 150) + (25 if session.state.errors == 0 else 0))
		var collection: Dictionary = c.economy.collection
		if first_classic and int(session.level) % 15 == 0: collection.chests = mini(999, collection.chests + 1)
		if collection.keys < 999:
			collection.keyProgress += 1
			if collection.keyProgress == 5: collection.keyProgress = 0; collection.keys += 1
		var stamps := 1 if first_classic else 2
		c.events.stamps = mini(99999, c.events.stamps + stamps); c.events.earned = mini(99999, c.events.earned + stamps)
	if first_classic: c.level = session.level + 1
	if session.mode == "daily":
		var improves: bool = won and (previous.get("bestErrors") == null or session.state.errors < previous.bestErrors or session.state.errors == previous.bestErrors and session.elapsedMs < previous.bestTimeMs)
		c.daily.records[date] = {"attempts": previous.get("attempts", 0) + 1, "completed": won or previous.get("completed", false), "bestErrors": session.state.errors if improves else previous.get("bestErrors"), "bestTimeMs": session.elapsedMs if improves else previous.get("bestTimeMs"), "lastTimeMs": session.elapsedMs, "lastErrors": session.state.errors, "lastResult": "won" if won else "lost"}
		if first_daily:
			c.daily.completedDays += 1
			if c.daily.lastCompleted == null or date > c.daily.lastCompleted:
				var yesterday := Time.get_date_string_from_unix_time(int(Time.get_unix_time_from_datetime_string(date + "T00:00:00")) - 86400)
				c.daily.streak = c.daily.streak + 1 if c.daily.lastCompleted == yesterday else 1
				c.daily.bestStreak = maxi(c.daily.bestStreak, c.daily.streak); c.daily.lastCompleted = date

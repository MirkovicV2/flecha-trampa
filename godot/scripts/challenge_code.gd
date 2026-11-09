class_name ChallengeCode
extends RefCounted

static func encode(seed_text: String, config: Dictionary) -> String:
	# Field order is the canonical classic JS order, independent of Dictionary sorting.
	var canonical := {"schema": 1, "generator": "inverse-v1", "seed": seed_text, "config": {"width": int(config.width), "height": int(config.height), "density": config.density, "complexity": config.complexity}}
	if config.get("shape", "square") != "square": canonical.config.shape = config.shape
	if config.has("tuning"): canonical.config.tuning = config.tuning
	var payload := Marshalls.raw_to_base64(JSON.stringify(canonical, "", false).to_utf8_buffer()).replace("+", "-").replace("/", "_").replace("=", "")
	return "%s.%s.%08x" % ["FT3" if config.has("tuning") else ("FT2" if canonical.config.has("shape") else "FT1"), payload, LevelGenerator.hash_seed(payload)]

static func decode(code: String) -> Dictionary:
	if code.length() > 2048: return {}
	var parts := code.split(".")
	if parts.size() != 3 or parts[0] not in ["FT1", "FT2", "FT3"] or parts[2] != "%08x" % LevelGenerator.hash_seed(parts[1]): return {}
	var payload := parts[1].replace("-", "+").replace("_", "/")
	while payload.length() % 4 != 0: payload += "="
	var parser := JSON.new()
	if parser.parse(Marshalls.base64_to_raw(payload).get_string_from_utf8()) != OK: return {}
	var value: Variant = parser.data
	if not value is Dictionary or value.get("schema") != 1 or value.get("generator") != "inverse-v1" or not LevelGenerator.valid_config(value.get("config")): return {}
	if not value.get("seed") is String or value.seed.strip_edges().is_empty() or value.seed.length() > 128: return {}
	var version := "FT3" if value.config.has("tuning") else ("FT2" if value.config.get("shape", "square") != "square" else "FT1")
	if parts[0] != version: return {}
	return value

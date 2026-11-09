extends SceneTree
func _initialize() -> void:
	var fixtures: Array = JSON.parse_string(FileAccess.get_file_as_string("res://data/generator-fixtures.json"))
	var f: Dictionary = fixtures[0]
	print("CONFIG ", LevelGenerator.config_for_level(1), " EXPECTED ", f.config)
	print("BOARD ", JSON.stringify(LevelGenerator.new().generate(f.seed, f.config)))
	print("EXPECTED ", JSON.stringify(f.board))
	var store := ProfileStore.new()
	print("CLASSIC ", store.valid_classic(store.profile.classic))
	var game := CampaignRules.create(1, "classic:fixture:1", LevelGenerator.config_for_level(1))
	print("NEW RESTORE ", CampaignRules.restore(game.session), " ", JSON.stringify(game.session))
	store.profile.classic.classicSave = game.session
	print("NEW PROFILE ", store.valid_profile(store.profile))
	print("PASS ", store.profile.classic.economy.pass)
	for fixture in fixtures:
		var code := ChallengeCode.encode(fixture.seed, fixture.config)
		print("CODE ", fixture.level, " ", JSON.stringify(ChallengeCode.decode(code)))
	quit()

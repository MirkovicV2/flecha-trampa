extends SceneTree
func _initialize() -> void:
	var file := FileAccess.open("res://data/engine-licenses.json", FileAccess.WRITE)
	file.store_string(JSON.stringify({"engine": Engine.get_version_info(), "license": Engine.get_license_text(), "copyright": Engine.get_copyright_info(), "thirdPartyLicenses": Engine.get_license_info()}, "  ") + "\n")
	file.close()
	print("Exported license and font notices from installed Godot binary.")
	quit()

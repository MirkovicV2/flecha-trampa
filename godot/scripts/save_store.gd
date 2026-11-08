class_name DemoSaveStore
extends RefCounted

# Separate Godot user directory and keys. Never open Capacitor/Classic storage.
const SLOTS := ["user://hybrid-demo-a.json", "user://hybrid-demo-b.json"]
var slots: Array = SLOTS.duplicate()
var generation := 0
var message := ""
var protected := false

func load_game() -> DemoRules:
	var best: DemoRules = null
	var existed := false
	var invalid := false
	for slot in slots:
		if not FileAccess.file_exists(slot):
			continue
		existed = true
		var file := FileAccess.open(slot, FileAccess.READ)
		if file == null or file.get_length() > 16384:
			invalid = true
			continue
		var parser := JSON.new()
		if parser.parse(file.get_as_text()) != OK:
			invalid = true
			continue
		var envelope: Variant = parser.data
		if not envelope is Dictionary:
			invalid = true
			continue
		var seq: Variant = envelope.get("generation")
		if not (seq is float or seq is int) or seq != int(seq) or seq < 1 or seq > 1000000000:
			invalid = true
			continue
		var candidate := DemoRules.restore(envelope.get("game"))
		if candidate == null:
			invalid = true
		if candidate != null and int(seq) > generation:
			generation = int(seq)
			best = candidate
	if existed and best == null:
		protected = true
		message = "Guardado demo ilegible. Se conserva; reiniciar requiere confirmación."
	elif invalid:
		message = "Se recuperó una copia válida de la demo; puede faltar la última jugada."
	return best

func save_game(game: DemoRules) -> bool:
	if protected:
		return false
	var next := generation + 1
	var target: String = slots[next % 2]
	var temporary := target + ".tmp"
	var file := FileAccess.open(temporary, FileAccess.WRITE)
	if file == null:
		message = "No se pudo guardar. El intento sigue en memoria; no cierres la app."
		return false
	file.store_string(JSON.stringify({"generation": next, "game": game.snapshot()}))
	file.flush()
	var error := file.get_error()
	file.close()
	if error != OK or DirAccess.rename_absolute(temporary, target) != OK:
		message = "No se pudo confirmar el guardado. No cierres la app."
		return false
	generation = next
	message = ""
	return true

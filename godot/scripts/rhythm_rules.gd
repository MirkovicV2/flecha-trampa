class_name RhythmRules
extends RefCounted

const THRESHOLDS := [2, 4, 7, 10, 15]
const TITLES := ["En racha", "Acelerando", "Frenesí", "Imparable", "Leyenda"]
var notes: Array = []
var score := 0
var combo := 0
var best_combo := 0
var misses := 0
var empty := 0
var perfect := 0
var good := 0
var late := 0
var assisted := false
var offset_ms := 0
var track := "intro"
var bpm := 100
var duration := 0.0
var lead := 0.0
var chart_hash := ""

func _init(track_id := "intro", windows := "standard", offset := 0) -> void:
	track = track_id; assisted = windows == "assisted"; offset_ms = offset
	bpm = 150 if track == "fast" else 100
	lead = 3.0 * 60.0 / bpm
	var beats := 192 if track == "fast" else (8 if track == "tutorial" else 128)
	for beat in range(beats):
		if track == "tutorial" and beat % 2 != 0: continue
		var lane := (beat * 3 + int(beat / 4)) % 4
		notes.append({"time": lead + beat * 60.0 / bpm, "lane": lane, "judged": false})
		if track == "fast" and beat % 4 != 3:
			notes.append({"time": lead + (beat + 0.5) * 60.0 / bpm, "lane": (lane + 1) % 4, "judged": false})
		if track != "tutorial" and beat % (8 if track == "fast" else 16) == 7:
			notes.append({"time": lead + beat * 60.0 / bpm, "lane": (lane + 2) % 4, "judged": false})
	duration = lead + beats * 60.0 / bpm + 1
	chart_hash = JSON.stringify(notes).sha256_text()

func windows() -> Array:
	return [65.0, 120.0, 180.0] if assisted else [45.0, 90.0, 140.0]

func hit(lane: int, audio_seconds: float) -> Dictionary:
	var now := audio_seconds * 1000 - offset_ms
	var closest := -1; var error := INF
	for i in range(notes.size()):
		if notes[i].judged or notes[i].lane != lane: continue
		var candidate := absf(now - notes[i].time * 1000)
		if candidate < error:
			error = candidate; closest = i
	var limits := windows()
	if closest < 0 or error > limits[2] + 0.000001:
		empty += 1; combo = 0
		return {"message": "Fuera de pulso", "hit": false, "celebration": ""}
	notes[closest].judged = true
	combo += 1; best_combo = maxi(best_combo, combo)
	var judgment := 0 if error <= limits[0] + 0.000001 else (1 if error <= limits[1] + 0.000001 else 2)
	score += [1000, 600, 300][judgment]
	if judgment == 0: perfect += 1
	elif judgment == 1: good += 1
	else: late += 1
	var index := THRESHOLDS.find(combo)
	return {"message": ["¡Perfecto!", "Bien", "A tiempo"][judgment], "hit": true, "celebration": TITLES[index] if index >= 0 else ""}

func expire(audio_seconds: float) -> int:
	var count := 0
	for note in notes:
		# Inclusive boundary belongs to a valid touch; strictly later expires once.
		if not note.judged and audio_seconds * 1000 - offset_ms - note.time * 1000 > windows()[2] + 0.000001:
			note.judged = true; misses += 1; count += 1; combo = 0
	return count

func result() -> Dictionary:
	return {"score": score, "accuracy": 100.0 * (perfect + 0.6 * good + 0.3 * late) / maxf(1, notes.size() + empty), "bestCombo": best_combo, "misses": misses, "empty": empty}

func record_key() -> String:
	return "%s:v1:%s:%s" % [track, chart_hash.substr(0, 16), "assisted" if assisted else "standard"]

class_name ArcadeAudio
extends Node

var music := AudioStreamPlayer.new()
var effect := AudioStreamPlayer.new()
var cached: Dictionary = {}
var last_clock := 0.0
var frozen := 0.0
var paused := false
var hit_tone: AudioStreamWAV
var victory_tone: AudioStreamWAV
var defeat_tone: AudioStreamWAV

func _ready() -> void:
	add_child(music); add_child(effect)
	hit_tone = tone(880, 0.07); victory_tone = tone(1320, 0.24); defeat_tone = tone(220, 0.2)
	effect.stream = hit_tone

func configure(settings: Dictionary, enabled: bool) -> void:
	music.volume_db = linear_to_db(maxf(0.00001, settings.music)) if enabled else -80
	effect.volume_db = linear_to_db(maxf(0.00001, settings.effects)) if enabled else -80

static func tone(hz: float, seconds: float) -> AudioStreamWAV:
	var bytes := PackedByteArray(); bytes.resize(int(seconds * 22050) * 2)
	for i in range(int(seconds * 22050)):
		var t := float(i) / 22050
		bytes.encode_s16(i * 2, int(sin(TAU * hz * t) * exp(-t * 45) * 5000))
	var stream := AudioStreamWAV.new(); stream.format = AudioStreamWAV.FORMAT_16_BITS; stream.mix_rate = 22050; stream.data = bytes
	return stream

func make_song(rules: RhythmRules) -> AudioStreamWAV:
	if cached.has(rules.track): return cached[rules.track]
	var count := int((rules.duration + 0.5) * 22050)
	var data := PackedByteArray(); data.resize(count * 2)
	var melody := [0, 7, 12, 10, 3, 7, 15, 12]
	for i in range(count):
		var t := float(i) / 22050
		var beat := t * rules.bpm / 60
		var phase := fmod(beat, 1.0) * 60 / rules.bpm
		var half := fmod(beat, 0.5) * 60 / rules.bpm
		var hz: float = 220 * pow(2.0, melody[int(beat) % 8] / 12.0)
		var kick := sin(TAU * (48 * phase + 1.5 * (1 - exp(-phase * 40)))) * exp(-phase * 20) * 0.28
		var bass := sin(TAU * hz * 0.25 * t) * exp(-phase * 5) * 0.15
		var lead_tone := (sin(TAU * hz * t) + 0.25 * sin(TAU * hz * 2 * t)) * exp(-half * 18) * 0.13
		var hat := sin(TAU * 6971 * t) * sin(TAU * 3121 * t) * exp(-half * 100) * 0.07
		var fade := minf(1, maxf(0, rules.duration - t))
		data.encode_s16(i * 2, int(clampf((kick + bass + lead_tone + hat) * fade, -1, 1) * 30000))
	var stream := AudioStreamWAV.new(); stream.format = AudioStreamWAV.FORMAT_16_BITS; stream.mix_rate = 22050; stream.data = data
	cached[rules.track] = stream
	return stream

func start(rules: RhythmRules) -> void:
	music.stop(); music.stream = make_song(rules)
	paused = false; last_clock = 0; frozen = 0; music.stream_paused = false; music.play()

func clock_seconds() -> float:
	if paused: return frozen
	if not music.playing: return last_clock
	var time := music.get_playback_position() + AudioServer.get_time_since_last_mix() - AudioServer.get_output_latency()
	last_clock = maxf(last_clock, maxf(0, time))
	return last_clock

func pause_song() -> void:
	frozen = clock_seconds(); paused = true; music.stream_paused = true

func resume_song() -> void:
	# Seek the audible position so buffered output never advances a paused note.
	music.seek(frozen); last_clock = frozen; music.stream_paused = false; paused = false

func stop() -> void:
	music.stop(); paused = false

func confirm_sound(success := true) -> void:
	effect.stream = hit_tone
	effect.pitch_scale = 1.0 if success else 0.5
	effect.play()

func result_sound(success := true) -> void:
	effect.stream = victory_tone if success else defeat_tone
	effect.pitch_scale = 1.0; effect.play()

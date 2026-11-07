import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import type { PlayerSettings } from '../config/theme';
import type { Rarity } from '../config/collection';

/** Original sounds synthesized locally; no external audio assets or network requests. */
export class FeedbackService {
  private context: AudioContext | null = null;
  private readonly chestVoices = new Set<OscillatorNode>();

  stopChest(): void {
    for (const voice of this.chestVoices) {
      try {
        voice.stop();
      } catch {
        /* A completed voice is already silent. */
      }
    }
    this.chestVoices.clear();
  }

  chest(kind: 'unlock' | 'tick' | 'reveal', settings: PlayerSettings, rarity: Rarity): void {
    if (typeof document !== 'undefined' && document.hidden) return;
    if (settings.haptics && kind !== 'tick') {
      if (Capacitor.isNativePlatform()) {
        void Haptics.impact({
          style:
            kind === 'unlock'
              ? ImpactStyle.Light
              : rarity === 'legendary'
                ? ImpactStyle.Heavy
                : ImpactStyle.Medium,
        }).catch(() => undefined);
      } else if (typeof navigator.vibrate === 'function') {
        navigator.vibrate(kind === 'unlock' ? 14 : rarity === 'legendary' ? [20, 35, 45] : 24);
      }
    }
    if (!settings.sound) return;
    try {
      this.context ??= new AudioContext();
      const context = this.context;
      void context.resume().catch(() => undefined);
      const notes =
        kind === 'tick'
          ? [920]
          : kind === 'unlock'
            ? [190, 285, 420]
            : rarity === 'legendary'
              ? [261.63, 392, 523.25, 659.25, 783.99]
              : rarity === 'epic'
                ? [293.66, 440, 587.33, 739.99]
                : [329.63, 440, 659.25];
      notes.forEach((frequency, i) => {
        const voice = context.createOscillator();
        const gain = context.createGain();
        const filter = context.createBiquadFilter();
        const start = context.currentTime + (kind === 'tick' ? 0 : i * 0.055);
        const duration = kind === 'tick' ? 0.032 : kind === 'unlock' ? 0.11 : 0.7;
        voice.type = kind === 'reveal' ? 'sine' : 'triangle';
        voice.frequency.setValueAtTime(frequency, start);
        voice.frequency.exponentialRampToValueAtTime(
          frequency * (kind === 'tick' ? 0.45 : kind === 'unlock' ? 0.7 : 1.002),
          start + duration,
        );
        filter.type = 'lowpass';
        filter.frequency.value = kind === 'tick' ? 2100 : 3400;
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(kind === 'tick' ? 0.045 : 0.055, start + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        voice.connect(filter);
        filter.connect(gain);
        gain.connect(context.destination);
        this.chestVoices.add(voice);
        voice.onended = () => {
          this.chestVoices.delete(voice);
          voice.disconnect();
          filter.disconnect();
          gain.disconnect();
        };
        voice.start(start);
        voice.stop(start + duration + 0.01);
      });
    } catch {
      /* Sound is optional, including on devices with unavailable audio contexts. */
    }
  }

  play(kind: 'tap' | 'blocked' | 'win', settings: PlayerSettings, combo = 0): void {
    if (settings.haptics) {
      if (Capacitor.isNativePlatform()) {
        void Haptics.impact({
          style:
            kind === 'blocked' || (kind === 'tap' && [4, 7, 10, 15].includes(combo))
              ? ImpactStyle.Medium
              : ImpactStyle.Light,
        }).catch(() => undefined);
      } else if (typeof navigator.vibrate === 'function') {
        navigator.vibrate(
          kind === 'blocked' ? [30, 30, 30] : kind === 'tap' && combo >= 7 ? 20 : 12,
        );
      }
    }
    if (!settings.sound) return;
    try {
      this.context ??= new AudioContext();
      const context = this.context;
      void context.resume().catch(() => undefined);
      const notes =
        kind === 'win'
          ? [523.25, 659.25, 783.99, 1046.5]
          : kind === 'blocked'
            ? [150, 110]
            : combo >= 7
              ? [540, 760, 1080]
              : [540, 760];
      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const time = context.currentTime + index * 0.075;
        oscillator.type =
          kind === 'blocked' || (kind === 'tap' && combo >= 7) ? 'triangle' : 'sine';
        oscillator.frequency.value =
          frequency * (kind === 'tap' ? 1 + Math.min(combo, 10) * 0.045 : 1);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(kind === 'tap' ? 0.04 : 0.055, time + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(time);
        oscillator.stop(time + 0.21);
      });
    } catch {
      /* Audio can be unavailable in embedded browsers. Gameplay remains available. */
    }
  }
}

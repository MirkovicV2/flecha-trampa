import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import type { PlayerSettings } from '../config/theme';

/** Original sounds synthesized locally; no external audio assets or network requests. */
export class FeedbackService {
  private context: AudioContext | null = null;

  play(kind: 'tap' | 'blocked' | 'win', settings: PlayerSettings): void {
    if (settings.haptics) {
      if (Capacitor.isNativePlatform()) {
        void Haptics.impact({
          style: kind === 'blocked' ? ImpactStyle.Medium : ImpactStyle.Light,
        }).catch(() => undefined);
      } else if (typeof navigator.vibrate === 'function') {
        navigator.vibrate(kind === 'blocked' ? [30, 30, 30] : 12);
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
            : [540, 760];
      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const time = context.currentTime + index * 0.075;
        oscillator.type = kind === 'blocked' ? 'triangle' : 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.055, time + 0.01);
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

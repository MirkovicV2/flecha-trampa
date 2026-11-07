import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import type { PlayerSettings } from '../config/theme';

/** Original sounds synthesized locally; no external audio assets or network requests. */
export class FeedbackService {
  private context: AudioContext | null = null;

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

import type { Direction } from '../core/types';

export type ThemeName = 'aurora' | 'ember';
export const ARROW_COLORS: Record<ThemeName, Record<Direction, number>> = {
  aurora: { up: 0xd6ff89, right: 0xb9a5ff, down: 0xffa18b, left: 0x87dce8 },
  ember: { up: 0xffd581, right: 0xffa18b, down: 0xeea7df, left: 0xa8d5ba },
};

export interface PlayerSettings {
  sound: boolean;
  haptics: boolean;
  reducedMotion: boolean;
  theme: ThemeName;
}

export const DEFAULT_SETTINGS: PlayerSettings = { sound: false, haptics: true, reducedMotion: false, theme: 'aurora' };

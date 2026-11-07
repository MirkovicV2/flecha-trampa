import type { Direction } from '../core/types';
import type { SkinId } from './collection';

export const THEME_NAMES = ['aurora', 'ember', 'arctic', 'neon', 'midnight', 'solar'] as const;
export type ThemeName = (typeof THEME_NAMES)[number];
export const isThemeName = (value: unknown): value is ThemeName =>
  THEME_NAMES.some((name) => name === value);
export const THEME_LABELS: Record<ThemeName, string> = {
  aurora: 'Aurora',
  ember: 'Atardecer',
  arctic: 'Glaciar',
  neon: 'Neón',
  midnight: 'Medianoche',
  solar: 'Solar',
};
export const FREE_THEMES: readonly ThemeName[] = ['aurora', 'ember', 'arctic', 'neon'];
export const ARROW_COLORS: Record<ThemeName, Record<Direction, number>> = {
  aurora: { up: 0xd6ff89, right: 0xb9a5ff, down: 0xffa18b, left: 0x87dce8 },
  ember: { up: 0xffd581, right: 0xffa18b, down: 0xeea7df, left: 0xa8d5ba },
  arctic: { up: 0xa5edff, right: 0xbdb5ff, down: 0xffbad2, left: 0xd4f9e5 },
  neon: { up: 0xd5ff52, right: 0xff8cde, down: 0xffbf66, left: 0x67f6ed },
  midnight: { up: 0xd7cbff, right: 0x89c7ff, down: 0xffa8d8, left: 0x82e8cf },
  solar: { up: 0xffdf7f, right: 0xffb38b, down: 0xf4b4e9, left: 0xbcf0b1 },
};

export interface PlayerSettings {
  sound: boolean;
  haptics: boolean;
  reducedMotion: boolean;
  theme: ThemeName;
  skin: SkinId;
}

export const DEFAULT_SETTINGS: PlayerSettings = {
  sound: false,
  haptics: true,
  reducedMotion: false,
  theme: 'aurora',
  skin: 'classic',
};

export const RARITIES = ['common', 'rare', 'epic', 'legendary'] as const;
export type Rarity = (typeof RARITIES)[number];
export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'Común',
  rare: 'Rara',
  epic: 'Épica',
  legendary: 'Legendaria',
};
export const RARITY_CHANCES: Record<Rarity, number> = {
  common: 60,
  rare: 28,
  epic: 10,
  legendary: 2,
};
export const SKINS = [
  { id: 'classic', name: 'Original', rarity: 'common', shape: 'classic' },
  { id: 'chevron', name: 'Doble filo', rarity: 'common', shape: 'double' },
  { id: 'vector', name: 'Voltaje', rarity: 'rare', shape: 'bolt' },
  { id: 'pixel', name: 'Arcade', rarity: 'rare', shape: 'pixel' },
  { id: 'prism', name: 'Prisma', rarity: 'epic', shape: 'diamond' },
  { id: 'orbit', name: 'Órbita', rarity: 'epic', shape: 'orbit' },
  { id: 'royal', name: 'Corona solar', rarity: 'legendary', shape: 'royal' },
  { id: 'nova', name: 'Supernova', rarity: 'legendary', shape: 'nova' },
] as const;
export type SkinId = (typeof SKINS)[number]['id'];
export type SkinShape = (typeof SKINS)[number]['shape'];
export const isSkinId = (value: unknown): value is SkinId =>
  SKINS.some((skin) => skin.id === value);
export const SKIN_COST: Record<Rarity, number> = { common: 5, rare: 15, epic: 40, legendary: 120 };
export const DUPLICATE_SHARDS: Record<Rarity, number> = {
  common: 2,
  rare: 5,
  epic: 12,
  legendary: 30,
};

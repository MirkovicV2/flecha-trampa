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
  { id: 'lance', name: 'Lanza', rarity: 'common', shape: 'lance' },
  { id: 'anchor', name: 'Ancla', rarity: 'common', shape: 'anchor' },
  { id: 'wing', name: 'Ala delta', rarity: 'common', shape: 'wing' },
  { id: 'rivet', name: 'Remache', rarity: 'common', shape: 'rivet' },
  { id: 'needle', name: 'Aguja', rarity: 'common', shape: 'needle' },
  { id: 'kite', name: 'Cometa', rarity: 'common', shape: 'kite' },
  { id: 'frost', name: 'Escarcha', rarity: 'rare', shape: 'frost' },
  { id: 'ember', name: 'Ascua', rarity: 'rare', shape: 'ember' },
  { id: 'ronin', name: 'Ronin', rarity: 'rare', shape: 'ronin' },
  { id: 'circuit', name: 'Circuito', rarity: 'rare', shape: 'circuit' },
  { id: 'petal', name: 'Flor de acero', rarity: 'rare', shape: 'petal' },
  { id: 'tide', name: 'Marea', rarity: 'rare', shape: 'tide' },
  { id: 'glacier', name: 'Cero absoluto', rarity: 'epic', shape: 'glacier' },
  { id: 'inferno', name: 'Caldera', rarity: 'epic', shape: 'inferno' },
  { id: 'shogun', name: 'Shogun', rarity: 'epic', shape: 'shogun' },
  { id: 'hologram', name: 'Espectro', rarity: 'epic', shape: 'hologram' },
  { id: 'sakura', name: 'Sakura', rarity: 'epic', shape: 'sakura' },
  { id: 'abyss', name: 'Abisal', rarity: 'epic', shape: 'abyss' },
  { id: 'harvest', name: 'Noche de brujas', rarity: 'epic', shape: 'harvest' },
  { id: 'noel', name: 'Solsticio', rarity: 'epic', shape: 'noel' },
  { id: 'phoenix', name: 'Fénix', rarity: 'legendary', shape: 'phoenix' },
  { id: 'eclipse', name: 'Eclipse', rarity: 'legendary', shape: 'eclipse' },
  { id: 'dragon', name: 'Dragón imperial', rarity: 'legendary', shape: 'dragon' },
  { id: 'aurora', name: 'Aurora boreal', rarity: 'legendary', shape: 'aurora' },
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

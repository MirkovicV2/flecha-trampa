export const WORLDS = [
  {
    id: 'void',
    name: 'Espacio original',
    event: 'ESENCIAL',
    description: 'Tu punto de partida. Todo el protagonismo para las flechas.',
    cost: 0,
    accent: '#d6ff89',
  },
  {
    id: 'christmas',
    name: 'Noche de Navidad',
    event: 'COLECCIÓN INVIERNO',
    description: 'Nieve, abetos iluminados y una aurora sobre el pueblo.',
    cost: 1,
    accent: '#8ff5db',
  },
  {
    id: 'halloween',
    name: 'Medianoche encantada',
    event: 'COLECCIÓN HALLOWEEN',
    description: 'Calabazas, niebla violeta y un castillo bajo la luna.',
    cost: 3,
    accent: '#ffc078',
  },
  {
    id: 'sakura',
    name: 'Jardín de sakura',
    event: 'COLECCIÓN PRIMAVERA',
    description: 'Pétalos de cerezo y montañas al caer la tarde.',
    cost: 5,
    accent: '#ffb6d4',
  },
  {
    id: 'arcade',
    name: 'Distrito neón',
    event: 'EVENTO ARCADE',
    description: 'Un horizonte eléctrico de luces y velocidad.',
    cost: 8,
    accent: '#81f7ff',
  },
  {
    id: 'ocean',
    name: 'Abismo de cristal',
    event: 'COLECCIÓN OCÉANO',
    description: 'Arrecifes luminosos y vida bajo el agua.',
    cost: 10,
    accent: '#80ffe2',
  },
  {
    id: 'lanterns',
    name: 'Festival de faroles',
    event: 'FESTIVAL LUNAR',
    description: 'Faroles dorados ascendiendo sobre las montañas.',
    cost: 12,
    accent: '#ffdc8a',
  },
] as const;

export type WorldId = (typeof WORLDS)[number]['id'];
export const isWorldId = (value: unknown): value is WorldId =>
  WORLDS.some((world) => world.id === value);
export const WORLD_NAMES = WORLDS.map((world) => world.id);

export interface EventCollection {
  stamps: number;
  earned: number;
  ownedWorlds: WorldId[];
}

export const defaultEvents = (): EventCollection => ({
  stamps: 1,
  earned: 1,
  ownedWorlds: ['void'],
});

import type { SkinId } from './collection';

export type Point = readonly [number, number];
export type Ink = 'body' | 'edge' | 'shade' | 'accent';
export interface ArrowLayer {
  points: readonly Point[];
  fill?: Ink;
  stroke?: Ink;
  width?: number;
  opacity?: number;
}
export type ExitStyle =
  'precision' | 'echo' | 'electric' | 'pixel' | 'prism' | 'orbit' | 'crown' | 'nova';
export interface ArrowDesign {
  baseColor?: number;
  paletteAccent?: boolean;
  serial: string;
  workshop: string;
  finish: string;
  description: string;
  effect: string;
  exit: ExitStyle;
  layers: readonly ArrowLayer[];
}

const face = (points: readonly Point[], fill: Ink = 'body', opacity = 1): ArrowLayer => ({
  points,
  fill,
  opacity,
});
const cut = (
  points: readonly Point[],
  stroke: Ink = 'edge',
  width = 1.4,
  opacity = 0.75,
): ArrowLayer => ({ points, stroke, width, opacity });

/** Original, hand-drawn 100-unit dies. SVG previews and Phaser use these exact layers. */
export const ARROW_DESIGNS: Record<SkinId, ArrowDesign> = {
  classic: {
    serial: 'FT—001',
    workshop: 'STANDARD ISSUE',
    finish: 'Cerámica satinada',
    description:
      'Punta ancha, bisel de luz y un corte limpio en la base. La pieza original, redibujada desde cero.',
    effect: 'Impulso limpio · estela de precisión',
    exit: 'precision',
    layers: [
      face([
        [50, 9],
        [86, 45],
        [65, 45],
        [65, 84],
        [35, 84],
        [35, 45],
        [14, 45],
      ]),
      face(
        [
          [50, 9],
          [50, 33],
          [29, 45],
          [14, 45],
        ],
        'edge',
        0.65,
      ),
      face(
        [
          [50, 33],
          [65, 45],
          [65, 84],
          [57, 84],
          [57, 42],
        ],
        'shade',
        0.45,
      ),
      cut(
        [
          [37, 77],
          [53, 77],
        ],
        'shade',
        2.8,
      ),
      cut(
        [
          [50, 19],
          [72, 41],
        ],
        'edge',
        1.2,
      ),
    ],
  },
  chevron: {
    serial: 'FT—012',
    workshop: 'RAPID DIVISION',
    finish: 'Aluminio mecanizado',
    description:
      'Dos filos independientes y un núcleo abierto. Su doble estela dibuja la trayectoria al salir.',
    effect: 'Doble impulso · ecos paralelos',
    exit: 'echo',
    layers: [
      face([
        [50, 8],
        [87, 40],
        [73, 51],
        [50, 31],
        [27, 51],
        [13, 40],
      ]),
      face([
        [50, 44],
        [80, 69],
        [67, 80],
        [57, 71],
        [57, 92],
        [43, 92],
        [43, 71],
        [33, 80],
        [20, 69],
      ]),
      face(
        [
          [50, 8],
          [50, 18],
          [20, 44],
          [13, 40],
        ],
        'edge',
        0.8,
      ),
      face(
        [
          [50, 44],
          [50, 55],
          [27, 75],
          [20, 69],
        ],
        'edge',
        0.6,
      ),
      cut(
        [
          [54, 59],
          [73, 74],
        ],
        'shade',
        2,
      ),
      cut(
        [
          [48, 77],
          [48, 87],
        ],
        'edge',
        1.5,
      ),
    ],
  },
  vector: {
    serial: 'VX—208',
    workshop: 'STORM LAB',
    finish: 'Carbono electrificado',
    description:
      'Una lanza asimétrica con canales de cobre. La descarga recorre los cortes al abandonar el tablero.',
    effect: 'Descarga quebrada · chispas de cobre',
    exit: 'electric',
    layers: [
      face([
        [56, 6],
        [86, 47],
        [63, 43],
        [72, 70],
        [52, 65],
        [43, 94],
        [36, 58],
        [17, 63],
        [31, 40],
        [17, 44],
      ]),
      face(
        [
          [56, 6],
          [49, 37],
          [31, 40],
          [17, 44],
        ],
        'edge',
        0.8,
      ),
      face(
        [
          [56, 6],
          [86, 47],
          [63, 43],
          [58, 33],
        ],
        'shade',
        0.55,
      ),
      face(
        [
          [49, 35],
          [58, 49],
          [47, 46],
          [53, 67],
          [43, 59],
        ],
        'accent',
      ),
      cut(
        [
          [36, 49],
          [31, 54],
        ],
        'edge',
        2.5,
      ),
      cut(
        [
          [53, 73],
          [48, 86],
        ],
        'edge',
        1.5,
      ),
    ],
  },
  pixel: {
    serial: 'PX—016',
    workshop: '8-BIT FOUNDRY',
    finish: 'Esmalte de 16 bits',
    description:
      'Ocho escalones, contorno oscuro y reflejos pixel a pixel. Se descompone en bloques al salir.',
    effect: 'Dispersión de píxeles · salida escalonada',
    exit: 'pixel',
    layers: [
      face([
        [44, 8],
        [56, 8],
        [56, 20],
        [68, 20],
        [68, 32],
        [80, 32],
        [80, 44],
        [92, 44],
        [92, 56],
        [62, 56],
        [62, 92],
        [38, 92],
        [38, 56],
        [8, 56],
        [8, 44],
        [20, 44],
        [20, 32],
        [32, 32],
        [32, 20],
        [44, 20],
      ]),
      face(
        [
          [44, 8],
          [51, 8],
          [51, 26],
          [39, 26],
          [39, 38],
          [27, 38],
          [27, 50],
          [8, 50],
          [8, 44],
          [20, 44],
          [20, 32],
          [32, 32],
          [32, 20],
          [44, 20],
        ],
        'edge',
        0.85,
      ),
      face(
        [
          [56, 20],
          [63, 20],
          [63, 37],
          [75, 37],
          [75, 49],
          [92, 49],
          [92, 56],
          [62, 56],
          [62, 92],
          [55, 92],
          [55, 49],
          [68, 49],
          [68, 42],
          [56, 42],
        ],
        'shade',
        0.5,
      ),
      face(
        [
          [42, 65],
          [49, 65],
          [49, 72],
          [42, 72],
        ],
        'accent',
      ),
      face(
        [
          [42, 78],
          [49, 78],
          [49, 85],
          [42, 85],
        ],
        'edge',
        0.6,
      ),
    ],
  },
  prism: {
    serial: 'PR—404',
    workshop: 'OPTICAL SERIES',
    finish: 'Cristal tallado',
    description:
      'Una punta de cristal con seis facetas y una espina transparente. Cada corte refleja una luz distinta.',
    effect: 'Refracción · fragmentos triangulares',
    exit: 'prism',
    layers: [
      face([
        [50, 5],
        [88, 49],
        [63, 44],
        [62, 80],
        [50, 94],
        [38, 80],
        [37, 44],
        [12, 49],
      ]),
      face(
        [
          [50, 5],
          [50, 32],
          [12, 49],
        ],
        'edge',
        0.85,
      ),
      face(
        [
          [50, 5],
          [88, 49],
          [50, 32],
        ],
        'shade',
        0.4,
      ),
      face(
        [
          [50, 32],
          [63, 44],
          [62, 80],
          [50, 94],
        ],
        'shade',
        0.55,
      ),
      face(
        [
          [50, 32],
          [50, 94],
          [38, 80],
          [37, 44],
        ],
        'edge',
        0.2,
      ),
      cut(
        [
          [50, 12],
          [50, 87],
        ],
        'edge',
        1.2,
        0.7,
      ),
      cut(
        [
          [21, 44],
          [50, 32],
          [79, 44],
        ],
        'edge',
        1.2,
        0.8,
      ),
      face(
        [
          [43, 58],
          [50, 51],
          [57, 58],
          [50, 69],
        ],
        'accent',
        0.9,
      ),
    ],
  },
  orbit: {
    baseColor: 0xabbecf,
    paletteAccent: true,
    serial: 'OS—071',
    workshop: 'ORBITAL SYSTEMS',
    finish: 'Titanio orbital',
    description:
      'Un interceptor de titanio con aletas flotantes y un núcleo de navegación. Sus satélites dejan arcos en la salida.',
    effect: 'Barrido orbital · satélites en expansión',
    exit: 'orbit',
    layers: [
      face([
        [50, 5],
        [72, 49],
        [58, 43],
        [58, 79],
        [50, 92],
        [42, 79],
        [42, 43],
        [28, 49],
      ]),
      face(
        [
          [50, 5],
          [50, 32],
          [28, 49],
        ],
        'edge',
        0.7,
      ),
      face(
        [
          [50, 32],
          [58, 43],
          [58, 79],
          [50, 92],
        ],
        'shade',
        0.55,
      ),
      face(
        [
          [24, 43],
          [29, 54],
          [28, 69],
          [34, 78],
          [26, 79],
          [18, 67],
          [18, 53],
        ],
        'body',
        0.85,
      ),
      face(
        [
          [76, 43],
          [82, 53],
          [82, 67],
          [74, 79],
          [66, 78],
          [72, 69],
          [71, 54],
        ],
        'body',
        0.85,
      ),
      cut(
        [
          [21, 56],
          [21, 66],
          [27, 75],
        ],
        'edge',
        1.5,
      ),
      cut(
        [
          [77, 55],
          [77, 66],
          [72, 73],
        ],
        'accent',
        2.5,
      ),
      face(
        [
          [46, 51],
          [54, 51],
          [54, 65],
          [46, 65],
        ],
        'accent',
      ),
    ],
  },
  royal: {
    baseColor: 0xe9b96a,
    paletteAccent: true,
    serial: 'CR—001',
    workshop: 'SOVEREIGN EDITION',
    finish: 'Oro y ónice',
    description:
      'Una pieza de orfebrería: punta de lanza, alas de corona y un engaste de ónice. El sello se abre en la salida.',
    effect: 'Sello real · hojas de oro',
    exit: 'crown',
    layers: [
      face([
        [50, 4],
        [65, 30],
        [59, 42],
        [64, 58],
        [68, 42],
        [67, 22],
        [86, 33],
        [81, 58],
        [64, 70],
        [61, 86],
        [50, 96],
        [39, 86],
        [36, 70],
        [19, 58],
        [14, 33],
        [33, 22],
        [32, 42],
        [36, 58],
        [41, 42],
        [35, 30],
      ]),
      face(
        [
          [50, 4],
          [50, 28],
          [41, 42],
          [35, 30],
        ],
        'edge',
        0.85,
      ),
      face(
        [
          [50, 28],
          [59, 42],
          [64, 58],
          [61, 86],
          [50, 96],
        ],
        'shade',
        0.5,
      ),
      cut(
        [
          [20, 36],
          [24, 55],
          [41, 66],
          [45, 82],
        ],
        'edge',
        1.7,
      ),
      cut(
        [
          [79, 37],
          [75, 55],
          [60, 65],
        ],
        'edge',
        1.4,
      ),
      face(
        [
          [50, 44],
          [57, 55],
          [50, 69],
          [43, 55],
        ],
        'shade',
      ),
      face(
        [
          [50, 47],
          [53, 55],
          [50, 62],
          [47, 55],
        ],
        'accent',
      ),
      cut(
        [
          [43, 77],
          [57, 77],
        ],
        'accent',
        2.5,
      ),
      face(
        [
          [24, 37],
          [29, 34],
          [29, 42],
        ],
        'accent',
      ),
      face(
        [
          [76, 37],
          [71, 34],
          [71, 42],
        ],
        'accent',
      ),
    ],
  },
  nova: {
    baseColor: 0xd8e5ef,
    paletteAccent: true,
    serial: 'NV—099',
    workshop: 'DEEP SPACE',
    finish: 'Aleación de plasma',
    description:
      'Un prototipo de tres etapas con alas de barrido y un núcleo blanco. Su salida enciende una llamarada de plasma.',
    effect: 'Ignición de plasma · estela triple',
    exit: 'nova',
    layers: [
      face([
        [50, 3],
        [68, 37],
        [60, 48],
        [63, 80],
        [50, 95],
        [37, 80],
        [40, 48],
        [32, 37],
      ]),
      face(
        [
          [50, 3],
          [50, 35],
          [40, 48],
          [32, 37],
        ],
        'edge',
        0.9,
      ),
      face(
        [
          [50, 35],
          [60, 48],
          [63, 80],
          [50, 95],
        ],
        'shade',
        0.6,
      ),
      face([
        [30, 28],
        [35, 54],
        [29, 77],
        [17, 64],
        [22, 48],
        [16, 36],
      ]),
      face([
        [70, 28],
        [84, 36],
        [78, 48],
        [83, 64],
        [71, 77],
        [65, 54],
      ]),
      cut(
        [
          [23, 40],
          [28, 51],
          [24, 64],
        ],
        'edge',
        1.7,
      ),
      cut(
        [
          [76, 40],
          [71, 51],
          [75, 64],
        ],
        'accent',
        2.2,
      ),
      face(
        [
          [50, 39],
          [55, 55],
          [50, 74],
          [45, 55],
        ],
        'accent',
      ),
      face(
        [
          [46, 78],
          [50, 82],
          [54, 78],
          [50, 90],
        ],
        'edge',
        0.8,
      ),
    ],
  },
};

/** Fixed inks are deliberately shared by SVG and canvas, including under different palettes. */
export const MATERIAL_INKS = { edge: 0xffffff, shade: 0x182432, accent: 0xffd58b } as const;

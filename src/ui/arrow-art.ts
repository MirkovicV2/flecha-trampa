import { ARROW_DESIGNS, MATERIAL_INKS } from '../config/arrow-designs';
import type { Ink } from '../config/arrow-designs';
import type { SkinId } from '../config/collection';
import type { Direction } from '../core/types';

const ROTATION: Record<Direction, number> = { up: 0, right: 90, down: 180, left: 270 };

/** One source of geometry: the collection, chest reel, inspector and game cannot drift apart. */
export function arrowArt(id: SkinId, direction: Direction = 'up', color?: string): string {
  const design = ARROW_DESIGNS[id];
  const hex = (value: number) => `#${value.toString(16).padStart(6, '0')}`;
  const inks: Record<Ink, string> = {
    body: design.baseColor === undefined ? (color ?? 'currentColor') : hex(design.baseColor),
    edge: `#${MATERIAL_INKS.edge.toString(16).padStart(6, '0')}`,
    shade: `#${MATERIAL_INKS.shade.toString(16).padStart(6, '0')}`,
    accent: design.paletteAccent ? (color ?? 'currentColor') : hex(MATERIAL_INKS.accent),
  };
  const layers = design.layers
    .map((layer) => {
      const points = layer.points.map((point) => point.join(',')).join(' ');
      return layer.fill
        ? `<polygon points="${points}" fill="${inks[layer.fill]}" opacity="${layer.opacity ?? 1}"/>`
        : `<polyline points="${points}" fill="none" stroke="${inks[layer.stroke!]}" stroke-width="${layer.width ?? 1}" opacity="${layer.opacity ?? 1}" stroke-linejoin="round"/>`;
    })
    .join('');
  return `<svg class="skin-preview arrow-art" data-skin-art="${id}" data-finish="${design.exit}" viewBox="0 0 100 100" fill="none" aria-hidden="true"><g transform="rotate(${ROTATION[direction]} 50 50)">${layers}</g></svg>`;
}

export function supplyCase(): string {
  return `<svg class="supply-case" viewBox="0 0 300 220" fill="none" aria-hidden="true"><ellipse cx="152" cy="191" rx="112" ry="13" fill="#06090e" opacity=".6"/><path d="m34 70 142-25 92 35-141 32Z" fill="#0a131e"/><g class="supply-case-lid"><path d="m34 70 142-25 92 35-141 32Z" fill="#465363"/><path d="m34 70 93 42v9L34 79Zm93 42 141-32v9l-141 32Z" fill="#364353"/><path d="m41 70 86 38 133-29" stroke="#a5b4c4" stroke-opacity=".45"/></g><path d="m34 70 93 42v76l-93-42Z" fill="#202a36"/><path d="m127 112 141-32v76l-141 32Z" fill="#2b3745"/><path d="m34 91 93 42 141-32" stroke="#0e151f" stroke-width="6"/><path d="m40 72 87 37 134-29" stroke="#8c9aaa" stroke-opacity=".55" stroke-width="2"/><path d="m57 80 19 8v73l-19-9Zm126-24 19 7-4 99-19 5Z" fill="#141e29"/><path d="m61 83 10 5v69l-10-4Zm125-24 10 3-3 98-10 3Z" fill="#74818f"/><path d="m128 135 140-32v8l-140 32Z" fill="#91a3b7" opacity=".12"/><path d="m223 101 25-6v31l-25 6Z" fill="#151d28" stroke="#70808f"/><path d="m229 108 13-3v9l-13 3Z" fill="#e9b96a"/><path d="m99 117 16 7v25l-16-7Z" fill="#0c141e" stroke="#6c7d8d"/><path d="m104 123 6 3v12l-6-3Z" fill="#e9b96a"/><path d="m145 148 44-10v26l-44 10Z" fill="#18232f"/><path d="m151 153 30-7m-30 12 20-5m-20 10 26-6" stroke="#aab7c1" stroke-opacity=".55" stroke-width="2"/><path d="m214 141 24-5v16l-24 5Z" fill="#e9b96a"/><path d="m220 142 4 12m3-13 4 12" stroke="#25313c" stroke-width="3"/><path d="m34 137 10 4v13m214-3 10-3v-12" stroke="#607082" stroke-width="4"/><path d="m127 112 1 76" stroke="#637386" stroke-opacity=".45"/><path d="m87 64 30-5 32 12-31 6Z" fill="#15202c"/><path d="m97 64 19-3 21 8-19 4Z" fill="#84929f"/><path d="m45 77 7 3m202 5 7-2" stroke="#e9b96a" stroke-width="2"/></svg>`;
}

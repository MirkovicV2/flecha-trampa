import type { WorldId } from '../config/worlds';

/** Bounded vector ambience; gallery thumbnails remain static. No canvas or frame callbacks. */
export function worldAmbience(world: WorldId): string {
  if (world === 'void') return '';
  const count = world === 'christmas' ? 16 : world === 'sakura' ? 12 : 8;
  return `<g class="world-ambience ambience-${world}">${Array.from({ length: count }, (_, i) => {
    const x = (i * 173 + 51) % 1000;
    const y = (i * 97 + 41) % 690;
    const style = `style="--drift-time:${14 + (i % 7) * 2}s;--drift-delay:-${i * 2.3}s;--drift-x:${(i % 2 ? 1 : -1) * (18 + (i % 4) * 9)}px"`;
    const wrap = (shape: string) => `<g class="ambient-mote" ${style}>${shape}</g>`;
    if (world === 'christmas')
      return wrap(`<circle cx="${x}" cy="${y}" r="${2 + (i % 3)}" fill="#e4f7ed" opacity=".55"/>`);
    if (world === 'sakura')
      return wrap(
        `<path transform="translate(${x} ${y}) rotate(${i * 37})" d="M-5-3Q3-10 7-2 5 8-2 6Z" fill="#ffbad4" opacity=".5"/>`,
      );
    if (world === 'ocean')
      return wrap(
        `<circle cx="${x}" cy="${y}" r="${3 + (i % 5)}" stroke="#96eadc" fill="none" stroke-width="1.3" opacity=".35"/>`,
      );
    if (world === 'halloween')
      return wrap(`<circle cx="${x}" cy="${y}" r="${2 + (i % 2)}" fill="#f6d58b" opacity=".6"/>`);
    if (world === 'arcade')
      return wrap(
        `<path d="M${x} ${y}h${16 + (i % 3) * 15}" stroke="${i % 2 ? '#f591cd' : '#86ecf1'}" stroke-width="2" opacity=".35"/>`,
      );
    return wrap(
      `<path transform="translate(${x} ${y})" d="m0-8 5 2 1 9-6 3-6-3 1-9Z" fill="#efb76b" opacity=".55"/>`,
    );
  }).join('')}</g>`;
}

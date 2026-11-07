import type { WorldId } from '../config/worlds';
import { worldAmbience } from './ambience';

let serial = 0;
const stars = (color: string) =>
  Array.from(
    { length: 38 },
    (_, i) =>
      `<circle cx="${(i * 137 + 43) % 1000}" cy="${(i * 71 + 23) % 470}" r="${i % 5 === 0 ? 2.5 : 1.2}" fill="${color}" opacity="${0.25 + (i % 4) * 0.18}"/>`,
  ).join('');
const fir = (x: number, y: number, size: number, snow = false) =>
  `<g transform="translate(${x} ${y}) scale(${size})"><path d="M0-150-55-65h23L-75-5h50L-95 65H95L25-5h50L32-65h23Z" fill="#0d3739"/><path d="M0-150-55-65h23L-75-5h50L-95 65" fill="#08252e"/>${snow ? '<path d="M0-150-32-101 0-115 32-101Zm0 75L-45-27 0-44 45-27Z" fill="#c7ecdf" opacity=".8"/>' : ''}<path d="M-7 65H7v28H-7Z" fill="#493f4a"/></g>`;
const pumpkin = (x: number, y: number, size: number) =>
  `<g transform="translate(${x} ${y}) scale(${size})"><path d="M-2-39 3-55 12-53 6-37" fill="#8da274"/><ellipse rx="46" ry="37" fill="#b64e22"/><ellipse rx="30" ry="39" fill="#ed782b"/><ellipse rx="14" ry="39" fill="#ff9f3d"/><path d="m-29-9 14-10 6 14m18 0 6-14 14 10M-25 11h50L12 24H-12Z" fill="#fff2a9"/></g>`;

/** Original vector scenery. It never receives pointer input and has no third-party assets. */
export function worldArt(world: WorldId): string {
  const id = `scenery-${++serial}`;
  const backgrounds: Record<WorldId, [string, string]> = {
    void: ['#171b2b', '#080b13'],
    christmas: ['#071d35', '#144247'],
    halloween: ['#1a1335', '#49304f'],
    sakura: ['#2e2449', '#9a567b'],
    arcade: ['#100d34', '#31205d'],
    ocean: ['#052745', '#064e5a'],
    lanterns: ['#13233b', '#6d3b49'],
  };
  const [top, bottom] = backgrounds[world];
  let shapes = '';
  if (world === 'void')
    shapes = `<circle cx="830" cy="150" r="230" fill="url(#${id}-glow)"/>${stars('#cfdbff')}<path d="M0 660 300 520 630 700M650 0 900 210 1000 140" fill="none" stroke="#b9a5ff" opacity=".08"/>`;
  if (world === 'christmas')
    shapes = `${stars('#c6ffef')}<path d="M-80 90Q350-100 740 170T1130 60" fill="none" stroke="#57e7ac" stroke-width="75" opacity=".12"/><path d="M-60 135Q380-20 700 200T1140 95" fill="none" stroke="#af9dff" stroke-width="35" opacity=".13"/><circle cx="790" cy="122" r="53" fill="#d4f5e6"/><path d="m0 440 155-193 173 179 200-139 272 174 200-204v443H0" fill="#204951"/><path d="m155 247 56 58-50-15-48 28Zm373 40 53 34-58-7-39 38Z" fill="#b6ddd6"/><path d="M0 555q250-95 480 35t520-20v130H0" fill="#8bb8b7"/><path d="M0 643q300-126 585-13t415-16v86H0" fill="#cae3dc"/>${fir(75, 535, 1.25, true)}${fir(899, 505, 1.1, true)}${fir(948, 603, 0.8, true)}<g transform="translate(730 515)"><path d="M-60-35 0-88 60-35v75H-60Z" fill="#724b52"/><path d="m-70-35 70-67 70 67-12 13L0-78-58-22Z" fill="#ecf5e7"/><path d="M-30-15h20v24h-20Zm40 0h20v24H10Z" fill="#ffe7a3"/><path d="M-10 10h20v30h-20Z" fill="#eebd79"/></g>${Array.from({ length: 21 }, (_, i) => `<circle cx="${(i * 193 + 25) % 1000}" cy="${(i * 89 + 59) % 700}" r="${2 + (i % 3)}" fill="#effff6" opacity=".7"/>`).join('')}<path d="M0 38Q500 145 1000 34" fill="none" stroke="#9acba3" stroke-width="3"/>${Array.from({ length: 14 }, (_, i) => `<circle cx="${i * 77}" cy="${40 + Math.sin((i / 13) * Math.PI) * 52}" r="5" fill="${i % 2 ? '#ffc86a' : '#fca0a3'}"/>`).join('')}`;
  if (world === 'halloween')
    shapes = `${stars('#d9b9ff')}<circle cx="755" cy="148" r="91" fill="#ffcf8f"/><circle cx="723" cy="129" r="86" fill="#302041" opacity=".2"/><path d="M0 465q230-155 455 7t545-22v250H0" fill="#2b2346"/><path d="M0 562q250-125 530 16t470-25v147H0" fill="#1c1c34"/><g fill="#19172f"><path d="M680 440V274h43v-32h23v32h40v164Zm110 0V230h55v210Zm-70-165 27-70 29 70m13-45 28-78 29 78M841 440V310h46v130l-21-75-25 75"/><path d="M72 642 86 381 72 309 97 365 122 275 110 406 145 349 116 446 130 660Z"/><path d="m87 415-55-55 59 31M103 376l57-59-46 88M98 472l-73-30 77 5"/></g><path d="M737 306h10v21h-10Zm64-24h10v23h-10Zm25 0h9v23h-9Zm-25 50h10v23h-10Z" fill="#ffc470"/><g fill="#0e1225">${[0, 1, 2, 3, 4].map((i) => `<path transform="translate(${210 + i * 128} ${115 + (i % 3) * 40}) scale(${0.7 + (i % 2) * 0.3})" d="M0 0Q-10-22-30-16l9 19 15-5 6 10 6-10 15 5 9-19Q10-22 0 0"/>`).join('')}</g><path d="M0 603q220-35 455 15t545-4M-50 519q230-28 610 10t510-20" fill="none" stroke="#a084c0" stroke-width="31" opacity=".12"/>${pumpkin(141, 625, 1.15)}${pumpkin(866, 637, 0.8)}${pumpkin(923, 660, 0.55)}`;
  if (world === 'sakura')
    shapes = `${stars('#ffd8e9')}<circle cx="780" cy="165" r="84" fill="#ffd9c6" opacity=".8"/><path d="m0 550 260-285 160 218 150-145 430 267v95H0" fill="#674665"/><path d="m260 265 74 101-75-36-67 48Z" fill="#eed4dc"/><path d="M0 585q260-115 585 10t415-13v118H0" fill="#392d50"/><path d="M404 700q40-80 172-118 63-21 89-53-21 61-99 98-55 26-68 73" fill="#d18ba3" opacity=".5"/><path d="M0 700 58 520 65 245 34 107 61 0h39L84 120l34 121-12 306 68 153Z" fill="#2d2945"/><path d="M83 253 218 139 354 112 236 164 103 302M92 183 173 57 308 0H198L74 139M75 367 209 306 333 307 207 327 99 417" fill="#2d2945"/>${Array.from({ length: 32 }, (_, i) => `<circle cx="${(i * 77) % 420}" cy="${(i * 51) % 335}" r="${22 + (i % 17)}" fill="${['#f5b6d0', '#e38fb3', '#c66c9b'][i % 3]}" opacity=".85"/>`).join('')}<g fill="#ffcede">${Array.from({ length: 23 }, (_, i) => `<ellipse cx="${(i * 163 + 90) % 1000}" cy="${(i * 87 + 15) % 680}" rx="5" ry="10" transform="rotate(${i * 31} ${(i * 163 + 90) % 1000} ${(i * 87 + 15) % 680})"/>`).join('')}</g><g stroke="#ca798d" stroke-width="13"><path d="M755 590V433m111 157V433M729 435h165m-171-27q86 25 177 0"/></g>`;
  if (world === 'arcade')
    shapes = `<circle cx="736" cy="274" r="146" fill="url(#${id}-sun)"/>${stars('#b2c7ff')}${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M570 ${293 + i * 22}h330" stroke="#261343" stroke-width="${4 + i * 2}"/>`).join('')}<path d="m0 550 110-89 65 49 95-131 100 103 83-28 72 75 163-101 80 47 88-100 144 161v164H0Z" fill="#131c3f"/><path d="M0 552h1000v148H0Z" fill="#0b1531"/><g stroke="#693eb2" opacity=".65">${Array.from({ length: 16 }, (_, i) => `<path d="M500 548 ${-1300 + i * 240} 720"/>`).join('')}${[560, 577, 603, 645, 699].map((y) => `<path d="M0 ${y}h1000"/>`).join('')}</g><g fill="#12152f" stroke="#4b327d" stroke-width="2">${Array.from({ length: 15 }, (_, i) => `<path d="M${i * 75 - 20} 550v-${110 + ((i * 37) % 170)}h${30 + (i % 3) * 10}v${110 + ((i * 37) % 170)}Z"/>`).join('')}</g><g stroke="#6ce8ef" stroke-width="3" opacity=".8"><path d="M83 421v-87h28v150M875 485V328h28v141M750 520v-79h20"/></g><path d="m0 653 130-40m660 38 210 33" stroke="#ff78cd" stroke-width="5"/>`;
  if (world === 'ocean')
    shapes = `<path d="m180 0 220 570L30 540 110 0Zm420 0 325 560-220 45L520 0Z" fill="#8df6d3" opacity=".07"/><path d="M0 500q245-144 490 20t510-10v190H0" fill="#0a384c"/><path d="M0 646q300-120 565 1t435-42v95H0" fill="#0c273e"/><g stroke="#74dbd8" fill="none" opacity=".4">${Array.from({ length: 24 }, (_, i) => `<circle cx="${(i * 193 + 70) % 1000}" cy="${(i * 109) % 650}" r="${3 + (i % 7)}"/>`).join('')}</g><g fill="#69d8db" opacity=".55">${Array.from({ length: 12 }, (_, i) => `<path transform="translate(${(i * 93 + 80) % 1000} ${160 + i * 31}) scale(${0.4 + (i % 3) * 0.3})" d="M-18 0Q0-18 22 0 0 18-18 0l-12 11v-22Z"/>`).join('')}</g><g fill="none" stroke-linecap="round"><path d="M115 700V590m0 35-38-30v-40m38 50 40-31v-45m-40 75-20-58" stroke="#d27ca4" stroke-width="15"/><path d="M846 700v-83m0 38-33-22v-35m33 41 36-28v-40" stroke="#a187c8" stroke-width="12"/><path d="M38 700q-25-110 4-160m11 160q36-150 12-204M925 700q-38-117-13-185m42 185q42-139 12-217" stroke="#3eaa9e" stroke-width="18"/></g><g transform="translate(790 185)"><path d="M-44 0a44 44 0 0 1 88 0q-44 27-88 0" fill="#c2b7f6" opacity=".6"/><path d="M-29 9q-23 45 2 80M0 14q22 48-2 97m27-101q-20 36 5 73" fill="none" stroke="#a9a3ed" stroke-width="4" opacity=".45"/></g>`;
  if (world === 'lanterns')
    shapes = `${stars('#ffe6b4')}<circle cx="755" cy="147" r="75" fill="#ffe4ac"/><path d="m0 530 143-183 122 115 190-183 250 234 160-166 135 140v213H0" fill="#3b344f"/><path d="m0 610 182-133 157 132 259-169 183 148 219-126v238H0" fill="#242d47"/><path d="M0 669q300-75 580 0t420-10v41H0" fill="#17283f"/>${Array.from(
      { length: 15 },
      (_, i) => {
        const x = (i * 157 + 59) % 1000;
        const y = 65 + ((i * 83) % 500);
        const s = 0.4 + (i % 4) * 0.23;
        return `<g transform="translate(${x} ${y}) scale(${s})"><ellipse rx="55" ry="64" fill="url(#${id}-glow)"/><path d="M-22-30Q-33 0-20 32h40q13-32 2-62Z" fill="#e78d61"/><path d="M-13-28q-7 31 0 59h26q7-30 0-59Z" fill="#ffcd85"/><path d="M-22-30h44M-20 32h40" stroke="#ffdeb0" stroke-width="4"/><path d="M-7 35h14l-7 14Z" fill="#fff1b9"/></g>`;
      },
    ).join('')}`;
  return `<svg class="world-svg" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${id}-bg" x2="0" y2="1"><stop stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient><radialGradient id="${id}-glow"><stop stop-color="#ffe6a0" stop-opacity=".25"/><stop offset="1" stop-color="#ffe6a0" stop-opacity="0"/></radialGradient><linearGradient id="${id}-sun" x2="0" y2="1"><stop stop-color="#ffb08c"/><stop offset="1" stop-color="#e55ecf"/></linearGradient></defs><path fill="url(#${id}-bg)" d="M0 0h1000v700H0Z"/>${shapes}${worldAmbience(world)}</svg>`;
}

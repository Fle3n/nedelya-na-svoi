// Стикеры продуктов и блюд — свои рисунки в SVG вместо системных эмодзи.
// Один стиль на всё: плоские цвета, чёрный контур 2 px на поле 48×48, белая кромка и лёгкий наклон (в CSS, класс .stk).
// Стикер ищется по названию продукта, блюда или еды из ситуации, поэтому старые сохранения тоже получают картинки.
(function (N) {
  'use strict';

  // Палитра
  const K = '#17160f';   // контур
  const W = '#fffdf8';   // белый
  const Y = '#ffd42a';   // жёлтый ценник
  const R = '#e0462f';   // красный
  const O = '#f39a2b';   // оранжевый
  const G = '#5aa346';   // зелёный
  const LG = '#b5d978';  // салатовый
  const DG = '#2f6b34';  // тёмно-зелёный
  const BR = '#7a4a26';  // коричневый
  const LB = '#d9a35f';  // корочка
  const CR = '#f6ead0';  // сливочный
  const PK = '#f2a493';  // розовый
  const BL = '#4f86c6';  // синий
  const LBL = '#bcd7f0'; // голубой
  const GR = '#d6cfbf';  // серый картон
  const PU = '#7d2c5a';  // свёкла
  const CH = '#5b3520';  // шоколад, мясо

  // ---------- примитивы ----------
  const hl = (d) => `<path d="${d}" stroke="#fff" stroke-opacity=".8" stroke-width="2" fill="none"/>`;
  const dots = (pts, fill, r = 1.4) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="none"/>`).join('');
  // толстая линия с контуром: ручка, кость, стебель
  const stick = (d, color, w = 3) => `<path d="${d}" stroke="${K}" stroke-width="${w + 3}" fill="none"/><path d="${d}" stroke="${color}" stroke-width="${w}" fill="none"/>`;

  // пакет с окошком-этикеткой
  const bag = (fill, label, inner = '') => `
    <path d="M11 12 L13 7 H35 L37 12 V40 a3 3 0 0 1 -3 3 H14 a3 3 0 0 1 -3 -3 Z" fill="${fill}"/>
    <path d="M11 12 H37"/><path d="M16 7.5v4M20 7.5v4M24 7.5v4M28 7.5v4M32 7.5v4" stroke-width="1" stroke-opacity=".45"/>
    <rect x="15" y="18" width="18" height="18" rx="2.5" fill="${label}"/>${inner}
    ${hl('M14 16 V38')}`;
  // пакет молока или кефира
  const carton = (band) => `
    <path d="M13 18 L18 10 H30 L35 18 V41 a2 2 0 0 1 -2 2 H15 a2 2 0 0 1 -2 -2 Z" fill="${W}"/>
    <rect x="18" y="5" width="12" height="5" rx="1" fill="${W}"/>
    <path d="M13 18 H35"/>
    <path d="M13 30 q5.5 -4 11 0 t11 0 V41 a2 2 0 0 1 -2 2 H15 a2 2 0 0 1 -2 -2 Z" fill="${band}"/>
    <circle cx="29" cy="14" r="2.2" fill="${band}"/>
    ${hl('M16 21 V27')}`;
  // стаканчик со сметаной, творогом
  const cup = (fill, lid, band = '') => `
    <path d="M11 18 H37 L34 40 a3 3 0 0 1 -3 2.6 H17 a3 3 0 0 1 -3 -2.6 Z" fill="${fill}"/>
    ${band}
    <rect x="9" y="13" width="30" height="6" rx="2" fill="${lid}"/>
    ${hl('M15 23 L16.5 37')}`;
  // банка консервов
  const can = (label, emblem = '') => `
    <path d="M11 15 V37 A13 4.5 0 0 0 37 37 V15 Z" fill="${GR}"/>
    <path d="M11 20 A13 4.5 0 0 0 37 20 V33 A13 4.5 0 0 1 11 33 Z" fill="${label}"/>
    <ellipse cx="24" cy="15" rx="13" ry="4.5" fill="#e8e3d8"/>
    <ellipse cx="24" cy="15" rx="9" ry="2.8" stroke-width="1.2" stroke-opacity=".45"/>
    ${emblem}${hl('M14 23 V31')}`;
  // миска: каша, салат, творог
  const bowl = (food, top = '', rim = BL) => `
    <path d="M8 26 C9 15 39 15 40 26 Z" fill="${food}"/>
    ${top}
    <path d="M5 26 H43 C43 36 35 43 24 43 C13 43 5 36 5 26 Z" fill="${W}"/>
    <path d="M8 31 H40" stroke="${rim}" stroke-width="2.5"/>
    ${hl('M10 35 C13 39 17 40.5 21 41')}`;
  // тарелка супа с паром
  const soup = (broth, top = '') => `
    <path d="M18 13 c-2 -3 2 -5 0 -8 M25 13 c-2 -3 2 -5 0 -8 M32 13 c-2 -3 2 -5 0 -8" stroke-width="1.6" stroke-opacity=".55"/>
    <path d="M5 23 H43 C43 34 35 42 24 42 C13 42 5 34 5 23 Z" fill="${W}"/>
    <ellipse cx="24" cy="23" rx="19" ry="5" fill="${broth}"/>
    ${top}
    <path d="M8 30 H40" stroke="${BL}" stroke-width="2.5"/>
    ${hl('M10 33 C13 37 17 39 21 40')}`;
  // плоская тарелка, еда сверху
  const plate = (food) => `
    <ellipse cx="24" cy="32" rx="21" ry="10" fill="${W}"/>
    <ellipse cx="24" cy="31.5" rx="14.5" ry="6" stroke-width="1.3" stroke-opacity=".3"/>
    ${food}`;
  // сковородка
  const pan = (food) => `
    ${stick('M37 31 L46 25', CH, 3.5)}
    <ellipse cx="22" cy="31" rx="19" ry="10.5" fill="#4a4740"/>
    <ellipse cx="22" cy="30" rx="15" ry="7.5" fill="#67635a" stroke-width="1.2"/>
    ${food}`;
  const mound = (fill, extra = '') => `<path d="M8 31 C8 16 40 16 40 31 C34 35 14 35 8 31 Z" fill="${fill}"/>${extra}`;
  const drumstick = (meat, tx = 0, ty = 0, s = 1) => `<g transform="translate(${tx} ${ty}) scale(${s})">
    ${stick('M27 27 L37 37', W, 3.5)}
    <circle cx="38.5" cy="35.5" r="3" fill="${W}"/><circle cx="36" cy="39" r="3" fill="${W}"/>
    <path d="M8 29 C4 19 14 8 24 11 C32 13 34 21 30 27 L23 32 C17 36 11 36 8 29 Z" fill="${meat}"/>
    ${hl('M12 18 C14 15 17 13.5 20 13.5')}</g>`;
  const sausage = (x, y, rot, len = 30) => `<g transform="rotate(${rot} ${x} ${y})">
    <rect x="${x - len / 2}" y="${y - 4.5}" width="${len}" height="9" rx="4.5" fill="#ef8f7c"/>
    ${hl(`M${x - len / 2 + 5} ${y - 1.8} H${x + len / 2 - 6}`)}</g>`;
  const dumpling = (x, y, s = 1, fill = W) => `<path transform="translate(${x} ${y}) scale(${s})" d="M-7 2 C-7 -6 7 -6 7 2 C3 4 -3 4 -7 2 Z" fill="${fill}"/>`;
  const snowflake = (x, y) => `<g transform="translate(${x} ${y})" stroke="${W}" stroke-width="1.5"><path d="M0 -4.5V4.5M-3.9 -2.25L3.9 2.25M-3.9 2.25L3.9 -2.25"/></g>`;
  const cube = (cx, cy, s) => `
    <path d="M${cx} ${cy - s / 2} l${s} ${s / 2} l${-s} ${s / 2} l${-s} ${-s / 2} Z" fill="${W}"/>
    <path d="M${cx - s} ${cy} l${s} ${s / 2} v${s} l${-s} ${-s / 2} Z" fill="${CR}"/>
    <path d="M${cx} ${cy + s / 2} l${s} ${-s / 2} v${s} l${-s} ${s / 2} Z" fill="#e3d6b6"/>`;
  const pastaPile = (fill, extra = '') => mound(fill, `
    <path d="M12 29 c2 -2 4 2 6 0 s4 2 6 0 s4 2 6 0 s4 2 6 0 M15 24.5 c2 -2 4 2 6 0 s4 2 6 0 s4 2 6 0" stroke-width="1.3" stroke-opacity=".5"/>${extra}`);

  // ---------- стикеры ----------
  const S = {
    // крупы и макароны
    grechka: bag(LB, W, dots([[19, 23], [23, 22], [27, 24], [21, 27], [25, 28], [29, 29], [19, 31], [23, 32], [27, 33]], BR, 1.5)),
    ris: bag(LBL, W, `<g fill="${W}" stroke-width=".9">${[[20, 23, 25], [27.5, 23.5, -30], [21, 30.5, -20], [28, 31, 35]].map(([x, y, a]) => `<ellipse cx="${x}" cy="${y}" rx="3.4" ry="1.7" transform="rotate(${a} ${x} ${y})"/>`).join('')}</g>`),
    makarony: bag(Y, W, `<g fill="#f3c74a" stroke-width="1">${[[21, 23], [27, 27], [21, 31.5]].map(([x, y]) => `<path d="M${x - 4.5} ${y + 1.5} l7 -5 l2 2.6 l-7 5 Z" transform="rotate(8 ${x} ${y})"/>`).join('')}</g>`),
    gerkules: `
      <path d="M11 13 L14 8 H34 L37 13 Z" fill="#c23a28"/>
      <rect x="11" y="13" width="26" height="30" rx="2" fill="${R}"/>
      <ellipse cx="24" cy="29" rx="9" ry="8" fill="${W}"/>
      <g fill="${CR}" stroke-width="1">${[[21, 26, 20], [27, 27, -25], [22, 32, -10], [27, 32, 30]].map(([x, y, a]) => `<ellipse cx="${x}" cy="${y}" rx="3" ry="2" transform="rotate(${a} ${x} ${y})"/>`).join('')}</g>
      ${hl('M14 17 V39')}`,
    psheno: bag(W, Y, dots([[19, 23], [23, 22], [27, 24], [21, 27], [25, 28], [29, 29], [19, 31], [23, 32], [27, 33]], '#e0a21a', 1.6)),
    goroh: bag(LG, W, dots([[19.5, 23.5], [25, 22.5], [29, 26], [21, 28.5], [26, 29], [20, 33], [25.5, 33.5]], '#e6c440', 2.1)),

    // хлеб
    hleb: `
      <path d="M6 23 C6 15 13 12 24 12 C35 12 42 15 42 23 V36 a4 4 0 0 1 -4 4 H10 a4 4 0 0 1 -4 -4 Z" fill="#9a5f30"/>
      <path d="M6 23 C6 27 42 27 42 23" stroke-opacity=".5"/>
      <path d="M13 16 l4 4 M21 15 l4 4 M29 15.5 l4 4" stroke="${CH}"/>
      ${hl('M10 30 V35')}`,
    baton: `
      <path d="M6 31 C5 23 14 14 26 11 C36 9 43 13 42 20 C41 28 32 35 20 38 C11 40 6.5 37 6 31 Z" fill="#e2a85e"/>
      <path d="M14 25 l5 5 M21 19.5 l5 5 M29 15.5 l5 4.5" stroke="#a5662b"/>
      ${hl('M11 34 C16 34 22 32 27 29')}`,

    // молочное и яйца
    moloko: carton(BL),
    kefir: carton(G),
    yogurt: `
      <rect x="17" y="5" width="14" height="7" rx="2" fill="${PK}"/>
      <path d="M18 12 H30 V16 C34 18 35 21 35 25 V40 a3 3 0 0 1 -3 3 H16 a3 3 0 0 1 -3 -3 V25 C13 21 14 18 18 16 Z" fill="${W}"/>
      <path d="M13 27 H35 V37 H13 Z" fill="${PK}"/>
      ${dots([[20, 32], [24, 30], [28, 33]], R, 1.6)}${hl('M16 22 V25')}`,
    smetana: cup(W, BL, `<path d="M12.6 27 H35.4 L34.4 34 H13.6 Z" fill="${LBL}"/>`),
    tvorog: `
      <path d="M12 23 c-1 -5 4 -8 7 -6 c1 -4 7 -4 8 -1 c3 -3 8 -1 7 3 c4 0 5 4 3 6 Z" fill="${W}"/>
      ${dots([[18, 20], [24, 18.5], [30, 20], [21, 23], [33, 22]], GR, 1.2)}
      <rect x="8" y="22" width="32" height="19" rx="3" fill="${LBL}"/>
      <path d="M8 29 H40" stroke="${BL}" stroke-width="3"/>
      ${hl('M11 33 V38')}`,
    syr: `
      <path d="M6 27 L31 13 L42 27 Z" fill="#ffe27a"/>
      <path d="M6 27 H42 V38 H6 Z" fill="${Y}"/>
      <circle cx="14" cy="32" r="2.2" fill="#e5b425"/><circle cx="24" cy="34" r="1.6" fill="#e5b425"/><circle cx="33" cy="31" r="2.6" fill="#e5b425"/>
      <ellipse cx="27" cy="20" rx="2.4" ry="1.3" fill="#e5b425"/>`,
    maslo_sl: `
      <path d="M8 22 L24 14 L40 22 L24 30 Z" fill="#fff0a6"/>
      <path d="M8 22 V32 L24 40 V30 Z" fill="${BL}"/>
      <path d="M40 22 V32 L24 40 V30 Z" fill="#3b6ea8"/>
      <path d="M12 24 L24 18 L32 22" stroke="#fff" stroke-opacity=".8" stroke-width="2" fill="none"/>
      <path d="M12 29 L20 33" stroke="${Y}" stroke-width="2"/>`,
    yaica: `
      <ellipse cx="15" cy="22" rx="5.5" ry="7" fill="${CR}"/>
      <ellipse cx="24" cy="21" rx="5.5" ry="7" fill="${CR}"/>
      <ellipse cx="33" cy="22" rx="5.5" ry="7" fill="${CR}"/>
      <path d="M5 26 H43 L40 39 H8 Z" fill="${GR}"/>
      <path d="M10 26 q5 6 10 0 q4 6 8 0 q5 6 10 0" stroke-width="1.3" stroke-opacity=".5"/>
      ${hl('M13 18 V20')}${hl('M22 17 V19')}${hl('M31 18 V20')}`,

    // мясо и рыба
    okorochka: drumstick('#f3b39c'),
    farsh: `
      <path d="M9 28 C9 19 16 16 24 16 C32 16 39 19 39 28 Z" fill="#e8807a"/>
      <path d="M14 22 c2 -1 3 1 5 0 M22 20 c2 -1 3 1 5 0 M28 24 c2 -1 3 1 5 0 M17 26 c2 -1 3 1 5 0" stroke="#b9504c" stroke-width="1.3"/>
      <path d="M5 27 H43 L39 39 H9 Z" fill="${W}"/>
      ${hl('M12 19 C14 17 17 16.5 19 16.5')}`,
    sosiski: `${sausage(24, 18, -12, 32)}${sausage(24, 29, -12, 32)}`,
    pelmeni: bag(BL, LBL, `${dumpling(20, 25)}${dumpling(28, 31)}`) + snowflake(30, 13),
    tushenka: can('#c43a2c', `<path d="M17 26.5 h14" stroke="${W}" stroke-width="2.5"/>`),
    ryba_konserv: `
      <path d="M5 22 V28 A19 9 0 0 0 43 28 V22" fill="${BL}"/>
      <ellipse cx="24" cy="22" rx="19" ry="9" fill="#e8e3d8"/>
      <path d="M12 22 c4 -5 13 -5 17 0 c-4 5 -13 5 -17 0 Z M29 22 l5 -3.5 v7 Z" fill="${LBL}"/>
      <circle cx="16" cy="21.3" r="1" fill="${K}" stroke="none"/>
      <ellipse cx="37" cy="19" rx="2.5" ry="1.6" stroke-width="1.3"/>`,

    // овощи и фрукты
    kartofel: `
      <path d="M8 27 C6 18 16 11 26 12 C37 13 43 20 40 29 C37 37 26 40 18 38 C12 37 9 33 8 27 Z" fill="#d1a15f"/>
      <path d="M16 22 l2 1 M28 18 l2 1 M33 28 l1.5 1.5 M21 31 l2 .5" stroke="${BR}" stroke-width="1.6"/>
      ${hl('M12 25 C13 21 16 18 19 16.5')}`,
    morkov: `
      <path d="M31 14 C27 9 28 4 32 3 C34 7 34 11 33 14 Z" fill="${G}"/>
      <path d="M34 15 C37 9 42 7 45 9 C42 13 38 15 35 16 Z" fill="${G}"/>
      <path d="M9 41 C8 38 21 21 29 15 C32 12 37 15 35 18 C30 26 13 42 9 41 Z" fill="${O}"/>
      <path d="M17 31 l3 2 M22 25 l3 2 M27 20 l2.5 2" stroke-width="1.4"/>`,
    luk: `
      <path d="M24 10 C26 16 38 20 38 30 C38 38 31 42 24 42 C17 42 10 38 10 30 C10 20 22 16 24 10 Z" fill="#e3a446"/>
      <path d="M24 10 l-1.5 -5 M24 10 l2.5 -4.5"/>
      <path d="M23 15 C19 22 17 32 20 41 M25 15 C29 22 31 32 28 41" stroke-width="1.3" stroke-opacity=".45"/>
      <path d="M21 42 l-1 2.5 M24 42.5 v2.5 M27 42 l1 2.5" stroke-width="1.3"/>
      ${hl('M14 27 C14 24 15.5 22 17 21')}`,
    kapusta: `
      <circle cx="24" cy="24" r="14" fill="#dcefae"/>
      <path d="M24 10 C20 16 20 27 24 37 M19 13 C15 17 14 24 16 30 M29 13 C33 17 34 24 32 30" stroke-width="1.3" stroke-opacity=".45"/>
      <path d="M24 42 C12 42 5 34 6 25 C7 18 11 13 16 12 C12 21 14 33 24 42 Z" fill="#7fbb52"/>
      <path d="M24 42 C36 42 43 34 42 25 C41 18 37 13 32 12 C36 21 34 33 24 42 Z" fill="#7fbb52"/>
      <path d="M10 26 C11 22 13 19 15 17 M38 26 C37 22 35 19 33 17" stroke-width="1.2" stroke-opacity=".45"/>
      ${hl('M20 15 C18 16.5 17 18.5 16.5 21')}`,
    svekla: `
      <path d="M22 17 C18 11 18 5 22 4 C25 8 25 13 23 17 Z" fill="${G}"/>
      <path d="M25 17 C28 10 34 8 37 10 C34 14 30 17 26 18 Z" fill="${G}"/>
      <path d="M24 17 C34 17 39 24 37 31 C35 38 28 41 24 45 C20 41 13 38 11 31 C9 24 14 17 24 17 Z" fill="${PU}"/>
      ${hl('M15 27 C15.5 24 17.5 22 20 21')}`,
    ogurcy: `<g transform="rotate(-25 24 25)">
      <rect x="5" y="19" width="38" height="12" rx="6" fill="${G}"/>
      ${dots([[12, 23], [18, 26], [24, 23], [30, 26], [36, 23]], LG, 1.2)}
      ${hl('M11 21.5 H33')}</g>`,
    pomidory: `
      <path d="M24 15 C35 15 41 21 41 29 C41 37 33 42 24 42 C15 42 7 37 7 29 C7 21 13 15 24 15 Z" fill="${R}"/>
      <path d="M24 18 l-7 -3 l4 4.5 l-6 2 h7 l2 4 l1 -4 h7 l-6 -2 l4 -4.5 Z" fill="${G}"/>
      <path d="M24 17 v-5"/>
      ${hl('M12 27 C12.5 24 14.5 21.5 17 20.5')}`,
    ovoshi_zam: bag(BL, W, `${dots([[19, 23], [24, 25], [20, 30], [28, 32]], G, 2.2)}<rect x="26" y="20" width="4" height="4" fill="${O}" stroke-width="1"/><rect x="23" y="30" width="4" height="4" fill="${O}" stroke-width="1"/>${dots([[29, 27], [18, 34]], Y, 1.8)}`) + snowflake(30, 13),
    yabloki: `
      <path d="M24 16 C28 12 38 12 40 22 C42 33 34 42 28 41 C26 40.5 25 40 24 40 C23 40 22 40.5 20 41 C14 42 6 33 8 22 C10 12 20 12 24 16 Z" fill="${R}"/>
      <path d="M24 16 C24 12 25 9 27 7"/>
      <path d="M26 11 C29 6 35 6 36 8 C33 12 29 12 26 11 Z" fill="${G}"/>
      ${hl('M12 22 C12.5 19 14.5 17 17 16.5')}`,
    banany: `
      <path d="M9 15 L8 10 L11.5 9.5 L12.5 14" fill="${BR}"/>
      <path d="M8 17 C10 32 24 41 38 34 C41 32 42 29 40 28 C30 33 18 28 12 15 C11 12 8 13 8 17 Z" fill="${Y}"/>
      <path d="M40 28 l3.5 -1.2"/>
      <path d="M12 22 C16 30 24 35 33 34" stroke-width="1.3" stroke-opacity=".4"/>`,
    maslo_pods: `
      <rect x="19" y="3" width="10" height="5" rx="1.5" fill="${R}"/>
      <path d="M20 8 H28 V11 C28 13 33 15 33 20 V40 a3 3 0 0 1 -3 3 H18 a3 3 0 0 1 -3 -3 V20 C15 15 20 13 20 11 Z" fill="#f6c935"/>
      <rect x="15" y="24" width="18" height="12" fill="${W}"/>
      <g stroke-width="1">${[0, 60, 120, 180, 240, 300].map((a) => `<ellipse cx="24" cy="26.3" rx="1.4" ry="2.3" fill="${Y}" transform="rotate(${a} 24 30)"/>`).join('')}</g>
      <circle cx="24" cy="30" r="2" fill="${BR}" stroke-width="1"/>
      ${hl('M18 17 V21')}`,

    // масло, сахар, чай
    sahar: `${cube(16, 29, 8)}${cube(32, 29, 8)}${cube(24, 19, 8)}`,
    chai: `
      <path d="M9 15 L15 10 H39 L33 15 Z" fill="#7fbf5f"/>
      <path d="M33 15 L39 10 V36 L33 41 Z" fill="${DG}"/>
      <rect x="9" y="15" width="24" height="26" fill="${G}"/>
      <path d="M15 34 C14 26 19 21 27 21 C28 29 23 34 15 34 Z M15 34 L22 27" fill="${W}"/>
      <path d="M28 12.5 C32 17 40 17 43 23" stroke-width="1.3"/>
      <rect x="39" y="23" width="7" height="8" rx="1" fill="${Y}"/>`,

    // сладкое и быстрое
    pechenie: `
      <circle cx="24" cy="25" r="16" fill="${LB}"/>
      ${dots([[17, 20], [27, 17], [31, 26], [20, 30], [26, 33], [15, 26]], CH, 2)}
      ${hl('M12 21 C13 17 16 14 19 12.5')}`,
    shokolad: `<g transform="rotate(-15 24 24)">
      <rect x="11" y="6" width="22" height="34" rx="2" fill="#6b3a24"/>
      <path d="M22 6 V22 M11 14 H33" stroke-width="1.4" stroke-opacity=".6"/>
      <path d="M9 22 l3 -2.5 l3 2.5 l3 -2.5 l3 2.5 l3 -2.5 l3 2.5 l3 -2.5 l3 2.5 V25 H9 Z" fill="#e6e1d6"/>
      <rect x="9" y="24" width="26" height="19" rx="2" fill="${R}"/>
      <path d="M14 33 H30" stroke="${W}" stroke-width="2.5"/></g>`,
    gazirovka: `
      <rect x="20" y="3" width="8" height="5" rx="1.5" fill="${R}"/>
      <path d="M21 8 H27 V10 C27 12 32 13 32 18 V22 C30.5 24 30.5 26 32 28 V40 a3 3 0 0 1 -3 3 H19 a3 3 0 0 1 -3 -3 V28 C17.5 26 17.5 24 16 22 V18 C16 13 21 12 21 10 Z" fill="#9ad6b5"/>
      <path d="M16 28 H32 V36 H16 Z" fill="${R}"/>
      ${dots([[21, 19], [26, 16], [24, 22]], W, 1.3)}${hl('M19 31 V33')}`,
    lapsha: `
      <path d="M10 18 c2 -4 4 0 6 -3 c2 -3 4 1 6 -2 c2 -3 4 1 6 -2 c2 -3 4 1 6 0 c1 2 2 4 3 7 Z" fill="#f3d27a"/>
      <path d="M9 18 H39 L35.5 42 H12.5 Z" fill="${Y}"/>
      <path d="M10.3 26 H37.7 L36.7 33 H11.3 Z" fill="${R}"/>
      ${stick('M30 16 L40 3', GR, 2)}`,

    // вне дома
    stolovaya: `${soup('#e07b39', dots([[18, 22], [26, 24], [31, 21.5]], O, 1.6))}
      <path d="M35 21 H45 L43.5 41 H36.5 Z" fill="#c43c5c"/>${hl('M38 25 V36')}`,
    fastfood: `
      <path d="M8 23 C8 11 40 11 40 23 Z" fill="#e3a14c"/>
      ${dots([[17, 16], [24, 14.5], [31, 16], [21, 19.5], [28, 19.5]], W, 1.1)}
      <path d="M7 23 c3 3 5 -1 8 2 c3 3 5 -1 8 2 c3 3 5 -1 8 2 c3 3 5 -1 10 0 V23 Z" fill="${G}"/>
      <rect x="7" y="27" width="34" height="6.5" rx="3.2" fill="${CH}"/>
      <path d="M9 27 H39 L33 31 L28 27 Z" fill="${Y}" stroke-width="1.3"/>
      <path d="M8 34 H40 V36 C40 39 38 41 35 41 H13 C10 41 8 39 8 36 Z" fill="#e3a14c"/>`,

    // блюда
    r_ovsyanka: bowl('#e9d3a1', `<rect x="21" y="16" width="7" height="5" rx="1" fill="${Y}" stroke-width="1.5"/>`),
    r_ovsyanka_yabl: bowl('#e9d3a1', `<path d="M15 21 a5 5 0 0 1 9 -2 Z" fill="${CR}"/><path d="M15 21 a5 5 0 0 1 9 -2" stroke="${R}" stroke-width="2.4"/><path d="M25 20 a5 5 0 0 1 9 1 Z" fill="${CR}"/><path d="M25 20 a5 5 0 0 1 9 1" stroke="${R}" stroke-width="2.4"/>`),
    r_psh_kasha: bowl('#f2c94c', `<rect x="21" y="16" width="7" height="5" rx="1" fill="#fff0a6" stroke-width="1.5"/>`),
    r_omlet: pan(`<path d="M9 30 C10 21 31 19 35 28 C29 33 15 34 9 30 Z" fill="${Y}"/>${dots([[16, 27], [23, 25], [28, 28]], G, 1.3)}`),
    r_yaichnica: plate(`
      <path d="M8 30 c-1 -5 5 -8 9 -6 c4 -3 10 1 8 5 c2 4 -4 7 -8 5 c-4 2 -10 0 -9 -4 Z" fill="${W}"/>
      <path d="M23 29 c-1 -5 5 -8 9 -6 c4 -3 10 1 8 5 c2 4 -4 7 -8 5 c-4 2 -10 0 -9 -4 Z" fill="${W}"/>
      <circle cx="16" cy="29" r="3.3" fill="${O}"/><circle cx="31" cy="28.5" r="3.3" fill="${O}"/>
      <path d="M33 12 h10 a3 3 0 0 1 0 6 v8 h-10 v-8 a3 3 0 0 1 0 -6 Z" fill="${LB}"/>`),
    r_tvorog_smet: `${stick('M28 18 L41 6', GR, 2.5)}` + bowl(W, `${dots([[14, 23], [19, 20], [29, 21], [33, 24], [24, 19]], GR, 1.2)}<path d="M18 21 c2 -5 10 -5 12 0 c-4 2 -8 2 -12 0 Z" fill="${CR}"/>`),
    r_buterbrod: `
      <path d="M5 21 a6 6 0 0 1 6 -6 h14 a6 6 0 0 1 2 11.6 V41 H8 V26.6 A6 6 0 0 1 5 21 Z" fill="${LB}"/>
      <path d="M9 22 a3 3 0 0 1 3 -3 h12 a3 3 0 0 1 1 5.6 V38 H11 V24.6 A3 3 0 0 1 9 22 Z" fill="${CR}" stroke-width="0"/>
      <path d="M8 20 L25 18 L26.5 33 L9.5 35 Z" fill="${Y}"/>
      <circle cx="13.5" cy="30" r="1.8" fill="#e5b425"/><circle cx="20" cy="23" r="1.5" fill="#e5b425"/><circle cx="22" cy="30.5" r="1" fill="#e5b425"/>
      <path d="M41 30 a4 4 0 0 1 0 8" />
      <rect x="29" y="26" width="12" height="15" rx="2" fill="${W}"/>
      <path d="M30 29 H40" stroke="${BR}" stroke-width="2.5"/>
      <path d="M33 26 V20 M33 20 h4 v4 h-4" stroke-width="1.2"/>`,
    r_shchi: soup('#d9c27a', `<path d="M14 22 l5 2 M22 21 l6 1 M29 24 l5 -1" stroke="${LG}" stroke-width="2.2"/>${dots([[18, 25], [27, 22], [33, 23]], G, 1.1)}`),
    r_borsch: soup('#b8323e', `<path d="M20 23 c0 -2.5 8 -2.5 8 0 c0 2 -8 2 -8 0 Z" fill="${W}" stroke-width="1.2"/>${dots([[15, 23], [31, 22], [34, 24.5]], G, 1.1)}`),
    r_gorohovy: soup('#c8b74a', `<rect x="15" y="20.5" width="4" height="4" fill="${LB}" stroke-width="1.2" transform="rotate(12 17 22.5)"/><rect x="28" y="21" width="4" height="4" fill="${LB}" stroke-width="1.2" transform="rotate(-10 30 23)"/>`),
    r_grechka_luk: plate(mound('#7a4a26', `${dots([[16, 27], [20, 25], [25, 24], [30, 26], [34, 28], [22, 29], [28, 29]], '#a8703f', 1.1)}<path d="M18 25 a3 3 0 0 1 5 1 M27 24 a3 3 0 0 1 5 1" stroke="${O}" stroke-width="2"/>`)),
    r_grechka_kur: plate(mound('#7a4a26', dots([[15, 28], [20, 26], [25, 25], [30, 27], [34, 29]], '#a8703f', 1.1))) + drumstick('#d98b4f', 13, 3, 0.62),
    r_plov: plate(mound('#e7a84a', `<path d="M15 27 l4 1 M24 24 l4 1.5 M30 28 l4 -1" stroke="${O}" stroke-width="2.4"/><rect x="19" y="26" width="4" height="3.5" rx="1" fill="${CH}" stroke-width="1"/><rect x="27" y="23" width="4" height="3.5" rx="1" fill="${CH}" stroke-width="1"/>`)),
    r_makarony_flot: plate(pastaPile('#f3d27a', dots([[16, 27], [22, 24.5], [28, 26], [33, 28.5], [24, 29]], '#8b4a2b', 1.6))),
    r_makarony_tush: plate(pastaPile('#f3d27a', `<rect x="17" y="24" width="5" height="4" rx="1.2" fill="#8b4a2b" stroke-width="1.2"/><rect x="27" y="25" width="5" height="4" rx="1.2" fill="#8b4a2b" stroke-width="1.2"/>`)),
    r_makarony_syr: plate(pastaPile('#f3d27a', `<path d="M16 26 l3 -1 M21 23.5 l3 -1 M26 25 l3 -1 M31 27 l3 -1 M22 28 l3 -1" stroke="${O}" stroke-width="1.8"/>`)),
    r_ris_ovoshi: plate(mound('#f4efe2', `${dots([[16, 27], [26, 24]], G, 1.7)}${dots([[21, 25], [31, 27]], O, 1.7)}${dots([[19, 29], [28, 29]], Y, 1.5)}`)),
    r_pyure_sosiski: plate(`<path d="M9 31 C9 23 25 22 27 30 C22 34 13 34 9 31 Z" fill="#f3e1a6"/>${sausage(31, 27, -20, 22)}${sausage(29, 32, -8, 22)}`),
    r_kartoshka_zhar: pan(`${[[14, 28, 20], [20, 25, -15], [26, 29, 10], [30, 25, -30], [20, 32, 5]].map(([x, y, a]) => `<rect x="${x - 4}" y="${y - 2}" width="8" height="4" rx="1.5" fill="#e9b24a" stroke-width="1.3" transform="rotate(${a} ${x} ${y})"/>`).join('')}<ellipse cx="25" cy="33" rx="3" ry="1.6" stroke="${W}" stroke-width="1.3"/>`),
    r_kartoshka_ryba: plate(`<ellipse cx="15" cy="29" rx="6" ry="4.5" fill="#f0cf7a"/><ellipse cx="21" cy="33" rx="5.5" ry="4" fill="#f0cf7a"/>
      <path d="M24 28 c4 -6 14 -6 17 -1 c-3 6 -13 6 -17 1 Z" fill="#a9b7c4"/><path d="M28 27 l2 2 M32 26 l2 2.5 M36 26.5 l1.5 2" stroke-width="1.2" stroke-opacity=".5"/>`),
    r_pelmeni_smet: plate(`${dumpling(23, 26, 0.95, CR)}${dumpling(15, 30, 0.95, CR)}${dumpling(24, 34, 0.95, CR)}<path d="M28 29 c0 -4 9 -4 9 0 c0 3 -9 3 -9 0 Z" fill="${W}"/>`),
    r_salat_kapusta: bowl('#d7ecae', `<path d="M14 22 l5 2 M21 19 l6 1 M30 21 l5 2 M17 18.5 l4 -1" stroke="${LG}" stroke-width="2.2"/><path d="M19 22 l5 -2 M27 23 l5 -1.5" stroke="${O}" stroke-width="2.2"/>`, G),
    r_salat_ovoshi: bowl('#d7ecae', `<circle cx="17" cy="21" r="4" fill="${G}"/><circle cx="17" cy="21" r="2.4" fill="${LG}" stroke="none"/><circle cx="31" cy="21" r="4" fill="${G}"/><circle cx="31" cy="21" r="2.4" fill="${LG}" stroke="none"/><path d="M20 19 a5 5 0 0 1 9 0 Z" fill="${R}"/>`, G),

    // еда из ситуаций
    pizza: `
      <path d="M6 14 C18 8 32 8 42 14 L24 43 Z" fill="${Y}"/>
      <path d="M6 14 C18 8 32 8 42 14 L40.5 17 C30 12 18 12 7.5 17 Z" fill="${LB}"/>
      <circle cx="20" cy="22" r="3" fill="${R}"/><circle cx="29" cy="21" r="2.6" fill="${R}"/><circle cx="24" cy="31" r="2.6" fill="${R}"/>`,
    soup_box: `
      <path d="M18 12 c-2 -3 2 -4 0 -7 M28 12 c-2 -3 2 -4 0 -7" stroke-width="1.6" stroke-opacity=".55"/>
      <path d="M10 17 H38 L35 41 a2 2 0 0 1 -2 2 H15 a2 2 0 0 1 -2 -2 Z" fill="${W}"/>
      <rect x="8" y="13" width="32" height="5.5" rx="2" fill="${BL}"/>
      <path d="M11.5 27 H36.5 L35.6 34 H12.4 Z" fill="${O}"/>${hl('M14 22 L15 38')}`,
    kotlety: plate(`<path d="M9 31 C9 23 22 22 24 30 C20 34 12 34 9 31 Z" fill="#f3e1a6"/>
      <ellipse cx="29" cy="27" rx="7" ry="4.5" fill="#8a4b2a"/><ellipse cx="33" cy="32" rx="7" ry="4.5" fill="#8a4b2a"/>${hl('M27 25 h4')}`),
    pirozhki: `
      <path d="M5 27 C5 19 23 17 26 25 C24 32 7 33 5 27 Z" fill="#e3a14c"/>
      <path d="M22 33 C22 25 41 23 43 31 C41 38 24 39 22 33 Z" fill="#d88f3a"/>
      <path d="M8 24 c2 2 4 -1 6 1 s4 -1 6 1" stroke-width="1.2" stroke-opacity=".5"/>
      <path d="M25 30 c2 2 4 -1 6 1 s4 -1 6 1" stroke-width="1.2" stroke-opacity=".5"/>
      ${hl('M9 23 C11 21.5 14 21 17 21')}`,
    energy: `
      <path d="M15 9 H33 V39 a2 2 0 0 1 -2 2 H17 a2 2 0 0 1 -2 -2 Z" fill="#2b2a33"/>
      <rect x="15" y="6" width="18" height="4" rx="1" fill="${GR}"/>
      <path d="M26 14 L18 27 H24 L21 37 L30 23 H24 Z" fill="${Y}"/>
      ${hl('M18 13 V20')}`,
  };

  // Еда из жизненных ситуаций: название → стикер
  const EXTRA = {
    'Бургер, картошка и напиток': 'fastfood',
    'Пицца с доставкой': 'pizza',
    'Суп с доставкой': 'soup_box',
    'Котлеты с пюре': 'kotlety',
    'Пирожки с капустой': 'pirozhki',
    'Энергетик': 'energy',
    'Плов вскладчину': 'r_plov',
  };
  const byName = {};
  (N.products || []).forEach((p) => { if (S[p.id]) byName[p.name] = p.id; });
  (N.outside || []).forEach((o) => { if (S[o.id]) byName[o.name] = o.id; });
  (N.recipes || []).forEach((r) => { if (S['r_' + r.id]) byName[r.name] = 'r_' + r.id; });
  Object.assign(byName, EXTRA);

  // Наклон стикера зависит от его имени — один и тот же стикер всегда наклеен одинаково
  function tilt(key) {
    let h = 0;
    for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return (h % 9) - 4;
  }
  function html(key) {
    const body = S[key];
    if (!body) return '';
    return `<svg class="stk" viewBox="0 0 48 48" style="--tilt:${tilt(key)}deg" aria-hidden="true" focusable="false"><g fill="none" stroke="${K}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>`;
  }
  // Картинка для продукта, блюда или записи в дневнике еды. Если стикера нет — эмодзи.
  function pic(item) {
    const key = item && byName[item.name];
    return key ? html(key) : '';
  }

  const nameOf = (key) => Object.keys(byName).find((n) => byName[n] === key) || key;
  N.stickers = { keys: Object.keys(S), html, pic, nameOf, forName: (name) => byName[name] || null };
})(window.NNS);

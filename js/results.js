// Код итога недели и сводка по группе для наставника. Без DOM — проверяется тестами.
//
// В конце игры игрок получает код вида «4КМТ-Р7ВЖ-ДХ9С» и отправляет его в чат группы.
// Наставник вставляет переписку на экране «Итоги группы» — коды находятся сами, а игра считает,
// у кого сколько звёзд и о чём поговорить на разборе. Сервер не нужен.
// В коде нет имени и других персональных данных: только регион, герой, уровень, звёзды и несколько цифр недели.
(function (N) {
  'use strict';
  const G = N.engine;

  // 32 символа: цифры 2–9 и русские буквы без похожих на цифры (О, З, Б) и редких (Ё, Й, Ъ, Ь, Ы, Щ).
  const ABC = '23456789АВГДЕЖИКЛМНПРСТУФХЦЧШЭЮЯ';
  // Что люди путают при наборе: похожие латинские буквы, Ё/Й, З вместо 3, Б вместо 6.
  const LOOKALIKE = { Ё: 'Е', Й: 'И', З: '3', Б: '6', A: 'А', B: 'В', C: 'С', E: 'Е', H: 'Н', K: 'К', M: 'М', P: 'Р', T: 'Т', X: 'Х', Y: 'У' };
  const DATA_LEN = 10; // 10 символов × 5 бит = 50 бит данных, ещё 2 символа — проверка от опечаток

  // Поля кода: [имя, бит]. Порядок не менять — иначе старые коды прочитаются неправильно.
  // Сначала то, что у игроков разное (звёзды, деньги), в конце — общее для группы (регион, неделя).
  const FIELDS = [
    ['s_money', 2], ['s_kcal', 2], ['s_prot', 2], ['s_vf', 2], ['s_waste', 2], ['s_mood', 2],
    ['money', 7], ['waste', 6], ['cafe', 6], ['attempt', 2],
    ['hero', 1], ['level', 2], ['week', 6], ['region', 7], ['ver', 1],
  ];
  // Каждый символ зависит от предыдущего — так коды одной группы не начинаются одинаково и их не перепутать.
  function mix(syms) {
    let prev = 0;
    return syms.map((v, i) => (prev = (v + prev * 7 + i * 13) % 32));
  }
  function unmix(syms) {
    let prev = 0;
    return syms.map((x, i) => {
      const v = (((x - prev * 7 - i * 13) % 32) + 32) % 32;
      prev = x;
      return v;
    });
  }
  const HEROES = ['anya', 'misha'];
  const LEVELS = ['easy', 'normal', 'hard'];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const weekOf = (seed) => G.hash(G.normCode(seed)) % 64;

  // Две проверочные буквы. Первая ловит любую одну опечатку (веса нечётные, поэтому замена символа
  // всегда меняет сумму по модулю 32), вторая — хэш, ловит перестановки и случайный мусор.
  function checks(syms) {
    let c1 = 0;
    syms.forEach((v, i) => { c1 += (2 * i + 1) * v; });
    const c2 = G.hash(syms.map((v) => ABC[v]).join('')) % 32;
    return [c1 % 32, c2];
  }

  // Что попадает в код из законченной игры.
  function fieldsOf(state, rep) {
    const r = rep || G.report(state);
    const stars = {};
    for (const m of r.metrics) stars[m.id] = m.stars;
    return {
      region: state.region, hero: state.hero, level: state.level, seed: state.seed, stars,
      moneyPct: (state.money / state.budget) * 100, waste: state.waste, cafe: r.stats.cafe, attempt: state.attempt || 1,
    };
  }

  function encode(f) {
    const vals = {
      ver: 0,
      region: Math.max(0, N.prices.regions.findIndex((x) => x.code === f.region)),
      hero: Math.max(0, HEROES.indexOf(f.hero)),
      level: Math.max(0, LEVELS.indexOf(f.level)),
      week: weekOf(f.seed),
      money: clamp(Math.round(f.moneyPct), -63, 64) + 63, // остаток денег в % от бюджета
      waste: clamp(Math.round(f.waste / 10), 0, 63),      // выброшено, шаг 10 ₽ (до 630 ₽)
      cafe: clamp(Math.round(f.cafe / 20), 0, 63),        // кафе и доставка, шаг 20 ₽ (до 1260 ₽)
      attempt: clamp(Math.round(f.attempt || 1), 1, 4) - 1,
    };
    for (const m of G.METRICS) vals['s_' + m.id] = clamp(Math.round(f.stars[m.id] || 0), 0, 3);
    let n = 0;
    for (const [k, bits] of FIELDS) n = n * 2 ** bits + vals[k]; // 50 бит — точно помещается в число JS
    const raw = [];
    for (let i = 0; i < DATA_LEN; i++) { raw.unshift(n % 32); n = Math.floor(n / 32); }
    const syms = mix(raw);
    const s = syms.concat(checks(syms)).map((v) => ABC[v]).join('');
    return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
  }

  function clean(text) {
    return String(text || '').toUpperCase().replace(/[ЁЙЗБABCEHKMPTXY]/g, (c) => LOOKALIKE[c]);
  }

  function decode(code) {
    const s = clean(code).replace(/[\s-]/g, '');
    if (s.length !== DATA_LEN + 2) return null;
    const v = Array.from(s, (c) => ABC.indexOf(c));
    if (v.some((x) => x < 0)) return null;
    const data = v.slice(0, DATA_LEN);
    const [c1, c2] = checks(data);
    if (v[DATA_LEN] !== c1 || v[DATA_LEN + 1] !== c2) return null;
    let n = 0;
    for (const x of unmix(data)) n = n * 32 + x;
    const vals = {};
    for (let i = FIELDS.length - 1; i >= 0; i--) {
      const [k, bits] = FIELDS[i];
      vals[k] = n % 2 ** bits;
      n = Math.floor(n / 2 ** bits);
    }
    const region = N.prices.regions[vals.region];
    if (vals.ver !== 0 || !region || vals.level >= LEVELS.length) return null;
    const stars = {};
    let total = 0;
    for (const m of G.METRICS) { stars[m.id] = vals['s_' + m.id]; total += stars[m.id]; }
    return {
      code: `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`,
      region: region.code, regionName: region.name, hero: HEROES[vals.hero], level: LEVELS[vals.level], week: vals.week,
      stars, total, moneyPct: vals.money - 63, waste: vals.waste * 10, cafe: vals.cafe * 20, attempt: vals.attempt + 1,
    };
  }

  // Находит все коды в любом тексте: можно вставить переписку из чата целиком.
  const RE = new RegExp(`(^|[^${ABC}])([${ABC}]{4})[\\s-]?([${ABC}]{4})[\\s-]?([${ABC}]{4})(?![${ABC}])`, 'g');
  function extract(text) {
    const list = [];
    const seen = new Set();
    let bad = 0;
    for (const m of clean(text).matchAll(RE)) {
      const r = decode(m[2] + m[3] + m[4]);
      if (!r) {
        if (/^[^-]{4}-[^-]{4}-/.test(m[0].slice(m[1].length))) bad++; // похоже на код, но с опечаткой
        continue;
      }
      if (seen.has(r.code)) continue; // один и тот же код прислали дважды
      seen.add(r.code);
      list.push(r);
    }
    return { list, bad };
  }

  function summarize(list) {
    if (!list.length) return null;
    const avg = (arr) => arr.reduce((s, x) => s + x, 0) / arr.length;
    const per = G.METRICS.map((m) => ({
      ...m,
      avg: avg(list.map((r) => r.stars[m.id])),
      weak: list.filter((r) => r.stars[m.id] <= 1).length,
    }));
    // О чём говорить на разборе: где больше всего слабых результатов
    const topics = per.filter((m) => m.weak > 0).sort((a, b) => b.weak - a.weak || a.avg - b.avg).slice(0, 2);
    const first = list.filter((r) => r.attempt === 1);
    const repeat = list.filter((r) => r.attempt > 1);
    return {
      n: list.length, max: G.METRICS.length * 3,
      avgTotal: avg(list.map((r) => r.total)),
      per, topics,
      minus: list.filter((r) => r.moneyPct < 0).length,
      wasteSum: list.reduce((s, r) => s + r.waste, 0),
      cafeAvg: avg(list.map((r) => r.cafe)),
      weeks: new Set(list.map((r) => r.week)).size,
      regions: new Set(list.map((r) => r.region)).size,
      first: first.length ? { n: first.length, avg: avg(first.map((r) => r.total)) } : null,
      repeat: repeat.length ? { n: repeat.length, avg: avg(repeat.map((r) => r.total)) } : null,
    };
  }

  // Пример переписки группы из 9 человек — чтобы посмотреть экран без настоящего занятия.
  // [герой, звёзды: бюджет, сытость, белок, овощи, отходы, настроение; остаток денег %; выброшено ₽; кафе ₽; попытка]
  const SAMPLE = [
    ['anya', [3, 2, 1, 0, 3, 2], 12, 30, 0, 1],
    ['misha', [0, 3, 2, 1, 2, 3], -8, 120, 640, 1],
    ['anya', [2, 2, 1, 1, 1, 2], 4, 210, 180, 1],
    ['misha', [3, 1, 0, 0, 3, 1], 35, 0, 0, 1],
    ['anya', [1, 3, 2, 1, 2, 3], 2, 90, 360, 1],
    ['misha', [2, 2, 1, 0, 2, 2], 6, 140, 120, 1],
    ['anya', [3, 3, 2, 2, 3, 3], 18, 20, 0, 2],
    ['misha', [2, 3, 3, 1, 3, 3], 9, 40, 180, 2],
    ['anya', [3, 2, 2, 1, 2, 3], 14, 60, 0, 2],
  ];
  function sample(region, seed) {
    return SAMPLE.map(([hero, s, moneyPct, waste, cafe, attempt], i) => {
      const stars = {};
      G.METRICS.forEach((m, k) => { stars[m.id] = s[k]; });
      const code = encode({ region, hero, level: 'normal', seed, stars, moneyPct, waste, cafe, attempt });
      const total = s.reduce((a, b) => a + b, 0);
      return `Участник ${i + 1}: Неделя на свои — ${total} из 18 ★. Код итога: ${code}`;
    }).join('\n');
  }

  N.results = { ABC, encode, decode, extract, summarize, fieldsOf, sample, weekOf };
})(window.NNS);

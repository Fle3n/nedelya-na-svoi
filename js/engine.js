// Игровая логика «Недели на свои». Без DOM: всё, что здесь есть, проверяется в tests/tests.html.
window.NNS = window.NNS || {};

(function (N) {
  'use strict';

  const DAYS = 7;
  const WEEKDAYS = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];
  const SLOTS = [
    { id: 'b', name: 'Завтрак', emoji: '🌅' },
    { id: 'l', name: 'Обед', emoji: '☀️' },
    { id: 'd', name: 'Ужин', emoji: '🌙' },
  ];

  const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
  const P = byId(N.products);
  const R = byId(N.recipes);
  const E = byId(N.events);
  const O = byId(N.outside);
  const H = byId(N.heroes);
  const L = byId(N.levels);

  // ---------- случайность по коду недели ----------
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function rng(seed) {
    let a = typeof seed === 'number' ? seed : hash(String(seed));
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function randomCode() {
    const abc = 'АБВГДЕЖЗИКЛМНПРСТУФХ';
    let s = '';
    for (let i = 0; i < 4; i++) s += abc[Math.floor(Math.random() * abc.length)];
    return s + '-' + String(Math.floor(10 + Math.random() * 90));
  }
  function normCode(code) {
    return String(code || '').trim().toUpperCase().replace(/\s+/g, '');
  }

  // ---------- цены ----------
  function regionRow(code) {
    return N.prices.regions.find((r) => r.code === code) || N.prices.regions[0];
  }
  function unitPrices(code) {
    const row = regionRow(code);
    const rf = N.prices.regions[0];
    const out = {};
    N.prices.keys.forEach((k, i) => { out[k] = row.p[i] != null ? row.p[i] : rf.p[i]; });
    return out;
  }
  function rawPackPrice(units, pid) {
    const p = P[pid];
    const unit = units[pid];
    if (unit == null) throw new Error('Нет цены для ' + pid);
    return p.basis === 'pack' ? unit : (unit * p.pack) / 1000;
  }
  function basePackPrice(state, pid) {
    return Math.max(1, Math.round(rawPackPrice(state.units, pid)));
  }
  function promoFor(state, pid, day) {
    const list = state.plan.promos[day || state.day] || [];
    const pr = list.find((x) => x.pid === pid);
    return pr ? pr.pct : 0;
  }
  function packPrice(state, pid, day) {
    const base = basePackPrice(state, pid);
    const pct = promoFor(state, pid, day);
    return { price: pct ? Math.round(base * (1 - pct / 100)) : base, base, pct };
  }
  function outsidePrice(state, id) {
    return Math.round(state.units[id]);
  }
  function basketCost(code) {
    const units = unitPrices(code);
    return Object.entries(N.referenceBasket).reduce((s, [pid, q]) => s + rawPackPrice(units, pid) * q, 0);
  }
  function budgetFor(code, levelId) {
    const k = (L[levelId] || L.normal).k;
    return Math.round((basketCost(code) * k) / 50) * 50;
  }
  // Источники белка: мясо, рыба, яйца, молочное и бобовые. Крупы и макароны сюда не входят —
  // белка в них есть, но он неполноценный, и учить подростков «гречка = белок» неправильно.
  function isProteinSource(p) {
    return p.prot >= 10 && !p.treat && (p.cat === 'meat' || p.cat === 'dairy' || p.id === 'goroh');
  }
  function isAnimal(p) {
    return p.cat === 'meat' || p.cat === 'dairy';
  }
  // Сколько стоит 10 г белка у каждого источника белка в регионе — для подсказок и шпаргалки наставника
  function proteinRanking(code) {
    const units = unitPrices(code);
    return N.products
      .filter(isProteinSource)
      .map((p) => {
        const price = rawPackPrice(units, p.id);
        return { pid: p.id, name: p.name, emoji: p.emoji, animal: isAnimal(p), rubPer10g: (price / ((p.pack * p.prot) / 100)) * 10 };
      })
      .sort((a, b) => a.rubPer10g - b.rubPer10g);
  }
  function vfRanking(code) {
    const units = unitPrices(code);
    return N.products
      .filter((p) => p.vf)
      .map((p) => ({ pid: p.id, name: p.name, emoji: p.emoji, rubPerKg: (rawPackPrice(units, p.id) / p.pack) * 1000 }))
      .sort((a, b) => a.rubPerKg - b.rubPerKg);
  }

  // ---------- план недели: события и акции ----------
  function pickEvents(seed) {
    const rand = rng(hash(seed + '|events'));
    const plan = {};
    const used = new Set();
    for (let day = 2; day <= DAYS; day++) {
      const fits = N.events.filter((e) => !used.has(e.id) && (e.minDay || 1) <= day && (e.maxDay || DAYS) >= day);
      const ev = fits[Math.floor(rand() * fits.length)];
      if (ev) { plan[day] = ev.id; used.add(ev.id); }
    }
    return plan;
  }
  function pickPromos(seed) {
    const rand = rng(hash(seed + '|promos'));
    const plan = {};
    for (let day = 1; day <= DAYS; day++) {
      const pool = N.promos.slice();
      const picked = [];
      while (picked.length < 3 && pool.length) {
        picked.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
      }
      plan[day] = picked;
    }
    return plan;
  }

  // ---------- новая игра ----------
  function newDay() {
    return { meals: { b: null, l: null, d: null }, snacks: [], extra: [] };
  }
  function newGame(opts) {
    const region = opts.region || N.prices.regions[0].code;
    const hero = H[opts.hero] ? opts.hero : 'anya';
    const level = L[opts.level] ? opts.level : 'normal';
    const seed = normCode(opts.seed) || randomCode();
    const budget = budgetFor(region, level);
    return {
      v: 1, seed, region, hero, level, budget,
      units: unitPrices(region),
      money: budget, day: 1, mood: 70, finished: false,
      pantry: [], dishes: [], uid: 1,
      days: { 1: newDay() },
      history: [],
      waste: 0, wasteLog: [],
      spent: { shop: 0, outside: 0, events: 0, treats: 0 },
      gained: 0,
      purchases: [],
      loans: [], notices: [],
      plan: { events: pickEvents(seed), promos: pickPromos(seed) },
      eventDone: {},
      cooked: 0,
    };
  }

  // ---------- холодильник ----------
  function addPantry(state, pid, g, cpg, shelf) {
    const p = P[pid];
    const entry = {
      uid: state.uid++, pid, g, cpg,
      exp: state.day + (shelf || p.shelf) - 1,
      frozen: !!p.frozen,
    };
    state.pantry.push(entry);
    return entry;
  }
  function stock(state, pid) {
    return state.pantry.filter((e) => e.pid === pid).reduce((s, e) => s + e.g, 0);
  }
  // Списывает граммы, начиная с того, что испортится раньше. Возвращает стоимость списанного.
  function take(state, pid, g) {
    let left = g;
    let cost = 0;
    const entries = state.pantry.filter((e) => e.pid === pid).sort((a, b) => a.exp - b.exp);
    for (const e of entries) {
      if (left <= 0) break;
      const use = Math.min(e.g, left);
      e.g -= use;
      left -= use;
      cost += use * e.cpg;
    }
    state.pantry = state.pantry.filter((e) => e.g > 0.0001);
    if (left > 0.5) throw new Error('Не хватает ' + pid);
    return cost;
  }
  function pantryView(state) {
    const groups = {};
    for (const e of state.pantry) {
      const gr = groups[e.pid] || (groups[e.pid] = { pid: e.pid, g: 0, exp: Infinity, frozen: true, value: 0 });
      gr.g += e.g;
      gr.exp = Math.min(gr.exp, e.exp);
      gr.frozen = gr.frozen && e.frozen;
      gr.value += e.g * e.cpg;
    }
    return Object.values(groups).sort((a, b) => a.exp - b.exp);
  }
  function freeze(state, pid) {
    if (!P[pid] || !P[pid].freeze) return false;
    let changed = false;
    for (const e of state.pantry) {
      if (e.pid === pid && !e.frozen) {
        e.frozen = true;
        e.exp = Math.max(e.exp, state.day + 60);
        changed = true;
      }
    }
    return changed;
  }

  // ---------- магазин ----------
  function cartTotal(state, cart) {
    return Object.entries(cart).reduce((s, [pid, q]) => s + packPrice(state, pid).price * q, 0);
  }
  function buy(state, cart) {
    const items = Object.entries(cart).filter(([, q]) => q > 0);
    const total = cartTotal(state, cart);
    if (!items.length) return { ok: false, reason: 'Корзина пуста' };
    if (total > state.money) return { ok: false, reason: 'Не хватает денег' };
    for (const [pid, q] of items) {
      const { price } = packPrice(state, pid);
      for (let i = 0; i < q; i++) addPantry(state, pid, P[pid].pack, price / P[pid].pack);
      if (P[pid].treat) state.spent.treats += price * q;
      state.purchases.push({ day: state.day, pid, q, price });
    }
    state.money -= total;
    state.spent.shop += total;
    return { ok: true, total };
  }

  // ---------- кухня ----------
  function recipeNutrition(rid) {
    const r = R[rid];
    let kcal = 0, prot = 0, vf = 0;
    for (const [pid, g] of r.ing) {
      const p = P[pid];
      kcal += (g * p.kcal) / 100;
      prot += (g * p.prot) / 100;
      if (p.vf) vf += g;
    }
    return { kcal: Math.round(kcal), prot: Math.round(prot * 10) / 10, vf: Math.round(vf) };
  }
  function missingFor(state, rid, portions) {
    const n = portions || 1;
    return R[rid].ing
      .map(([pid, g]) => ({ pid, need: g * n, have: stock(state, pid) }))
      .filter((x) => x.have + 0.5 < x.need);
  }
  function maxPortions(state, rid) {
    return Math.min(...R[rid].ing.map(([pid, g]) => Math.floor((stock(state, pid) + 0.5) / g)));
  }
  function cook(state, rid, portions) {
    const n = Math.max(1, portions || 1);
    const r = R[rid];
    if (missingFor(state, rid, n).length) return { ok: false, reason: 'Не хватает продуктов' };
    let cost = 0;
    for (const [pid, g] of r.ing) cost += take(state, pid, g * n);
    const nut = recipeNutrition(rid);
    const dish = {
      uid: state.uid++, rid, name: r.name, emoji: r.emoji, portions: n,
      kcal: nut.kcal, prot: nut.prot, vf: nut.vf, cpp: cost / n,
      exp: state.day + r.keep - 1,
    };
    state.dishes.push(dish);
    state.cooked += 1;
    return { ok: true, dish };
  }

  // ---------- еда ----------
  function eat(state, slot, src) {
    const day = state.days[state.day];
    if (slot !== 's' && day.meals[slot]) return { ok: false, reason: 'Этот приём пищи уже был' };
    let entry;
    if (src.type === 'dish') {
      const dish = state.dishes.find((d) => d.uid === src.uid);
      if (!dish || dish.portions < 1) return { ok: false, reason: 'Блюдо закончилось' };
      dish.portions -= 1;
      state.dishes = state.dishes.filter((d) => d.portions > 0);
      entry = { kind: 'home', name: dish.name, emoji: dish.emoji, kcal: dish.kcal, prot: dish.prot, vf: dish.vf, cost: dish.cpp };
    } else if (src.type === 'product') {
      const p = P[src.pid];
      const g = Math.min(p.snack, stock(state, src.pid));
      if (!p.snack || g < 1) return { ok: false, reason: 'Нечего съесть' };
      const cost = take(state, src.pid, g);
      entry = {
        kind: p.treat ? 'treat' : 'snack', name: p.name, emoji: p.emoji,
        kcal: Math.round((g * p.kcal) / 100), prot: Math.round((g * p.prot) / 10) / 10, vf: p.vf ? g : 0, cost,
      };
    } else if (src.type === 'outside') {
      const o = O[src.id];
      const price = outsidePrice(state, src.id);
      if (price > state.money) return { ok: false, reason: 'Не хватает денег' };
      state.money -= price;
      state.spent.outside += price;
      if (o.treat) state.spent.treats += price;
      entry = { kind: o.treat ? 'treat' : 'outside', name: o.name, emoji: o.emoji, kcal: o.kcal, prot: o.prot, vf: o.vf, cost: price };
    } else {
      return { ok: false, reason: 'Неизвестная еда' };
    }
    if (slot === 's') day.snacks.push(entry); else day.meals[slot] = entry;
    return { ok: true, entry };
  }
  function dayEntries(state, dayN) {
    const d = state.days[dayN || state.day];
    if (!d) return [];
    return [d.meals.b, d.meals.l, d.meals.d, ...d.snacks, ...d.extra].filter(Boolean);
  }
  function dayTotals(state, dayN) {
    const t = { kcal: 0, prot: 0, vf: 0, treats: 0 };
    for (const e of dayEntries(state, dayN)) {
      t.kcal += e.kcal; t.prot += e.prot; t.vf += e.vf;
      if (e.kind === 'treat') t.treats += 1;
    }
    t.kcal = Math.round(t.kcal);
    t.prot = Math.round(t.prot);
    t.vf = Math.round(t.vf);
    return t;
  }
  function norms(state) {
    const h = H[state.hero];
    return { kcal: h.kcal, prot: h.prot, vf: N.vfNorm };
  }

  // ---------- события ----------
  function todayEvent(state) {
    const id = state.plan.events[state.day];
    if (!id || state.eventDone[state.day]) return null;
    return E[id];
  }
  function choiceCost(state, choice) {
    const c = choice.cost;
    if (!c) return 0;
    if (typeof c === 'number') return c;
    const base = P[c.price] ? basePackPrice(state, c.price) : outsidePrice(state, c.price);
    return Math.round(base * (c.mult || 1));
  }
  function choiceAvailable(state, ev, idx) {
    const cost = choiceCost(state, ev.choices[idx]);
    // если выбор единственный — он обязательный, даже если денег не хватает (уходишь в минус)
    return ev.choices.length === 1 || cost <= state.money;
  }
  function clampMood(state) {
    state.mood = Math.max(0, Math.min(100, Math.round(state.mood)));
  }
  function applyChoice(state, idx) {
    const ev = todayEvent(state);
    if (!ev) return { ok: false, reason: 'Сегодня событий нет' };
    const ch = ev.choices[idx];
    if (!ch || !choiceAvailable(state, ev, idx)) return { ok: false, reason: 'Нельзя выбрать' };
    const cost = choiceCost(state, ch);
    state.money -= cost;
    state.spent.events += cost;
    if (ch.gain) { state.money += ch.gain; state.gained += ch.gain; }
    if (ch.mood) state.mood += ch.mood;
    for (const a of ch.add || []) {
      const p = P[a.pid];
      const cpg = (basePackPrice(state, a.pid) / p.pack) * (a.paid == null ? 1 : a.paid);
      addPantry(state, a.pid, a.g, cpg, a.shelf);
    }
    if (ch.eat) {
      state.days[state.day].extra.push({ kind: ch.eat.treat ? 'treat' : 'outside', ...ch.eat, cost });
      if (ch.eat.treat) state.spent.treats += cost;
    }
    if (ch.dish) {
      const d = ch.dish;
      state.dishes.push({
        uid: state.uid++, rid: null, name: d.name, emoji: d.emoji, portions: d.portions,
        kcal: d.kcal, prot: d.prot, vf: d.vf, cpp: cost / d.portions, exp: state.day + d.keep - 1,
      });
    }
    if (ch.spoil) {
      for (const e of state.pantry) if (!e.frozen && P[e.pid].shelf <= 14) e.exp -= ch.spoil;
      for (const d of state.dishes) d.exp -= ch.spoil;
    }
    if (ch.loan) {
      const returns = rng(hash(state.seed + '|loan'))() < ch.loan.chance;
      state.loans.push({ day: ch.loan.day, amount: ch.loan.amount, returns });
    }
    clampMood(state);
    state.eventDone[state.day] = { id: ev.id, choice: idx };
    return { ok: true, result: ch.result, cost, gain: ch.gain || 0 };
  }

  // ---------- конец дня ----------
  function endDay(state) {
    if (state.finished) return null;
    const dayN = state.day;
    const t = dayTotals(state, dayN);
    const nr = norms(state);
    const d = state.days[dayN];
    const mains = [d.meals.b, d.meals.l, d.meals.d];
    const reasons = [];
    let delta = 0;

    const skipped = mains.filter((m) => !m).length;
    if (skipped) { delta -= 7 * skipped; reasons.push(`пропущено приёмов пищи: ${skipped}`); }
    if (t.kcal < nr.kcal * 0.7) { delta -= 6; reasons.push('голодно'); }
    else if (t.kcal >= nr.kcal * 0.9) { delta += 3; reasons.push('сыт'); }
    if (t.vf >= 300) { delta += 2; reasons.push('много овощей и фруктов'); }
    if (t.treats) { delta += Math.min(8, 4 * t.treats); reasons.push('вкусняшки'); }
    const names = mains.filter(Boolean).map((m) => m.name);
    if (names.length === 3 && new Set(names).size === 1) { delta -= 5; reasons.push('весь день одно и то же'); }
    state.mood += delta;
    clampMood(state);

    // что испортилось (в последний день не считаем — продукты остаются на следующую неделю)
    const spoiled = [];
    if (dayN < DAYS) {
      for (const e of state.pantry) {
        if (e.exp <= dayN) spoiled.push({ name: P[e.pid].name, emoji: P[e.pid].emoji, pid: e.pid, g: e.g, rub: e.g * e.cpg });
      }
      for (const dish of state.dishes) {
        if (dish.exp <= dayN) spoiled.push({ name: dish.name, emoji: dish.emoji, portions: dish.portions, rub: dish.portions * dish.cpp });
      }
      state.pantry = state.pantry.filter((e) => e.exp > dayN);
      state.dishes = state.dishes.filter((dd) => dd.exp > dayN);
      for (const s of spoiled) {
        state.waste += s.rub;
        state.wasteLog.push({ day: dayN, ...s });
      }
    }
    const wasteRub = spoiled.reduce((s, x) => s + x.rub, 0);

    const summary = {
      day: dayN, ...t,
      kcalPct: t.kcal / nr.kcal, protPct: t.prot / nr.prot, vfPct: t.vf / nr.vf,
      moodDelta: delta, mood: state.mood, reasons, spoiled, wasteRub,
    };
    state.history.push(summary);

    state.notices = [];
    if (dayN >= DAYS) {
      state.finished = true;
    } else {
      state.day = dayN + 1;
      state.days[state.day] = newDay();
      for (const loan of state.loans) {
        if (loan.day === state.day) {
          if (loan.returns) {
            state.money += loan.amount;
            state.gained += loan.amount;
            state.notices.push(`Сосед вернул долг: +${loan.amount} ₽`);
          } else {
            state.notices.push('Сосед так и не вернул 300 ₽. Обидно, но это опыт.');
          }
        }
      }
    }
    return summary;
  }

  // ---------- итоги недели ----------
  function stars(value, thresholds) {
    // thresholds: [для 1★, для 2★, для 3★]
    let s = 0;
    thresholds.forEach((th, i) => { if (value >= th) s = i + 1; });
    return s;
  }
  function avg(list) {
    return list.length ? list.reduce((s, x) => s + x, 0) / list.length : 0;
  }
  // Шесть показателей итогов. Порядок важен: по нему строится код итога для наставника (results.js).
  const METRICS = [
    { id: 'money', name: 'Бюджет', emoji: '💰' },
    { id: 'kcal', name: 'Сытость', emoji: '🍽️' },
    { id: 'prot', name: 'Белок', emoji: '💪' },
    { id: 'vf', name: 'Овощи и фрукты', emoji: '🥕' },
    { id: 'waste', name: 'Без отходов', emoji: '♻️' },
    { id: 'mood', name: 'Настроение', emoji: '🙂' },
  ];
  const MT = byId(METRICS);

  function report(state) {
    const nr = norms(state);
    const h = state.history;
    const kcalAvg = avg(h.map((x) => Math.min(1, x.kcalPct)));
    const protAvg = avg(h.map((x) => Math.min(1, x.protPct)));
    const vfAvg = avg(h.map((x) => Math.min(1, x.vfPct)));
    const protG = avg(h.map((x) => x.prot));
    const vfG = avg(h.map((x) => x.vf));
    const kcalN = avg(h.map((x) => x.kcal));
    const foodSpent = state.spent.shop || 1;
    const wastePct = state.waste / foodSpent;
    const leftover = state.pantry.reduce((s, e) => s + e.g * e.cpg, 0) + state.dishes.reduce((s, d) => s + d.portions * d.cpp, 0);
    const moneyShare = state.money / state.budget;

    const metrics = [
      { ...MT.money,
        stars: state.money < 0 ? 0 : stars(moneyShare, [0, 0.03, 0.1]),
        value: state.money < 0 ? `в минусе на ${Math.round(-state.money)} ₽` : `осталось ${Math.round(state.money)} ₽ из ${state.budget} ₽` },
      { ...MT.kcal, stars: stars(kcalAvg, [0.6, 0.75, 0.9]),
        value: `в среднем ${Math.round(kcalN)} ккал из ${nr.kcal} в день` },
      { ...MT.prot, stars: stars(protAvg, [0.6, 0.75, 0.9]),
        value: `в среднем ${Math.round(protG)} г из ${nr.prot} г в день` },
      { ...MT.vf, stars: stars(vfAvg, [0.25, 0.5, 0.8]),
        value: `в среднем ${Math.round(vfG)} г из ${nr.vf} г в день` },
      { ...MT.waste, stars: wastePct <= 0.03 ? 3 : wastePct <= 0.08 ? 2 : wastePct <= 0.15 ? 1 : 0,
        value: state.waste < 1 ? 'ничего не выброшено' : `выброшено на ${Math.round(state.waste)} ₽` },
      { ...MT.mood, stars: stars(state.mood, [30, 50, 70]), value: `${state.mood} из 100` },
    ];
    const total = metrics.reduce((s, m) => s + m.stars, 0);
    const title =
      total >= 16 ? { emoji: '🏆', text: 'Хозяин своей кухни' } :
      total >= 12 ? { emoji: '🌟', text: 'Уверенно справляешься' } :
      total >= 8 ? { emoji: '👍', text: 'Почти получилось' } :
      { emoji: '🥞', text: 'Первый блин комом — это нормально' };

    const protRank = proteinRanking(state.region);
    const vfRank = vfRanking(state.region);
    const tips = [];
    const eventsFood = Object.values(state.days).flatMap((d) => d.extra).reduce((s, e) => s + (e.cost || 0), 0);
    const cafe = state.spent.outside + eventsFood;
    if (cafe > 0) {
      const chickenKg = cafe / state.units.okorochka;
      tips.push(`На кафе и доставку ушло ${Math.round(cafe)} ₽. По ценам твоего региона это ${chickenKg.toFixed(1).replace('.', ',')} кг курицы — примерно ${Math.max(1, Math.round(chickenKg * 5))} порций домашней еды.`);
    }
    if (state.waste >= 1) {
      const worst = {};
      for (const w of state.wasteLog) worst[w.name] = (worst[w.name] || 0) + w.rub;
      const list = Object.entries(worst).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, r]) => `${n.toLowerCase()} (${Math.round(r)} ₽)`);
      tips.push(`Выброшено: ${list.join(', ')}. Скоропортящееся покупай небольшими порциями, а мясо и хлеб можно заморозить.`);
    }
    if (protAvg < 0.9) {
      const animal = protRank.filter((x) => x.animal).slice(0, 3).map((x) => `${x.name.toLowerCase()} — ${fmtRub(x.rubPer10g)}`).join(', ');
      const plant = protRank.find((x) => !x.animal);
      tips.push(`Белка не хватало (${Math.round(protG)} г из ${nr.prot} г). Дешевле всего 10 г белка в твоём регионе дают ${animal}${plant ? `, а из растительного — ${plant.name.toLowerCase()} (${fmtRub(plant.rubPer10g)})` : ''}.`);
    }
    if (vfAvg < 0.8) {
      const top = vfRank.slice(0, 3).map((x) => `${x.name.toLowerCase()} — ${Math.round(x.rubPerKg)} ₽/кг`).join(', ');
      tips.push(`Овощей и фруктов мало (${Math.round(vfG)} г из 400 г). Дешевле всего: ${top}.`);
    }
    if (kcalAvg < 0.75) tips.push('Ты часто ел меньше нормы. Каша, картошка и макароны — дешёвые калории, их можно варить сразу на несколько дней.');
    if (state.spent.treats > state.budget * 0.08) tips.push(`На сладкое, газировку и фастфуд — ${Math.round(state.spent.treats)} ₽. Это нормально, если заранее заложить такую сумму в бюджет.`);
    if (state.money >= state.budget * 0.1) tips.push(`Ты сохранил ${Math.round(state.money)} ₽ — это хорошая «подушка» на непредвиденные траты.`);
    if (state.money < 0) tips.push('Неделя закончилась в минусе. Попробуй с самого начала отложить 10% бюджета на непредвиденное.');
    if (!tips.length) tips.push('Отличная неделя! Попробуй уровень «Туго» или другой регион.');

    return {
      metrics, total, max: metrics.length * 3, title, tips, leftover,
      protRank, vfRank,
      stats: {
        spentShop: state.spent.shop, cafe, cooked: state.cooked, waste: state.waste,
        gained: state.gained, money: state.money, budget: state.budget,
      },
    };
  }

  // ---------- форматирование ----------
  function plural(n, forms) {
    const a = Math.abs(n) % 100;
    const b = a % 10;
    if (a > 10 && a < 20) return forms[2];
    if (b > 1 && b < 5) return forms[1];
    if (b === 1) return forms[0];
    return forms[2];
  }
  function fmtNum(n) {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  function fmtRub(n) {
    if (Math.abs(n) < 10 && Math.round(n) !== n) return n.toFixed(1).replace('.', ',') + ' ₽';
    return fmtNum(n) + ' ₽';
  }
  function fmtAmount(pid, g) {
    const p = P[pid];
    if (p.piece) {
      const n = Math.round(g / p.piece);
      return `${n} ${plural(n, p.pieceName)}`;
    }
    const unit = p.unit === 'мл' ? ['мл', 'л'] : ['г', 'кг'];
    if (g >= 1000) return (Math.round(g / 100) / 10).toString().replace('.', ',') + ' ' + unit[1];
    return Math.round(g) + ' ' + unit[0];
  }
  function fmtPack(pid) {
    const p = P[pid];
    if (p.basis === 'pack' && p.piece) return fmtAmount(pid, p.pack);
    return fmtAmount(pid, p.pack);
  }

  N.engine = {
    DAYS, WEEKDAYS, SLOTS, P, R, E, O, H, L,
    hash, rng, randomCode, normCode,
    unitPrices, basePackPrice, packPrice, outsidePrice, budgetFor, basketCost, isProteinSource, isAnimal, proteinRanking, vfRanking,
    newGame, addPantry, stock, take, pantryView, freeze,
    cartTotal, buy,
    recipeNutrition, missingFor, maxPortions, cook,
    eat, dayEntries, dayTotals, norms,
    todayEvent, choiceCost, choiceAvailable, applyChoice,
    endDay, METRICS, report,
    plural, fmtNum, fmtRub, fmtAmount, fmtPack,
  };
})(window.NNS);

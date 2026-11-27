// «Разумный игрок»: простая стратегия, которой пользуются демо-режим (?demo=final) и тест баланса.
// Если такой игрок не может хорошо прожить неделю на бюджет «Обычно» — значит, игра нечестная.
window.NNS = window.NNS || {};

(function (N) {
  'use strict';
  const G = N.engine;
  const MAINS = ['grechka_kur', 'gorohovy', 'makarony_flot', 'plov', 'borsch', 'makarony_tush', 'shchi', 'grechka_luk'];
  const BREAKFASTS = ['omlet', 'ovsyanka_yabl', 'ovsyanka', 'tvorog_smet'];

  // докупить недостающее для рецепта, если хватает денег
  function ensure(g, rid, n) {
    const cart = {};
    for (const m of G.missingFor(g, rid, n)) cart[m.pid] = Math.ceil((m.need - m.have) / G.P[m.pid].pack);
    if (!Object.keys(cart).length) return true;
    return G.buy(g, cart).ok;
  }
  function cookEnsured(g, rid, n) {
    if (!ensure(g, rid, n)) return null;
    const r = G.cook(g, rid, n);
    return r.ok ? r.dish : null;
  }
  function eatDish(g, slot, dish) {
    return dish ? G.eat(g, slot, { type: 'dish', uid: dish.uid }).ok : false;
  }
  function soonestDish(g, except) {
    return g.dishes.filter((d) => d.uid !== except).sort((a, b) => a.exp - b.exp)[0];
  }

  // opts.full — доедать до нормы (для списка покупок на неделю): больше перекусов хлебом, кефиром и бананами
  function playDay(g, opts) {
    const ev = G.todayEvent(g);
    if (ev) {
      // выбирает самый дешёвый доступный вариант
      let best = 0;
      ev.choices.forEach((c, i) => {
        if (G.choiceAvailable(g, ev, i) && G.choiceCost(g, c) < G.choiceCost(g, ev.choices[best])) best = i;
      });
      G.applyChoice(g, best);
    }
    // то, что скоро испортится, — в морозилку
    for (const v of G.pantryView(g)) {
      if (G.P[v.pid].freeze && !v.frozen && v.exp - g.day <= 1) G.freeze(g, v.pid);
    }
    const day = g.day;
    // завтрак
    const bf = BREAKFASTS[day % BREAKFASTS.length];
    eatDish(g, 'b', cookEnsured(g, bf, 1));
    // обед и ужин — из готового, иначе варим следующее блюдо по кругу
    for (const slot of ['l', 'd']) {
      let dish = soonestDish(g);
      if (!dish) {
        for (let k = 0; k < MAINS.length && !dish; k++) {
          const rid = MAINS[(day + k) % MAINS.length];
          dish = cookEnsured(g, rid, G.R[rid].batch);
        }
      }
      eatDish(g, slot, dish);
    }
    // овощи: салат из капусты
    if (G.dayTotals(g).vf < 300) {
      const sal = g.dishes.find((d) => d.rid === 'salat_kapusta') || cookEnsured(g, 'salat_kapusta', 2);
      eatDish(g, 's', sal);
    }
    // добрать калории хлебом, яблоками, кефиром
    const nr = G.norms(g);
    const TOPUP = opts && opts.full ? ['yabloki', 'hleb', 'kefir', 'banany', 'hleb', 'moloko', 'hleb', 'baton', 'hleb'] : ['yabloki', 'hleb', 'kefir', 'hleb'];
    for (const pid of TOPUP) {
      if (G.dayTotals(g).kcal >= nr.kcal * 0.95) break;
      if (G.stock(g, pid) < G.P[pid].snack && G.packPrice(g, pid).price <= g.money * 0.3) G.buy(g, { [pid]: 1 });
      if (G.stock(g, pid) >= 1) G.eat(g, 's', { type: 'product', pid });
    }
    // если ещё голодно — лишняя порция основного блюда
    if (G.dayTotals(g).kcal < nr.kcal * 0.85) eatDish(g, 's', soonestDish(g));
    return G.endDay(g);
  }

  function playWeek(g, days, opts) {
    const until = days || G.DAYS;
    while (!g.finished && g.day <= until) {
      const before = g.day;
      playDay(g, opts);
      if (g.day === before && !g.finished) break;
    }
    return g;
  }

  N.autoplay = { playDay, playWeek };
})(window.NNS);

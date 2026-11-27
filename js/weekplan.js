// План настоящей недели: список покупок и меню на 7 дней по ценам региона. Без DOM — проверяется тестами.
//
// Неделю проживает «разумный игрок» из autoplay.js, но без жизненных ситуаций и без акций:
// только обычные цены Росстата. Что он купил — это список покупок, что ел — меню.
// Такой список подросток может взять в настоящий магазин, а наставник — дать как домашнее задание.
(function (N) {
  'use strict';
  const G = N.engine;

  function weekPlan(opts) {
    const g = G.newGame({ region: opts.region, hero: opts.hero, level: opts.level, seed: 'СПИСОК' });
    g.plan = { events: {}, promos: {} }; // без случайностей: обычные цены, никаких ситуаций
    N.autoplay.playWeek(g, G.DAYS, { full: true }); // доедать до нормы: в настоящей неделе голодать не нужно
    const report = G.report(g);

    // Покупки по дням: сколько упаковок и за сколько
    const byDay = {};
    const byProduct = {};
    for (const b of g.purchases) {
      const d = byDay[b.day] || (byDay[b.day] = { day: b.day, items: {}, total: 0 });
      const it = d.items[b.pid] || (d.items[b.pid] = { pid: b.pid, q: 0, price: b.price });
      it.q += b.q;
      d.total += b.price * b.q;
      const all = byProduct[b.pid] || (byProduct[b.pid] = { pid: b.pid, q: 0, price: b.price, sum: 0 });
      all.q += b.q;
      all.sum += b.price * b.q;
    }
    const trips = Object.values(byDay).sort((a, b) => a.day - b.day).map((d) => ({
      day: d.day, total: d.total,
      items: Object.values(d.items).sort((a, b) => order(a.pid) - order(b.pid)),
    }));
    const products = Object.values(byProduct).sort((a, b) => order(a.pid) - order(b.pid));
    const total = products.reduce((s, x) => s + x.sum, 0);

    // Меню: что было на завтрак, обед, ужин и перекус каждый день
    const menu = [];
    for (let d = 1; d <= G.DAYS; d++) {
      const day = g.days[d];
      if (!day) continue;
      menu.push({
        day: d,
        meals: G.SLOTS.map((sl) => ({ slot: sl.id, name: day.meals[sl.id] ? day.meals[sl.id].name : '' })),
        snacks: day.snacks.map((x) => x.name),
      });
    }
    const cooked = {};
    for (const m of menu) for (const x of m.meals) if (x.name) cooked[x.name] = (cooked[x.name] || 0) + 1;

    const h = g.history;
    const avg = (k) => (h.length ? h.reduce((s, x) => s + x[k], 0) / h.length : 0);
    return {
      region: g.region, hero: g.hero, level: g.level, budget: g.budget,
      total, left: g.budget - total, trips, products, menu,
      norms: G.norms(g),
      perDay: { kcal: avg('kcal'), prot: avg('prot'), vf: avg('vf') },
      report, leftover: report.leftover,
    };
  }

  // Порядок как в магазине: по отделам
  const CAT = N.categories.map((c) => c.id);
  function order(pid) {
    const p = G.P[pid];
    return CAT.indexOf(p.cat) * 100 + N.products.indexOf(p);
  }

  // Текст списка, чтобы скопировать в заметки или мессенджер
  function asText(plan, regionName) {
    const lines = [`Список покупок на неделю — ${regionName}`, `Бюджет ${G.fmtRub(plan.budget)}, по списку ${G.fmtRub(plan.total)}`, ''];
    for (const t of plan.trips) {
      lines.push(`${G.WEEKDAYS[t.day - 1][0].toUpperCase() + G.WEEKDAYS[t.day - 1].slice(1)} — ${G.fmtRub(t.total)}`);
      for (const it of t.items) lines.push(`☐ ${G.P[it.pid].name} — ${it.q} × ${G.fmtPack(it.pid)}, ${G.fmtRub(it.price * it.q)}`);
      lines.push('');
    }
    lines.push('Составлено в игре «Неделя на свои»: https://fle3n.github.io/nedelya-na-svoi/');
    return lines.join('\n');
  }

  N.weekPlan = { make: weekPlan, asText };
})(window.NNS);

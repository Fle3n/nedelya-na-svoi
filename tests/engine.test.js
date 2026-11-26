// Мини-набор тестов без зависимостей: откройте tests/tests.html в браузере.
(function () {
  'use strict';
  const N = window.NNS;
  const G = N.engine;
  const results = [];

  function test(name, fn) {
    try { fn(); results.push({ name, ok: true }); }
    catch (e) { results.push({ name, ok: false, error: e && e.stack ? e.stack : String(e) }); }
  }
  function eq(a, b, msg) { if (a !== b) throw new Error(`${msg || 'ожидалось равенство'}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`); }
  function ok(v, msg) { if (!v) throw new Error(msg || 'ожидалось true'); }
  function near(a, b, eps, msg) { if (Math.abs(a - b) > eps) throw new Error(`${msg || 'ожидалось ≈'}: ${a} vs ${b}`); }
  const RF = N.prices.regions[0].code;
  const game = (extra) => G.newGame(Object.assign({ region: RF, hero: 'misha', level: 'normal', seed: 'ТЕСТ-01' }, extra));

  // ---------- данные ----------
  test('у каждого товара есть цена Росстата', () => {
    for (const p of N.products) ok(N.prices.keys.includes(p.id), 'нет цены для ' + p.id);
    for (const o of N.outside) ok(N.prices.keys.includes(o.id), 'нет цены для ' + o.id);
  });
  test('все ингредиенты рецептов есть в магазине', () => {
    for (const r of N.recipes) for (const [pid] of r.ing) ok(G.P[pid], `${r.id}: нет товара ${pid}`);
  });
  test('события ссылаются на существующие товары и цены', () => {
    for (const e of N.events) for (const c of e.choices) {
      if (c.cost && typeof c.cost === 'object') ok(G.P[c.cost.price] || G.O[c.cost.price], `${e.id}: цена ${c.cost.price}`);
      for (const a of c.add || []) ok(G.P[a.pid], `${e.id}: товар ${a.pid}`);
    }
  });
  test('в каждом регионе бюджет посчитан и разумный', () => {
    for (const r of N.prices.regions) {
      const b = G.budgetFor(r.code, 'normal');
      ok(b > 1500 && b < 12000, `${r.name}: ${b}`); // на Чукотке продукты в 2,5 раза дороже среднего
    }
  });

  // ---------- новая игра ----------
  test('новая игра: бюджет, день 1, пустой холодильник', () => {
    const s = game();
    eq(s.day, 1); eq(s.money, s.budget); eq(s.pantry.length, 0); ok(s.budget % 50 === 0, 'кратно 50');
  });
  test('один код недели — одинаковые события и акции', () => {
    const a = game({ seed: 'АБВГ-12' });
    const b = game({ seed: ' абвг-12 ' });
    eq(JSON.stringify(a.plan), JSON.stringify(b.plan));
    eq(Object.keys(a.plan.events).length, 6, 'событие на дни 2–7');
  });
  test('уровень «Туго» дешевле уровня «Свободно»', () => {
    ok(G.budgetFor(RF, 'hard') < G.budgetFor(RF, 'normal'));
    ok(G.budgetFor(RF, 'normal') < G.budgetFor(RF, 'easy'));
  });

  // ---------- магазин ----------
  test('покупка списывает деньги и кладёт товар в холодильник', () => {
    const s = game();
    const price = G.packPrice(s, 'grechka').price;
    const r = G.buy(s, { grechka: 2 });
    ok(r.ok); eq(s.money, s.budget - price * 2); eq(G.stock(s, 'grechka'), 1800);
  });
  test('нельзя купить дороже, чем есть денег', () => {
    const s = game();
    s.money = 10;
    const r = G.buy(s, { grechka: 1 });
    eq(r.ok, false); eq(G.stock(s, 'grechka'), 0); eq(s.money, 10);
  });
  test('акция снижает цену', () => {
    const s = game();
    const promo = s.plan.promos[1][0];
    const pp = G.packPrice(s, promo.pid);
    eq(pp.pct, promo.pct); ok(pp.price < pp.base);
  });

  // ---------- кухня ----------
  test('готовка расходует продукты и создаёт порции', () => {
    const s = game();
    G.buy(s, { grechka: 1, luk: 1, maslo_pods: 1 });
    const r = G.cook(s, 'grechka_luk', 2);
    ok(r.ok);
    eq(G.stock(s, 'grechka'), 900 - 160);
    eq(s.dishes[0].portions, 2);
    ok(s.dishes[0].cpp > 0, 'у порции есть цена');
  });
  test('без продуктов приготовить нельзя и видно, чего не хватает', () => {
    const s = game();
    G.buy(s, { grechka: 1 });
    const miss = G.missingFor(s, 'grechka_luk', 1).map((m) => m.pid).sort();
    eq(miss.join(), 'luk,maslo_pods');
    eq(G.cook(s, 'grechka_luk', 1).ok, false);
  });
  test('maxPortions считает по самому дефицитному продукту', () => {
    const s = game();
    G.buy(s, { yaica: 1, moloko: 1, maslo_pods: 1 });
    eq(G.maxPortions(s, 'omlet'), 5); // 10 яиц по 2
  });
  test('КБЖУ рецепта считается из ингредиентов', () => {
    const n = G.recipeNutrition('omlet');
    near(n.kcal, 110 * 1.57 + 50 * 0.52 + 5 * 8.27, 1);
    near(n.prot, 110 * 0.127 + 50 * 0.028, 0.1);
  });

  // ---------- еда ----------
  test('еда из готового блюда заполняет приём пищи', () => {
    const s = game();
    G.buy(s, { gerkules: 1, moloko: 1, sahar: 1 });
    const dish = G.cook(s, 'ovsyanka', 1).dish;
    ok(G.eat(s, 'b', { type: 'dish', uid: dish.uid }).ok);
    eq(s.dishes.length, 0, 'порция съедена');
    ok(G.dayTotals(s).kcal > 300);
    eq(G.eat(s, 'b', { type: 'dish', uid: dish.uid }).ok, false, 'второй завтрак в тот же слот нельзя');
  });
  test('перекус фруктом засчитывается в овощи и фрукты', () => {
    const s = game();
    G.buy(s, { yabloki: 1 });
    G.eat(s, 's', { type: 'product', pid: 'yabloki' });
    eq(G.dayTotals(s).vf, 150);
    eq(G.stock(s, 'yabloki'), 850);
  });
  test('столовая стоит денег по цене региона', () => {
    const s = game();
    const price = G.outsidePrice(s, 'stolovaya');
    G.eat(s, 'l', { type: 'outside', id: 'stolovaya' });
    eq(s.money, s.budget - price); eq(s.spent.outside, price);
  });

  // ---------- сроки годности ----------
  test('фарш портится через 2 дня и попадает в выброшенное', () => {
    const s = game();
    G.buy(s, { farsh: 1 });
    G.endDay(s); // день 1 → 2
    eq(G.stock(s, 'farsh'), 500, 'на второй день ещё можно');
    G.endDay(s); // день 2 → 3
    eq(G.stock(s, 'farsh'), 0, 'на третий испортился');
    ok(s.waste > 0);
  });
  test('замороженный фарш не портится', () => {
    const s = game();
    G.buy(s, { farsh: 1 });
    ok(G.freeze(s, 'farsh'));
    for (let i = 0; i < 5; i++) G.endDay(s);
    eq(G.stock(s, 'farsh'), 500); eq(s.waste, 0);
  });
  test('нельзя заморозить то, что не замораживают', () => {
    const s = game();
    G.buy(s, { moloko: 1 });
    eq(G.freeze(s, 'moloko'), false);
  });
  test('в конце недели остатки не считаются выброшенными', () => {
    const s = game();
    for (let i = 0; i < 6; i++) G.endDay(s);
    G.buy(s, { farsh: 1 });
    G.endDay(s);
    ok(s.finished); eq(s.waste, 0);
  });

  // ---------- события ----------
  test('событие дня применяется один раз', () => {
    const s = game();
    G.endDay(s);
    const ev = G.todayEvent(s);
    ok(ev, 'на 2-й день есть событие');
    const idx = ev.choices.findIndex((c, i) => G.choiceAvailable(s, ev, i));
    ok(G.applyChoice(s, idx).ok);
    eq(G.todayEvent(s), null);
  });
  test('обязательная трата уводит в минус, если денег нет', () => {
    const s = game();
    s.plan.events[2] = 'lost_card';
    G.endDay(s);
    s.money = 100;
    ok(G.applyChoice(s, 0).ok);
    eq(s.money, -150);
  });
  test('дорогой необязательный выбор недоступен без денег', () => {
    const s = game();
    s.plan.events[2] = 'birthday';
    G.endDay(s);
    s.money = 100;
    eq(G.choiceAvailable(s, G.E.birthday, 0), false);
    eq(G.choiceAvailable(s, G.E.birthday, 1), true);
  });
  test('отключение света ускоряет порчу', () => {
    const s = game();
    G.buy(s, { moloko: 1, grechka: 1 });
    const before = s.pantry.map((e) => e.exp);
    s.plan.events[2] = 'power_off';
    G.endDay(s);
    G.applyChoice(s, 0);
    eq(s.pantry.find((e) => e.pid === 'moloko').exp, before[0] - 1);
    eq(s.pantry.find((e) => e.pid === 'grechka').exp, before[1], 'крупа не портится');
  });
  test('долг возвращается или нет в зависимости от кода недели, но детерминированно', () => {
    const run = () => {
      const s = game({ seed: 'ДОЛГ-77' });
      s.plan.events[2] = 'neighbor_loan';
      G.endDay(s);
      G.applyChoice(s, 0);
      for (let i = 0; i < 4; i++) G.endDay(s);
      return s.money;
    };
    eq(run(), run());
  });

  // ---------- итоги ----------
  test('пропуск еды снижает настроение', () => {
    const s = game();
    const m = s.mood;
    G.endDay(s);
    ok(s.mood < m);
  });
  test('отчёт: 6 показателей, звёзды от 0 до 3, советы есть', () => {
    const s = game();
    G.buy(s, { grechka: 1, luk: 1, maslo_pods: 1, yaica: 1, moloko: 1, yabloki: 1 });
    for (let d = 1; d <= 7; d++) {
      if (G.maxPortions(s, 'omlet') > 0) { const o = G.cook(s, 'omlet', 1).dish; G.eat(s, 'b', { type: 'dish', uid: o.uid }); }
      G.eat(s, 's', { type: 'product', pid: 'yabloki' });
      G.endDay(s);
    }
    const r = G.report(s);
    eq(r.metrics.length, 6);
    for (const m of r.metrics) ok(m.stars >= 0 && m.stars <= 3, m.id);
    ok(r.tips.length > 0);
    ok(r.protRank[0].rubPer10g <= r.protRank[r.protRank.length - 1].rubPer10g, 'рейтинг белка отсортирован');
  });
  test('хорошая неделя получает высокую оценку', () => {
    const s = game({ level: 'easy' });
    s.money = 100000; s.budget = 100000; // проверяем только питание
    for (let d = 1; d <= 7; d++) {
      G.buy(s, { tvorog: 2, okorochka: 1, grechka: 1, morkov: 1, luk: 1, maslo_pods: 1, kapusta: 1, yabloki: 1, gerkules: 1, moloko: 1 });
      G.cook(s, 'grechka_kur', 3);
      const dish = s.dishes[s.dishes.length - 1];
      G.cook(s, 'ovsyanka_yabl', 1);
      const br = s.dishes[s.dishes.length - 1];
      G.eat(s, 'b', { type: 'dish', uid: br.uid });
      G.eat(s, 'l', { type: 'dish', uid: dish.uid });
      G.eat(s, 'd', { type: 'dish', uid: dish.uid });
      G.cook(s, 'salat_kapusta', 2);
      const sal = s.dishes[s.dishes.length - 1];
      G.eat(s, 's', { type: 'dish', uid: sal.uid });
      G.eat(s, 's', { type: 'dish', uid: sal.uid });
      G.eat(s, 's', { type: 'product', pid: 'tvorog' });
      G.eat(s, 's', { type: 'product', pid: 'yabloki' });
      G.endDay(s);
    }
    const r = G.report(s);
    const by = Object.fromEntries(r.metrics.map((m) => [m.id, m.stars]));
    ok(by.kcal >= 2, 'сытость ' + by.kcal); ok(by.prot >= 2, 'белок ' + by.prot); ok(by.vf >= 2, 'овощи ' + by.vf);
  });

  // ---------- баланс ----------
  // «Разумный игрок» на бюджете «Обычно» должен хорошо прожить неделю в любом регионе,
  // а на «Туго» — заметно хуже. Иначе игра либо слишком лёгкая, либо нечестная.
  const balance = [];
  test('баланс: разумный игрок на «Обычно» справляется во всех регионах', () => {
    for (const r of N.prices.regions) {
      for (const hero of ['anya', 'misha']) {
        for (const level of ['normal', 'hard']) {
          const s = G.newGame({ region: r.code, hero, level, seed: 'БАЛАНС-1' });
          N.autoplay.playWeek(s);
          const rep = G.report(s);
          const by = Object.fromEntries(rep.metrics.map((m) => [m.id, m.stars]));
          balance.push({ region: r.name, hero, level, total: rep.total, ...by, left: Math.round(s.money), leftPct: s.money / s.budget, kcalAvg: s.history.reduce((a, h) => a + h.kcal, 0) / 7, protAvg: s.history.reduce((a, h) => a + h.prot, 0) / 7 });
        }
      }
    }
    const normal = balance.filter((b) => b.level === 'normal');
    const bad = normal.filter((b) => b.total < 12 || b.left < 0);
    ok(!bad.length, 'слабые результаты: ' + JSON.stringify(bad.slice(0, 5)));
  });
  test('баланс: на «Туго» в среднем сложнее, чем на «Обычно»', () => {
    const avgOf = (lvl) => avg(balance.filter((b) => b.level === lvl).map((b) => b.total));
    ok(avgOf('hard') < avgOf('normal'), `туго ${avgOf('hard')} vs обычно ${avgOf('normal')}`);
  });
  function avg(a) { return a.reduce((s, x) => s + x, 0) / (a.length || 1); }

  // ---------- форматирование ----------
  test('форматирование количеств', () => {
    eq(G.fmtAmount('yaica', 110), '2 яйца');
    eq(G.fmtAmount('yaica', 550), '10 яиц');
    eq(G.fmtAmount('moloko', 900), '900 мл');
    eq(G.fmtAmount('kartofel', 1500), '1,5 кг');
    eq(G.plural(21, ['день', 'дня', 'дней']), 'день');
    eq(G.plural(12, ['день', 'дня', 'дней']), 'дней');
  });

  // ---------- код итога и итоги группы (results.js) ----------
  const R = N.results;
  const sampleFields = (over) => Object.assign({
    region: '22000000000', hero: 'misha', level: 'hard', seed: 'ТЕСТ-42',
    stars: { money: 3, kcal: 2, prot: 1, vf: 0, waste: 3, mood: 2 }, moneyPct: -12, waste: 137, cafe: 410, attempt: 2,
  }, over);
  test('код итога: все поля восстанавливаются', () => {
    const code = R.encode(sampleFields());
    ok(/^[2-9А-Я]{4}-[2-9А-Я]{4}-[2-9А-Я]{4}$/.test(code), 'формат: ' + code);
    const d = R.decode(code);
    ok(d, 'не прочитался');
    eq(d.region, '22000000000'); eq(d.hero, 'misha'); eq(d.level, 'hard'); eq(d.week, R.weekOf('тест-42'));
    eq(JSON.stringify(d.stars), JSON.stringify({ money: 3, kcal: 2, prot: 1, vf: 0, waste: 3, mood: 2 }));
    eq(d.total, 11); eq(d.moneyPct, -12); eq(d.waste, 140); eq(d.cafe, 420); eq(d.attempt, 2);
  });
  test('код итога: крайние значения и все регионы', () => {
    for (const r of N.prices.regions) {
      const f = sampleFields({ region: r.code, hero: 'anya', level: 'easy', moneyPct: 300, waste: 5000, cafe: 9000, attempt: 9,
        stars: { money: 0, kcal: 3, prot: 3, vf: 3, waste: 0, mood: 3 } });
      const d = R.decode(R.encode(f));
      ok(d && d.region === r.code, r.name);
      eq(d.moneyPct, 64); eq(d.waste, 630); eq(d.cafe, 1260); eq(d.attempt, 4);
    }
  });
  test('код итога: любая одна опечатка обнаруживается', () => {
    const code = R.encode(sampleFields());
    const plain = code.replace(/-/g, '');
    let accepted = 0;
    for (let i = 0; i < plain.length; i++) {
      for (const ch of R.ABC) {
        if (ch === plain[i]) continue;
        if (R.decode(plain.slice(0, i) + ch + plain.slice(i + 1))) accepted++;
      }
    }
    eq(accepted, 0, 'опечаток пропущено');
  });
  test('код итога: строчные буквы, пробелы и похожая латиница читаются', () => {
    const f = sampleFields({ stars: { money: 2, kcal: 2, prot: 2, vf: 2, waste: 2, mood: 2 } });
    const code = R.encode(f);
    const toLatin = { А: 'A', В: 'B', С: 'C', Е: 'E', Н: 'H', К: 'K', М: 'M', Р: 'P', Т: 'T', Х: 'X', У: 'Y' };
    const messy = code.toLowerCase().replace(/-/g, ' ').replace(/[авсенкмртху]/g, (c) => toLatin[c.toUpperCase()].toLowerCase());
    const d = R.decode(messy);
    ok(d && d.code === code, `${messy} → ${d && d.code}`);
  });
  test('код итога из настоящей игры совпадает с отчётом', () => {
    const g = game({ seed: 'КОД-11' });
    N.autoplay.playWeek(g);
    const rep = G.report(g);
    const d = R.decode(R.encode(R.fieldsOf(g, rep)));
    eq(d.total, rep.total);
    for (const m of rep.metrics) eq(d.stars[m.id], m.stars, m.id);
    near(d.moneyPct, (g.money / g.budget) * 100, 0.5, 'остаток денег');
    near(d.waste, g.waste, 5, 'отходы');
  });
  test('итоги группы: коды находятся в переписке, повторы и мусор отброшены', () => {
    const a = R.encode(sampleFields({ hero: 'anya', attempt: 1 }));
    const b = R.encode(sampleFields({ stars: { money: 3, kcal: 3, prot: 3, vf: 2, waste: 3, mood: 3 }, attempt: 2 }));
    const broken = a.slice(0, -1) + (a.endsWith('2') ? '3' : '2');
    const chat = `Аня, [26.11 12:01]\nНеделя на свои: 11 из 18 ★. Код итога для наставника: ${a}\n` +
      `Миша: ${b.toLowerCase()}\nещё раз: ${a}\nКоля: ${broken}\nТелефон 8 912 345-67-89, код недели ДЕМО-25`;
    const { list, bad } = R.extract(chat);
    eq(list.length, 2, 'найдено кодов');
    eq(bad, 1, 'опечаток');
    eq(list[0].code, a);
    eq(list[1].code, b);
  });
  test('итоги группы: средние, слабые места и сравнение попыток', () => {
    const { list } = R.extract(R.sample('22000000000', 'ДЕМО-25'));
    eq(list.length, 9);
    const s = R.summarize(list);
    eq(s.n, 9); eq(s.weeks, 1); eq(s.minus, 1);
    eq(s.topics[0].id, 'vf', 'главная тема');
    eq(s.topics[1].id, 'prot', 'вторая тема');
    ok(s.first && s.repeat && s.repeat.avg > s.first.avg, 'повторная попытка лучше');
    for (const m of G.METRICS) ok(N.mentor.groupTopics[m.id], 'нет темы разбора для ' + m.id);
    eq(R.summarize([]), null);
  });

  // ---------- вывод ----------
  const failed = results.filter((r) => !r.ok);
  window.__testResults = { total: results.length, failed: failed.length, failures: failed };
  const groups = {};
  for (const b of balance) {
    const k = `${b.level}/${b.hero}`;
    const gr = groups[k] || (groups[k] = { n: 0, total: 0, min: 99, minRegion: '', leftPct: 0, kcalAvg: 0, protAvg: 0, money: 0, kcal: 0, prot: 0, vf: 0, waste: 0, mood: 0 });
    gr.n++; gr.total += b.total; gr.leftPct += b.leftPct; gr.kcalAvg += b.kcalAvg; gr.protAvg += b.protAvg;
    for (const m of ['money', 'kcal', 'prot', 'vf', 'waste', 'mood']) gr[m] += b[m];
    if (b.total < gr.min) { gr.min = b.total; gr.minRegion = b.region; }
  }
  const pre = document.createElement('pre');
  pre.id = 'balance';
  pre.textContent = 'Баланс (средние звёзды из 18):\n' + Object.entries(groups).map(([k, g]) =>
    `${k}: среднее ${(g.total / g.n).toFixed(1)}, минимум ${g.min} (${g.minRegion}), остаток ${Math.round(100 * g.leftPct / g.n)}%, ккал ${Math.round(g.kcalAvg / g.n)}, белок ${Math.round(g.protAvg / g.n)} г, ★бюджет ${(g.money / g.n).toFixed(1)} ` +
    `сытость ${(g.kcal / g.n).toFixed(1)} белок ${(g.prot / g.n).toFixed(1)} овощи ${(g.vf / g.n).toFixed(1)} отходы ${(g.waste / g.n).toFixed(1)} настроение ${(g.mood / g.n).toFixed(1)}`).join('\n');
  document.body.appendChild(pre);
  const list = document.getElementById('list');
  for (const r of results) {
    const li = document.createElement('li');
    li.className = r.ok ? 'ok' : 'fail';
    li.textContent = (r.ok ? '✓ ' : '✗ ') + r.name;
    if (!r.ok) { const pre = document.createElement('pre'); pre.textContent = r.error; li.appendChild(pre); }
    list.appendChild(li);
  }
  document.getElementById('summary').textContent = failed.length
    ? `Провалено ${failed.length} из ${results.length}`
    : `Все ${results.length} ${G.plural(results.length, ['тест пройден', 'теста пройдены', 'тестов пройдены'])}`;
  document.getElementById('summary').className = failed.length ? 'fail' : 'ok';
})();

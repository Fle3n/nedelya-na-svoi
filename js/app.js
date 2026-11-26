// Интерфейс «Недели на свои». Вся логика игры — в engine.js, здесь только экраны и кнопки.
(function (N) {
  'use strict';
  const G = N.engine;
  const P = G.P;
  const RF = N.prices.regions[0].code;
  const SAVE_KEY = 'nns-save-v1';
  const PREF_KEY = 'nns-pref-v1';
  const GROUP_KEY = 'nns-group-v1'; // текст с кодами группы — только на устройстве наставника

  const $app = document.getElementById('app');
  const $modal = document.getElementById('modal-root');
  const $toast = document.getElementById('toast');
  const $print = document.getElementById('print-root');

  // ---------- хранение (может быть недоступно в приватном режиме — игра работает и без него) ----------
  function readJSON(key) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function writeJSON(key, value) {
    try { if (value == null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* без сохранения */ }
  }
  const pref = Object.assign({ big: false, region: RF, hero: 'anya', level: 'normal' }, readJSON(PREF_KEY) || {});
  const params = new URLSearchParams(location.search);
  const demo = params.get('demo'); // ?demo=day|event|shop|kitchen|meal|final|mentor — для скриншотов и показа, сохранение не трогает
  let game = demo ? demoGame(demo) : (function () {
    const s = readJSON(SAVE_KEY);
    return s && s.v === 1 && s.units && s.plan ? s : null;
  })();
  function save() { if (!demo) writeJSON(SAVE_KEY, game); }

  // Демо-неделя: «разумный игрок» из autoplay.js. Нужна для скриншотов и показа на защите.
  function demoGame(kind) {
    const g = G.newGame({ region: params.get('region') || '22000000000', hero: 'misha', level: 'normal', seed: 'ДЕМО-25' });
    const stopDay = kind === 'final' ? G.DAYS : 2;
    N.autoplay.playWeek(g, stopDay);
    if (!g.finished && kind !== 'event') {
      const ev = G.todayEvent(g);
      if (ev) G.applyChoice(g, ev.choices.findIndex((c, i) => G.choiceAvailable(g, ev, i)));
      const br = G.maxPortions(g, 'omlet') >= 1 ? G.cook(g, 'omlet', 1).dish : null;
      if (br) G.eat(g, 'b', { type: 'dish', uid: br.uid });
    }
    return g;
  }
  function savePref() { writeJSON(PREF_KEY, pref); }

  const demoScreens = { day: 'day', event: 'day', shop: 'shop', kitchen: 'kitchen', meal: 'day', final: 'final', mentor: 'mentor', group: 'group', setup: 'setup', home: 'home', intro: 'intro' };
  const ui = {
    screen: demo && demoScreens[demo] ? demoScreens[demo] : game ? (game.finished ? 'final' : 'day') : 'home',
    cart: {},
    cat: N.categories[0].id,
    modal: null,
    setup: { hero: pref.hero, region: pref.region, level: pref.level, seed: G.randomCode() },
    mentorRegion: pref.region,
    mentorSeed: G.randomCode(),
    group: { text: demo === 'group' ? N.results.sample('22000000000', 'ДЕМО-25') : (demo ? '' : String(readJSON(GROUP_KEY) || '')) },
  };
  function saveGroup() { if (!demo) writeJSON(GROUP_KEY, ui.group.text || null); }

  // ---------- утилиты ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rub = (n) => G.fmtRub(n);
  const pct = (v, norm) => Math.max(0, Math.min(100, Math.round((v / norm) * 100)));
  const regionName = (code) => (N.prices.regions.find((r) => r.code === code) || N.prices.regions[0]).name;
  const weekday = (d) => G.WEEKDAYS[d - 1];
  const moodEmoji = (m) => (m >= 70 ? '😊' : m >= 50 ? '🙂' : m >= 30 ? '😐' : '😟');
  const starsHtml = (n, max = 3) => `<span class="stars" aria-label="${n} из ${max} звёзд">${'★'.repeat(n)}<span class="off">${'★'.repeat(max - n)}</span></span>`;
  const dayWord = (n) => G.plural(n, ['день', 'дня', 'дней']);
  const portionWord = (n) => G.plural(n, ['порция', 'порции', 'порций']);
  const shortName = (pid) => P[pid].name.replace(/,\s*\d.*$/, '');

  const one = (v) => (Math.round(v * 10) / 10).toString().replace('.', ',');

  // Код итога недели — его игрок отправляет наставнику (см. results.js)
  function resultShare() {
    const r = G.report(game);
    const code = N.results.encode(N.results.fieldsOf(game, r));
    const text = `Неделя на свои: ${r.total} из ${r.max} ★ — «${r.title.text}». ${regionName(game.region)}, код недели ${game.seed}. Код итога для наставника: ${code}`;
    return { code, text };
  }
  function copyText(text) {
    const ok = () => toast('Скопировано — вставь в чат группы');
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      let done = false;
      try { done = document.execCommand('copy'); } catch (e) { done = false; }
      ta.remove();
      if (done) ok(); else toast('Не получилось скопировать — перепиши код с экрана');
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, fallback);
    else fallback();
  }
  // Номер попытки для этого кода недели — чтобы наставник сравнил первую и повторную игру
  function markAttempt() {
    if (!game || game.attempt || demo) return;
    const done = pref.done && typeof pref.done === 'object' ? pref.done : {};
    const n = (done[game.seed] || 0) + 1;
    delete done[game.seed];
    done[game.seed] = n;
    const keys = Object.keys(done);
    if (keys.length > 30) delete done[keys[0]];
    pref.done = done;
    savePref();
    game.attempt = n;
    save();
  }

  let toastTimer = null;
  function toast(msg) {
    $toast.textContent = msg;
    $toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $toast.classList.remove('show'), 2600);
  }

  // ---------- общие блоки ----------
  function topbar(opts = {}) {
    const s = game;
    const nr = G.norms(s);
    const t = G.dayTotals(s);
    const back = opts.back ? `<button class="btn small ghost" data-act="go" data-to="day" aria-label="Назад">← Назад</button>` : '';
    return `
      <header class="topbar">
        <div class="row">
          ${back}
          <div class="daypill">День ${s.day}<span class="muted"> из 7 · ${weekday(s.day)}</span></div>
          <div class="spacer"></div>
          <span class="stat money ${s.money < s.budget * 0.1 ? 'low' : ''}" title="Деньги">💰 ${rub(s.money)}</span>
          <span class="stat" title="Настроение">${moodEmoji(s.mood)} ${s.mood}</span>
          <button class="btn small ghost icon-btn" data-act="menu" aria-label="Меню">☰</button>
        </div>
        <div class="bars" aria-label="Питание за сегодня">
          ${miniBar('Калории', t.kcal, nr.kcal, 'kcal', 'ккал')}
          ${miniBar('Белок', t.prot, nr.prot, 'prot', 'г')}
          ${miniBar('Овощи и фрукты', t.vf, nr.vf, 'vf', 'г')}
        </div>
      </header>`;
  }
  function miniBar(label, v, norm, cls, unit) {
    const p = pct(v, norm);
    return `<div><div class="bar-label"><span>${label}</span><span>${Math.round(v)}/${norm} ${unit}</span></div>
      <div class="bar ${cls} ${p >= 90 ? 'full' : ''}" role="progressbar" aria-label="${label}" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><i style="width:${p}%"></i></div></div>`;
  }
  function nutLine(n) {
    return `<span>🔥 ${Math.round(n.kcal)} ккал</span><span>💪 ${Math.round(n.prot)} г белка</span>${n.vf ? `<span>🥕 ${Math.round(n.vf)} г</span>` : ''}`;
  }
  function footer() {
    return `<footer class="footer">
      <p>Цены — ${esc(N.prices.source.toLowerCase())}, ${esc(N.prices.period)}. Нормы питания — МР 2.3.1.0253-21 Роспотребнадзора (18–29 лет), овощи и фрукты — рекомендация ВОЗ.</p>
      <p>Независимый проект для конкурса «Вайбкодинг добрых дел» в поддержку программы «Готовим будущее» фонда «Выручаем». Не является официальным продуктом фонда. Игра не собирает персональные данные и работает без интернета.</p>
    </footer>`;
  }

  // ---------- экраны ----------
  function screenHome() {
    const cont = game && !game.finished
      ? `<button class="btn block" data-act="go" data-to="day">▶ Продолжить: день ${game.day}, ${rub(game.money)}</button>` : '';
    return `
      <section class="hero">
        <div class="hero-art" aria-hidden="true">🛒🍳🥕💰</div>
        <h1>Неделя на свои</h1>
        <p class="lead">Первая неделя самостоятельной жизни. На еду — фиксированная сумма. Сможешь нормально питаться, ничего не выбросить и не уйти в минус?</p>
        <div class="features">
          <div class="feature"><span class="em">📍</span><div><b>Настоящие цены твоего региона</b><br><span class="muted">Данные Росстата по 82 регионам России за ${esc(N.prices.period.replace('на конец ', ''))}</span></div></div>
          <div class="feature"><span class="em">🍲</span><div><b>Покупай, готовь, следи за сроками</b><br><span class="muted">${N.products.length} продуктов, ${N.recipes.length} простых рецептов, заморозка и испорченные продукты</span></div></div>
          <div class="feature"><span class="em">🎲</span><div><b>Жизненные ситуации</b><br><span class="muted">Друзья зовут в бургерную, сосед просит в долг, отключили свет</span></div></div>
          <div class="feature"><span class="em">⭐</span><div><b>Честный разбор в конце</b><br><span class="muted">Бюджет, сытость, белок, овощи, выброшенная еда и настроение</span></div></div>
        </div>
        <div class="stack">
          ${cont}
          <button class="btn primary block" data-act="go" data-to="setup">Начать новую неделю</button>
          <button class="btn block" data-act="go" data-to="mentor">👩‍🏫 Для наставника: план занятия и материалы</button>
        </div>
        <p class="small muted center" style="margin-top:12px">Около 20 минут · без регистрации · работает с телефона и без интернета</p>
      </section>
      ${footer()}`;
  }

  function regionOptions(selected) {
    const prog = N.programRegions.map((c) => N.prices.regions.find((r) => r.code === c)).filter(Boolean);
    const opt = (r) => `<option value="${r.code}" ${r.code === selected ? 'selected' : ''}>${esc(r.name)}</option>`;
    return `<optgroup label="Регионы программы «Готовим будущее»">${prog.map(opt).join('')}</optgroup>
      <optgroup label="Все регионы">${N.prices.regions.map(opt).join('')}</optgroup>`;
  }

  function screenSetup() {
    const s = ui.setup;
    const heroes = N.heroes.map((h) => `
      <button class="choice" data-act="setup" data-k="hero" data-v="${h.id}" aria-pressed="${s.hero === h.id}">
        <span class="title"><span class="em">${h.emoji}</span>${esc(h.name)}, 18 лет</span>
        <span class="small muted">${esc(h.text)} Норма: ${h.kcal} ккал и ${h.prot} г белка в день.</span>
      </button>`).join('');
    const levels = N.levels.map((l) => `
      <button class="choice" data-act="setup" data-k="level" data-v="${l.id}" aria-pressed="${s.level === l.id}">
        <span class="title">${esc(l.name)} <span class="spacer"></span><span class="nowrap">${rub(G.budgetFor(s.region, l.id))}</span></span>
        <span class="small muted">${esc(l.text)}</span>
      </button>`).join('');
    return `
      <div class="row" style="padding-top:16px"><button class="btn small ghost" data-act="go" data-to="home">← На главную</button></div>
      <h1 style="margin-top:8px">Новая неделя</h1>
      <div class="section"><h2 class="section-title">1. Кто ты</h2><div class="choice-grid">${heroes}</div></div>
      <div class="section">
        <h2 class="section-title">2. Где живёшь</h2>
        <label class="lbl small muted" style="font-weight:400" for="region">От региона зависят цены в магазине</label>
        <select id="region" class="field" data-change="region">${regionOptions(s.region)}</select>
      </div>
      <div class="section"><h2 class="section-title">3. Бюджет на еду на неделю</h2><div class="choice-grid">${levels}</div>
        <p class="small muted" style="margin-top:8px">Бюджет посчитан по ценам выбранного региона: «Обычно» — это стоимость разумного набора продуктов на неделю.</p></div>
      <div class="section">
        <h2 class="section-title">4. Код недели <span class="muted">— для игры в группе</span></h2>
        <input id="seed" class="field" data-change="seed" value="${esc(s.seed)}" maxlength="12" autocomplete="off" spellcheck="false" aria-describedby="seed-help">
        <p id="seed-help" class="small muted" style="margin-top:6px">С одинаковым кодом у всех будут одни и те же события и акции — удобно сравнивать результаты на занятии.</p>
      </div>
      <div class="section"><button class="btn primary block" data-act="start">Начать неделю →</button></div>`;
  }

  function screenIntro() {
    const s = game;
    const h = G.H[s.hero];
    return `
      <section class="hero">
        <div class="hero-art" aria-hidden="true">🏠🔑</div>
        <h1>${esc(h.name)} начинает жить сам${s.hero === 'anya' ? 'а' : ''}</h1>
        <p class="lead">${esc(h.text)} Это первая неделя без воспитателей и общей столовой. Холодильник пустой — есть только соль и специи.</p>
        <div class="card stack">
          <div class="row"><span class="food-em">💰</span><div><b>${rub(s.budget)} на еду на 7 дней</b><br><span class="small muted">${esc(regionName(s.region))}, цены Росстата</span></div></div>
          <div class="row"><span class="food-em">🍽️</span><div><b>Каждый день: ${h.kcal} ккал и ${h.prot} г белка</b><br><span class="small muted">Столько нужно ${s.hero === 'anya' ? 'девушке' : 'парню'} 18 лет, который учится и двигается</span></div></div>
          <div class="row"><span class="food-em">🥕</span><div><b>И ещё 400 г овощей и фруктов</b><br><span class="small muted">Картошка не считается — это гарнир</span></div></div>
          <div class="row"><span class="food-em">⏳</span><div><b>Продукты портятся</b><br><span class="small muted">Мясо — за 2–3 дня, хлеб — за 4. Что-то можно заморозить ❄️</span></div></div>
          <div class="row"><span class="food-em">🎲</span><div><b>Каждый день что-то случается</b><br><span class="small muted">Решай сам — правильных ответов несколько</span></div></div>
        </div>
        <div class="section"><button class="btn primary block" data-act="begin">Понедельник, поехали →</button></div>
      </section>`;
  }

  function expiryBadge(exp, frozen) {
    if (frozen) return '<span class="badge green">❄️ заморожено</span>';
    const left = exp - game.day;
    if (left < 0) return '<span class="badge red">испортилось</span>';
    if (left === 0) return '<span class="badge red">съесть сегодня</span>';
    if (left === 1) return '<span class="badge warn">до завтра</span>';
    if (left > 60) return '';
    return `<span class="badge">ещё ${left + 1} ${dayWord(left + 1)}</span>`;
  }

  function screenDay() {
    const s = game;
    const d = s.days[s.day];
    const meals = G.SLOTS.map((sl) => {
      const m = d.meals[sl.id];
      if (m) {
        return `<div class="card meal"><span class="slot-em">${m.emoji}</span>
          <div class="what"><div class="small muted">${sl.name}</div><div class="name">${esc(m.name)}</div><div class="nut">${nutLine(m)}</div></div>
          <span class="badge green">✓</span></div>`;
      }
      return `<div class="card meal empty"><span class="slot-em">${sl.emoji}</span>
        <div class="what"><div class="name">${sl.name}</div><div class="small muted">ещё не было</div></div>
        <button class="btn small primary" data-act="meal" data-slot="${sl.id}">Выбрать</button></div>`;
    }).join('');
    const extras = [...d.snacks, ...d.extra];
    const snacks = extras.length
      ? `<div class="list">${extras.map((e) => `<div class="item"><span class="food-em">${e.emoji}</span><div class="body"><div class="name">${esc(e.name)}</div><div class="nut">${nutLine(e)}</div></div></div>`).join('')}</div>`
      : '';

    const dishes = s.dishes.map((x) => `
      <div class="item ${x.exp - s.day <= 0 ? 'danger' : ''}"><span class="food-em">${x.emoji}</span>
        <div class="body"><div class="name">${esc(x.name)}</div>
          <div class="small muted">${x.portions} ${portionWord(x.portions)} · ${Math.round(x.kcal)} ккал, ${Math.round(x.prot)} г белка в порции</div></div>
        ${expiryBadge(x.exp, false)}</div>`).join('');
    const pantry = G.pantryView(s).map((x) => {
      const p = P[x.pid];
      const left = x.exp - s.day;
      const freezeBtn = p.freeze && !x.frozen ? `<button class="btn small" data-act="freeze" data-pid="${x.pid}" aria-label="Заморозить ${esc(p.name)}" title="Заморозить">❄️</button>` : '';
      return `<div class="item ${!x.frozen && left <= 0 ? 'danger' : !x.frozen && left === 1 ? 'warn' : ''}"><span class="food-em">${p.emoji}</span>
        <div class="body"><div class="name">${esc(p.name)}</div><div class="small muted">${G.fmtAmount(x.pid, x.g)}</div></div>
        ${expiryBadge(x.exp, x.frozen)} ${freezeBtn}</div>`;
    }).join('');

    const empty = !s.pantry.length && !s.dishes.length;
    return `
      ${topbar()}
      <div class="section">
        <h2 class="section-title">Еда сегодня</h2>
        <div class="meals">${meals}</div>
        ${snacks ? `<div style="margin-top:10px">${snacks}</div>` : ''}
        <button class="btn small" style="margin-top:10px" data-act="meal" data-slot="s">🍎 Перекусить</button>
      </div>
      ${s.dishes.length ? `<div class="section"><h2 class="section-title">Готовая еда <span class="muted">в холодильнике</span></h2><div class="list">${dishes}</div></div>` : ''}
      <div class="section">
        <h2 class="section-title">Холодильник и шкаф</h2>
        ${empty ? '<div class="empty-note">Пусто. Начни с магазина 🛒 — составь список на несколько дней вперёд.</div>' : `<div class="list">${pantry || '<div class="empty-note">Продуктов нет, только готовая еда.</div>'}</div>`}
      </div>
      <nav class="actionbar" aria-label="Действия"><div class="inner">
        <button class="btn" data-act="go" data-to="shop"><span class="em">🛒</span>Магазин</button>
        <button class="btn" data-act="go" data-to="kitchen"><span class="em">🍳</span>Кухня</button>
        <button class="btn primary" data-act="endday"><span class="em">🌙</span>${s.day === 7 ? 'Итоги недели' : 'Закончить день'}</button>
      </div></nav>`;
  }

  function cartCount() { return Object.values(ui.cart).reduce((a, b) => a + b, 0); }

  function screenShop() {
    const s = game;
    const promos = (s.plan.promos[s.day] || []).map((pr) => {
      const p = P[pr.pid];
      return `<button class="promo" data-act="cat" data-cat="${p.cat}" style="border:0;cursor:pointer;text-align:left">
        <span class="food-em">${p.emoji}</span><span><b>−${pr.pct}%</b> ${esc(p.name)}<br><span class="small muted">${rub(G.packPrice(s, pr.pid).price)} вместо ${rub(G.basePackPrice(s, pr.pid))}</span></span></button>`;
    }).join('');
    const chips = N.categories.map((c) => `<button class="chip" data-act="cat" data-cat="${c.id}" aria-pressed="${ui.cat === c.id}">${c.emoji} ${esc(c.name)}</button>`).join('');
    const items = N.products.filter((p) => p.cat === ui.cat).map((p) => {
      const pp = G.packPrice(s, p.id);
      const q = ui.cart[p.id] || 0;
      const perKg = (pp.price / p.pack) * 1000;
      const unitLbl = p.basis === 'pack' ? '' : p.unit === 'мл' ? '₽/л' : '₽/кг';
      const prot10 = G.isProteinSource(p) ? `<span>💪 10 г белка = ${rub((pp.price / ((p.pack * p.prot) / 100)) * 10)}</span>` : '';
      const have = G.stock(s, p.id);
      return `<div class="product">
        <div class="em" aria-hidden="true">${p.emoji}</div>
        <div>
          <div class="name">${esc(p.name)} ${pp.pct ? `<span class="badge orange">−${pp.pct}%</span>` : ''}</div>
          <div class="meta"><span>${G.fmtPack(p.id)}</span>${unitLbl ? `<span>${Math.round(perKg)} ${unitLbl}</span>` : ''}
            <span>${p.frozen ? '❄️ заморозка' : p.shelf > 60 ? 'хранится долго' : `хранится ${p.shelf} ${dayWord(p.shelf)}`}</span>${prot10}
            ${have ? `<span class="badge green">дома ${G.fmtAmount(p.id, have)}</span>` : ''}</div>
        </div>
        <div class="product-right">
          <div class="price">${pp.pct ? `<s>${rub(pp.base)}</s>` : ''}${rub(pp.price)}</div>
          <div class="stepper">
            <button class="btn small" data-act="qty" data-pid="${p.id}" data-d="-1" aria-label="Убрать ${esc(p.name)}" ${q ? '' : 'disabled'}>−</button>
            <span class="q" aria-live="polite">${q}</span>
            <button class="btn small" data-act="qty" data-pid="${p.id}" data-d="1" aria-label="Добавить ${esc(p.name)}">+</button>
          </div>
        </div></div>`;
    }).join('');
    const total = G.cartTotal(s, ui.cart);
    const after = s.money - total;
    return `
      ${topbar({ back: true })}
      <h1 style="margin-top:16px">🛒 Магазин у дома</h1>
      <p class="muted small">Смотри на цену за килограмм, а не за пачку. Скоропортящееся бери на 2–3 дня.</p>
      <div class="section"><h2 class="section-title">Акции сегодня</h2><div class="promo-strip">${promos}</div></div>
      <div class="section"><div class="chips" role="toolbar" aria-label="Отделы магазина">${chips}</div><div class="list">${items}</div></div>
      <nav class="actionbar" aria-label="Корзина"><div class="cart-inner">
        <div style="flex:1;min-width:0">
          <div><b>В корзине: ${cartCount()} · ${rub(total)}</b></div>
          <div class="small ${after < 0 ? '' : 'muted'}" style="${after < 0 ? 'color:var(--danger);font-weight:700' : ''}">${after < 0 ? `Не хватает ${rub(-after)}` : `Останется ${rub(after)}`}</div>
        </div>
        ${cartCount() ? '<button class="btn small ghost" data-act="clearcart">Очистить</button>' : ''}
        <button class="btn primary" data-act="pay" ${!cartCount() || after < 0 ? 'disabled' : ''}>Оплатить</button>
      </div></nav>`;
  }

  function recipeCard(r, can) {
    const s = game;
    const n = G.recipeNutrition(r.id);
    const ing = r.ing.map(([pid, g]) => {
      const miss = G.stock(s, pid) + 0.5 < g;
      return `<span class="ing-pill ${miss ? 'miss' : ''}">${P[pid].emoji} ${esc(shortName(pid).toLowerCase())} ${G.fmtAmount(pid, g)}</span>`;
    }).join('');
    const max = G.maxPortions(s, r.id);
    return `<div class="card recipe">
      <div class="head"><span class="food-em">${r.emoji}</span><div style="flex:1"><h3 style="margin:0">${esc(r.name)}</h3>
        <div class="row wrap small muted" style="gap:6px;margin-top:2px"><span>⏱ ${r.time} мин</span><span>· хранится ${r.keep} ${dayWord(r.keep)}</span>${r.cold ? '<span class="badge">без плиты</span>' : ''}</div></div></div>
      <div class="nut" style="margin-top:8px">На порцию: ${nutLine(n)}</div>
      <div class="ing">${ing}</div>
      <p class="small muted" style="margin-bottom:10px">💡 ${esc(r.tip)}</p>
      ${can
        ? `<button class="btn primary small" data-act="cookopen" data-rid="${r.id}">Приготовить (можно до ${max} ${max === 1 ? 'порции' : 'порций'})</button>`
        : `<button class="btn small" data-act="buymissing" data-rid="${r.id}">🛒 Докупить недостающее</button>`}
    </div>`;
  }

  function screenKitchen() {
    const s = game;
    const can = N.recipes.filter((r) => G.maxPortions(s, r.id) >= 1);
    const cannot = N.recipes.filter((r) => G.maxPortions(s, r.id) < 1)
      .sort((a, b) => G.missingFor(s, a.id).length - G.missingFor(s, b.id).length);
    return `
      ${topbar({ back: true })}
      <h1 style="margin-top:16px">🍳 Кухня</h1>
      <p class="muted small">Готовь сразу на 2–4 дня — так дешевле и быстрее. Готовая еда хранится в холодильнике 1–3 дня.</p>
      <div class="section"><h2 class="section-title">Можно приготовить <span class="muted">${can.length}</span></h2>
        ${can.length ? `<div class="stack">${can.map((r) => recipeCard(r, true)).join('')}</div>` : '<div class="empty-note">Пока не из чего. Посмотри рецепты ниже и докупи продукты.</div>'}</div>
      <div class="section"><h2 class="section-title">Не хватает продуктов</h2><div class="stack">${cannot.map((r) => recipeCard(r, false)).join('')}</div></div>`;
  }

  function screenFinal() {
    const s = game;
    const r = G.report(s);
    const nr = G.norms(s);
    const metrics = r.metrics.map((m) => `
      <div class="card metric"><span class="em">${m.emoji}</span>
        <div class="body"><div class="row"><b>${esc(m.name)}</b><span class="spacer"></span>${starsHtml(m.stars)}</div>
        <div class="small muted">${esc(m.value)}</div></div></div>`).join('');
    const maxK = Math.max(nr.kcal * 1.2, ...s.history.map((h) => h.kcal));
    const week = s.history.map((h) => `<div class="col"><span>${h.kcal}</span>
      <i class="${h.kcalPct >= 0.9 ? 'ok' : ''}" style="height:${Math.max(4, (h.kcal / maxK) * 90)}%"></i><span>${G.WEEKDAYS[h.day - 1].slice(0, 2)}</span></div>`).join('');
    const rank = r.protRank;
    const maxR = Math.max(...rank.map((x) => x.rubPer10g));
    const bars = rank.map((x) => `<div class="hbar"><span>${x.emoji} ${esc(shortName(x.pid))}${x.animal ? '' : ' <span class="badge green">растит.</span>'}</span>
      <span class="track"><i style="width:${(x.rubPer10g / maxR) * 100}%;${x.rubPer10g > rank[0].rubPer10g * 3 ? 'background:var(--accent)' : ''}"></i></span><b class="nowrap">${rub(x.rubPer10g)}</b></div>`).join('');
    return `
      <div class="card score-hero" style="margin-top:20px">
        <div class="em">${r.title.emoji}</div>
        <h1 style="margin-top:8px">${esc(r.title.text)}</h1>
        <div class="total">${starsHtml(r.total, r.max).replace('class="stars"', 'class="stars" style="font-size:1.3em"')}<br>${r.total} из ${r.max} звёзд · ${esc(G.H[s.hero].name)} · ${esc(regionName(s.region))} · код недели ${esc(s.seed)}</div>
      </div>
      <div class="section"><h2 class="section-title">Итоги недели</h2><div class="grid2">${metrics}</div></div>
      <div class="section card">
        <h2 class="section-title">📨 Код итога для наставника</h2>
        <p class="small muted">Играешь на занятии? Отправь этот код наставнику — он увидит итоги всей группы. В коде только звёзды и цифры недели, без имени.</p>
        <div class="code-box result-code" aria-label="Код итога">${esc(resultShare().code)}</div>
        <div class="row wrap" style="margin-top:10px">
          <button class="btn primary" data-act="share">📤 Отправить наставнику</button>
          <button class="btn" data-act="copycode">Скопировать</button>
        </div>
      </div>
      <div class="section card">
        <h2 class="section-title">Калории по дням <span class="muted">норма ${nr.kcal}</span></h2>
        <div class="week" aria-label="Калории по дням">${week}</div>
      </div>
      <div class="section card"><h2 class="section-title">Что можно сделать лучше</h2><ul class="tips">${r.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>
      <div class="section card">
        <h2 class="section-title">Сколько стоят 10 г белка <span class="muted">${esc(regionName(s.region))}</span></h2>
        <p class="small muted">Белок нужен каждый день, и это самая дорогая часть рациона. Вот где он дешевле.</p>
        <div class="stack">${bars}</div>
      </div>
      <div class="section card soft small">
        <div class="row wrap"><span>🧾 В магазине: <b>${rub(r.stats.spentShop)}</b></span><span>🍔 Кафе и доставка: <b>${rub(r.stats.cafe)}</b></span>
        <span>🍳 Приготовлено блюд: <b>${r.stats.cooked}</b></span><span>🧊 Осталось в холодильнике на <b>${rub(r.leftover)}</b></span></div>
      </div>
      <div class="section stack">
        <button class="btn primary block" data-act="replay">🔁 Сыграть ещё раз с новым кодом</button>
        <button class="btn block" data-act="replaysame">Переиграть эту же неделю (код ${esc(s.seed)})</button>
        <button class="btn block" data-act="print" data-what="report">🖨 Распечатать итоги</button>
        <button class="btn block" data-act="go" data-to="mentor">👩‍🏫 Вопросы для обсуждения с наставником</button>
      </div>
      ${footer()}`;
  }

  function screenMentor() {
    const m = N.mentor;
    const rank = G.proteinRanking(ui.mentorRegion).slice(0, 5);
    const vf = G.vfRanking(ui.mentorRegion).slice(0, 4);
    return `
      <div class="row" style="padding-top:16px"><button class="btn small ghost" data-act="go" data-to="${game ? (game.finished ? 'final' : 'day') : 'home'}">← Назад</button>
        <span class="spacer"></span><button class="btn small" data-act="big" aria-pressed="${pref.big}">Aa ${pref.big ? 'Обычный шрифт' : 'Крупный шрифт'}</button></div>
      <h1 style="margin-top:8px">👩‍🏫 Для наставника</h1>
      <p class="lead muted">Игра для занятий по программе «Готовим будущее»: подростки сами планируют неделю питания на реальные деньги своего региона и видят последствия решений. Без регистрации и персональных данных, работает на любом телефоне и на проекторе.</p>

      <div class="section card">
        <h2 class="section-title">Чему учит игра</h2>
        <div class="grid2">${m.directions.map((d) => `<div><div style="font-size:1.6em">${d.emoji}</div><b>${esc(d.title)}</b><p class="small muted">${esc(d.text)}</p></div>`).join('')}</div>
      </div>

      <div class="section card">
        <h2 class="section-title">План занятия на 45 минут</h2>
        ${m.lesson.map((l) => `<div class="lesson-step"><div class="min">${l.min}′</div><div><b>${esc(l.title)}</b><p class="small" style="margin:0">${esc(l.text)}</p></div></div>`).join('')}
      </div>

      <div class="section card">
        <h2 class="section-title">Код недели для группы</h2>
        <p class="small muted">Попросите всех ввести этот код при старте — события и акции совпадут у всей группы, и итоги можно честно сравнить.</p>
        <div class="code-box" aria-live="polite">${esc(ui.mentorSeed)}</div>
        <div class="row wrap" style="margin-top:10px"><button class="btn small" data-act="newseed">Другой код</button>
          <button class="btn small primary" data-act="playseed">Начать игру с этим кодом</button></div>
      </div>

      <div class="section card">
        <h2 class="section-title">📊 Итоги группы</h2>
        <p class="small muted">После игры каждый присылает вам код итога. Вставьте коды или всю переписку из чата — увидите средний результат группы, слабые места и темы для разбора. Можно сравнить первую и повторную попытку.</p>
        <button class="btn primary" data-act="go" data-to="group">Открыть итоги группы</button>
      </div>

      <div class="section card">
        <h2 class="section-title">Вопросы для разбора</h2>
        <ol>${m.questions.map((q) => `<li style="margin-bottom:6px">${esc(q)}</li>`).join('')}</ol>
      </div>

      <div class="section card">
        <h2 class="section-title">Шпаргалка по ценам региона</h2>
        <select class="field" data-change="mentorRegion" aria-label="Регион для шпаргалки">${regionOptions(ui.mentorRegion)}</select>
        <div class="grid2" style="margin-top:12px">
          <div><b>Дешёвый белок (цена 10 г)</b><ol class="small">${rank.map((x) => `<li>${x.emoji} ${esc(shortName(x.pid))} — ${rub(x.rubPer10g)}${x.animal ? '' : ' (растительный)'}</li>`).join('')}</ol></div>
          <div><b>Дешёвые овощи и фрукты (за кг)</b><ol class="small">${vf.map((x) => `<li>${x.emoji} ${esc(x.name)} — ${rub(x.rubPerKg)}</li>`).join('')}</ol></div>
        </div>
        <p class="small muted">Бюджет недели: ${N.levels.map((l) => `${esc(l.name.toLowerCase())} — ${rub(G.budgetFor(ui.mentorRegion, l.id))}`).join(', ')}.</p>
      </div>

      <div class="section card">
        <h2 class="section-title">Материалы для печати</h2>
        <div class="row wrap">
          <button class="btn" data-act="print" data-what="worksheet">🖨 Рабочий лист «Мой план на неделю»</button>
          <button class="btn" data-act="print" data-what="cheatsheet">🖨 Шпаргалка цен региона</button>
        </div>
      </div>
      ${footer()}`;
  }

  function screenGroup() {
    const { list, bad } = N.results.extract(ui.group.text);
    const sm = N.results.summarize(list);
    let out = '';
    if (sm) {
      const notes = [];
      if (bad) notes.push(`${bad} ${G.plural(bad, ['фрагмент похож', 'фрагмента похожи', 'фрагментов похожи'])} на код итога, но с опечаткой. Попросите прислать код ещё раз.`);
      if (sm.weeks > 1) notes.push('У игроков разные коды недели: события и акции отличались, поэтому сравнение примерное.');
      const topics = sm.topics.map((m) => `<div class="lesson-step"><div class="min">${m.emoji}</div><div><b>${esc(m.name)}</b> — мало звёзд у ${m.weak} из ${sm.n}
        <p class="small" style="margin:0">${esc(N.mentor.groupTopics[m.id])}</p></div></div>`).join('');
      const per = sm.per.map((m) => `<div class="hbar"><span>${m.emoji} ${esc(m.name)}</span>
        <span class="track"><i style="width:${(m.avg / 3) * 100}%;${m.avg < 1.5 ? 'background:var(--accent)' : ''}"></i></span><b class="nowrap">${one(m.avg)} ★</b></div>`).join('');
      const rows = list.map((r, i) => `<tr><td>${i + 1}</td><td title="${esc(G.H[r.hero].name)}">${G.H[r.hero].emoji}</td><td><b>${r.total}</b></td>
        ${G.METRICS.map((m) => `<td class="${r.stars[m.id] <= 1 ? 'weak' : ''}">${r.stars[m.id]}</td>`).join('')}
        <td>${r.moneyPct > 0 ? '+' : r.moneyPct < 0 ? '−' : ''}${Math.abs(r.moneyPct)}%</td><td>${r.waste ? `≈${r.waste} ₽` : '—'}</td><td>${r.attempt >= 4 ? '4+' : r.attempt}</td></tr>`).join('');
      const attempts = sm.first && sm.repeat ? `
        <div class="section card soft"><h2 class="section-title">🔁 Первая и повторная попытка</h2>
          <p>Первая попытка — в среднем <b>${one(sm.first.avg)} ★</b> (${sm.first.n} чел.), повторная — <b>${one(sm.repeat.avg)} ★</b> (${sm.repeat.n} чел.).
          Разница: <b>${sm.repeat.avg >= sm.first.avg ? '+' : '−'}${one(Math.abs(sm.repeat.avg - sm.first.avg))} ★</b>.</p>
          <p class="small muted" style="margin-bottom:0">Это измеримый результат занятия: насколько лучше ребята справились, когда разобрали ошибки первой недели.</p></div>` : '';
      out = `
        ${notes.map((t) => `<div class="card soft small" style="margin-top:12px">⚠️ ${esc(t)}</div>`).join('')}
        <div class="section tiles" id="group-results">
          <div class="card tile"><b>${sm.n}</b><span>${G.plural(sm.n, ['игрок', 'игрока', 'игроков'])}</span></div>
          <div class="card tile"><b>${one(sm.avgTotal)}</b><span>звёзд в среднем из ${sm.max}</span></div>
          <div class="card tile"><b>${sm.minus}</b><span>${G.plural(sm.minus, ['ушёл', 'ушли', 'ушли'])} в минус</span></div>
          <div class="card tile"><b>≈${G.fmtNum(sm.wasteSum)} ₽</b><span>еды выброшено на всех</span></div>
        </div>
        ${topics ? `<div class="section card"><h2 class="section-title">О чём поговорить в первую очередь</h2>${topics}</div>`
          : '<div class="section card soft">Слабых мест нет: у всех по 2–3 звезды. Предложите сыграть на уровне «Туго».</div>'}
        <div class="section card"><h2 class="section-title">Средние звёзды по показателям</h2><div class="stack">${per}</div></div>
        ${attempts}
        <div class="section card"><h2 class="section-title">Все участники <span class="muted">в порядке из переписки</span></h2>
          <div class="table-wrap"><table class="gtable">
            <thead><tr><th>#</th><th aria-label="Герой"></th><th>★</th>${G.METRICS.map((m) => `<th title="${esc(m.name)}" aria-label="${esc(m.name)}">${m.emoji}</th>`).join('')}<th>Остаток</th><th>Отходы</th><th title="Первая попытка или повторная">Игра</th></tr></thead>
            <tbody>${rows}</tbody></table></div>
          <p class="small muted" style="margin-bottom:0">Звёзды от 0 до 3, красным — 0 или 1. «Остаток» — сколько процентов бюджета осталось в конце недели, «Игра» — первая это попытка или повторная.</p>
        </div>
        <div class="section stack"><button class="btn block" data-act="print" data-what="group">🖨 Распечатать итоги группы</button></div>`;
    } else if (ui.group.text.trim()) {
      out = `<div class="empty-note" style="margin-top:12px">Коды не найдены. Код итога — 12 букв и цифр через дефис, например 4КМТ-Р7ВЖ-ДХ9С.${bad ? ` Похожих на код, но с опечаткой: ${bad}.` : ''}</div>`;
    }
    return `
      <div class="row" style="padding-top:16px"><button class="btn small ghost" data-act="go" data-to="mentor">← Назад</button>
        <span class="spacer"></span><button class="btn small" data-act="big" aria-pressed="${pref.big}">Aa ${pref.big ? 'Обычный шрифт' : 'Крупный шрифт'}</button></div>
      <h1 style="margin-top:8px">📊 Итоги группы</h1>
      <p class="lead muted">Соберите коды итогов — и сразу видно, что у группы получилось и о чём поговорить на разборе.</p>
      <div class="section card">
        <ol class="small" style="margin-top:0;padding-left:20px">
          <li>В конце игры каждый нажимает «Отправить наставнику» и присылает код в общий чат. Или просто показывает экран.</li>
          <li>Скопируйте переписку целиком или введите коды вручную — коды найдутся сами, лишний текст не мешает.</li>
        </ol>
        <label for="group-text" class="small"><b>Коды игроков</b></label>
        <textarea id="group-text" class="field" rows="6" data-change="group" spellcheck="false" placeholder="Например:&#10;Аня: 4КМТ-Р7ВЖ-ДХ9С&#10;Миша: …">${esc(ui.group.text)}</textarea>
        <div class="row wrap" style="margin-top:10px">
          <button class="btn primary" data-act="groupcalc">Посчитать итоги</button>
          <button class="btn" data-act="groupsample">Показать пример</button>
          ${ui.group.text ? '<button class="btn ghost" data-act="groupclear">Очистить</button>' : ''}
        </div>
        <p class="small muted" style="margin-bottom:0">В кодах нет имён и телефонов — только звёзды, регион и цифры недели. Всё считается на этом устройстве, в интернет ничего не отправляется.</p>
      </div>
      ${out}
      ${footer()}`;
  }

  // ---------- модальные окна ----------
  function modalEvent() {
    const s = game;
    const md = ui.modal;
    const ev = md.ev;
    if (md.done) {
      const r = md.done;
      const fx = [r.cost ? `−${rub(r.cost)}` : '', r.gain ? `+${rub(r.gain)}` : ''].filter(Boolean).join(' · ');
      return `<div class="big-em">${ev.emoji}</div><h2>${esc(ev.title)}</h2>
        <p>${esc(r.result || '')}</p>${fx ? `<p><span class="badge orange">${fx}</span></p>` : ''}
        <button class="btn primary block" data-act="closemodal">Дальше</button>`;
    }
    const choices = ev.choices.map((c, i) => {
      const cost = G.choiceCost(s, c);
      const avail = G.choiceAvailable(s, ev, i);
      const hint = cost ? `<span class="badge orange">−${rub(cost)}</span>` : c.gain ? `<span class="badge green">+${rub(c.gain)}</span>` : '';
      return `<button class="btn block" style="justify-content:space-between;text-align:left" data-act="choice" data-i="${i}" ${avail ? '' : 'disabled'}>
        <span>${esc(c.label)}${avail ? '' : ' <span class="small">(не хватает денег)</span>'}</span>${hint}</button>`;
    }).join('');
    return `<div class="big-em">${ev.emoji}</div><p class="small muted" style="margin:0">${esc(weekday(s.day))}, что-то происходит</p>
      <h2>${esc(ev.title)}</h2><p>${esc(ev.text)}</p><div class="stack">${choices}</div>`;
  }

  function modalMeal() {
    const s = game;
    const slot = ui.modal.slot;
    const slotName = slot === 's' ? 'Перекус' : G.SLOTS.find((x) => x.id === slot).name;
    const rows = [];
    const dishes = s.dishes.map((d) => `<button class="item" style="width:100%;text-align:left;cursor:pointer" data-act="eat" data-type="dish" data-uid="${d.uid}">
      <span class="food-em">${d.emoji}</span><span class="body"><span class="name">${esc(d.name)}</span><br><span class="nut">${nutLine(d)}</span></span>
      <span class="badge">${d.portions} ${portionWord(d.portions)}</span></button>`);
    if (dishes.length) rows.push(`<h3>Готовое в холодильнике</h3><div class="list">${dishes.join('')}</div>`);

    if (slot !== 's') {
      const cookable = N.recipes.filter((r) => G.maxPortions(s, r.id) >= 1).map((r) => {
        const n = G.recipeNutrition(r.id);
        const portions = Math.min(r.batch, G.maxPortions(s, r.id));
        return `<button class="item" style="width:100%;text-align:left;cursor:pointer" data-act="cookeat" data-rid="${r.id}">
          <span class="food-em">${r.emoji}</span><span class="body"><span class="name">${esc(r.name)}</span><br><span class="nut">${nutLine(n)}</span></span>
          <span class="badge">⏱ ${r.time} мин${portions > 1 ? ` · ${portions} ${portionWord(portions)}` : ''}</span></button>`;
      });
      if (cookable.length) rows.push(`<h3 style="margin-top:16px">Приготовить сейчас</h3><p class="small muted">Если блюдо готовится на несколько порций, одну съешь сейчас, остальное уберёшь в холодильник.</p><div class="list">${cookable.join('')}</div>`);
    }

    const snackable = N.products.filter((p) => p.snack && G.stock(s, p.id) >= 1).map((p) => {
      const g = Math.min(p.snack, G.stock(s, p.id));
      const n = { kcal: (g * p.kcal) / 100, prot: (g * p.prot) / 100, vf: p.vf ? g : 0 };
      return `<button class="item" style="width:100%;text-align:left;cursor:pointer" data-act="eat" data-type="product" data-pid="${p.id}">
        <span class="food-em">${p.emoji}</span><span class="body"><span class="name">${esc(p.name)}, ${G.fmtAmount(p.id, g)}</span><br><span class="nut">${nutLine(n)}</span></span></button>`;
    });
    if (snackable.length) rows.push(`<h3 style="margin-top:16px">Без готовки</h3><div class="list">${snackable.join('')}</div>`);

    if (slot !== 's') {
      const out = N.outside.map((o) => {
        const price = G.outsidePrice(s, o.id);
        return `<button class="item" style="width:100%;text-align:left;cursor:pointer" data-act="eat" data-type="outside" data-id="${o.id}" ${price > s.money ? 'disabled' : ''}>
          <span class="food-em">${o.emoji}</span><span class="body"><span class="name">${esc(o.name)}</span><br><span class="nut">${nutLine(o)}</span></span>
          <span class="badge orange">${rub(price)}</span></button>`;
      });
      rows.push(`<h3 style="margin-top:16px">Поесть вне дома</h3><div class="list">${out.join('')}</div>`);
    }
    const nothing = !dishes.length && !snackable.length && !N.recipes.some((r) => G.maxPortions(s, r.id) >= 1);
    return `<button class="btn small ghost close" data-act="closemodal" aria-label="Закрыть">✕</button>
      <h2>${slotName}: что едим?</h2>
      ${nothing ? '<div class="empty-note" style="margin-bottom:12px">Дома нечего есть. Загляни в магазин — или поешь вне дома.</div><button class="btn block" data-act="goshop" style="margin-bottom:12px">🛒 В магазин</button>' : ''}
      ${rows.join('')}
      ${slot !== 's' ? '<button class="btn block ghost" style="margin-top:16px" data-act="closemodal">Пропустить приём пищи</button>' : ''}`;
  }

  function modalCook() {
    const s = game;
    const r = G.R[ui.modal.rid];
    const max = G.maxPortions(s, r.id);
    const n = Math.min(ui.modal.n, max);
    const nut = G.recipeNutrition(r.id);
    return `<button class="btn small ghost close" data-act="closemodal" aria-label="Закрыть">✕</button>
      <div class="big-em">${r.emoji}</div><h2>${esc(r.name)}</h2>
      <p class="small muted">Хранится ${r.keep} ${dayWord(r.keep)}. Не готовь больше, чем успеешь съесть.</p>
      <div class="row" style="justify-content:center;margin:16px 0">
        <div class="stepper"><button class="btn" data-act="cookn" data-d="-1" ${n <= 1 ? 'disabled' : ''} aria-label="Меньше порций">−</button>
        <span class="q" style="font-size:1.6em;min-width:48px" aria-live="polite">${n}</span>
        <button class="btn" data-act="cookn" data-d="1" ${n >= max ? 'disabled' : ''} aria-label="Больше порций">+</button></div>
      </div>
      <p class="center small">${portionWord(n)} · всего ${Math.round(nut.kcal * n)} ккал и ${Math.round(nut.prot * n)} г белка</p>
      <div class="list small">${r.ing.map(([pid, g]) => `<div class="row"><span>${P[pid].emoji} ${esc(shortName(pid))}</span><span class="spacer"></span><span>${G.fmtAmount(pid, g * n)}</span></div>`).join('')}</div>
      <button class="btn primary block" style="margin-top:16px" data-act="cook">Приготовить ${n} ${portionWord(n)}</button>`;
  }

  function verdict(p) { return p >= 0.9 ? '✅' : p >= 0.7 ? '🟡' : '🔴'; }
  function modalSummary() {
    const s = game;
    const sm = ui.modal.summary;
    const nr = G.norms(s);
    const spoiled = sm.spoiled.length
      ? `<div class="card flat" style="margin-top:12px;border-color:var(--danger)"><b>🗑 Испортилось и выброшено на ${rub(sm.wasteRub)}</b>
          <ul class="small" style="margin:6px 0 0">${sm.spoiled.map((x) => `<li>${x.emoji} ${esc(x.name)}${x.pid ? ` — ${G.fmtAmount(x.pid, x.g)}` : ` — ${x.portions} ${portionWord(x.portions)}`}</li>`).join('')}</ul></div>` : '';
    const notices = (s.notices || []).map((n) => `<div class="card soft" style="margin-top:12px">📣 ${esc(n)}</div>`).join('');
    const md = sm.moodDelta;
    return `<p class="small muted" style="margin:0">${esc(weekday(sm.day))}</p><h2>День ${sm.day} позади</h2>
      <div class="stack">
        <div class="row"><span>${verdict(sm.kcalPct)}</span><span>Калории</span><span class="spacer"></span><b>${sm.kcal} из ${nr.kcal}</b></div>
        <div class="row"><span>${verdict(sm.protPct)}</span><span>Белок</span><span class="spacer"></span><b>${sm.prot} из ${nr.prot} г</b></div>
        <div class="row"><span>${verdict(sm.vfPct)}</span><span>Овощи и фрукты</span><span class="spacer"></span><b>${sm.vf} из ${nr.vf} г</b></div>
        <div class="row"><span>${moodEmoji(sm.mood)}</span><span>Настроение</span><span class="spacer"></span><b>${sm.mood} <span class="${md >= 0 ? '' : ''}" style="color:${md >= 0 ? 'var(--primary)' : 'var(--danger)'}">(${md >= 0 ? '+' : ''}${md})</span></b></div>
        ${sm.reasons.length ? `<p class="small muted" style="margin:0">${esc(sm.reasons.join(', '))}</p>` : ''}
      </div>
      ${spoiled}${notices}
      <button class="btn primary block" style="margin-top:16px" data-act="nextday">${s.finished ? 'Подвести итоги недели →' : `Наступает ${esc(weekday(s.day))} →`}</button>`;
  }

  function modalConfirmEnd() {
    const d = game.days[game.day];
    const missing = G.SLOTS.filter((sl) => !d.meals[sl.id]).map((sl) => sl.name.toLowerCase());
    return `<div class="big-em">🌙</div><h2>Закончить день?</h2>
      <p>Сегодня не было: <b>${esc(missing.join(', '))}</b>. Пропуски еды снижают настроение и сытость.</p>
      <div class="stack"><button class="btn primary block" data-act="closemodal">Вернуться и поесть</button>
      <button class="btn block" data-act="endconfirm">Всё равно закончить</button></div>`;
  }

  function modalMenu() {
    return `<button class="btn small ghost close" data-act="closemodal" aria-label="Закрыть">✕</button><h2>Меню</h2>
      <div class="stack">
        <button class="btn block" data-act="rules">📖 Как играть</button>
        <button class="btn block" data-act="big" aria-pressed="${pref.big}">Aa ${pref.big ? 'Обычный шрифт' : 'Крупный шрифт (для проектора)'}</button>
        <button class="btn block" data-act="go" data-to="mentor">👩‍🏫 Для наставника</button>
        <button class="btn block" data-act="go" data-to="home">🏠 На главную (игра сохранится)</button>
        <button class="btn block" data-act="restart">🔁 Начать неделю заново</button>
      </div>`;
  }

  function modalRules() {
    return `<button class="btn small ghost close" data-act="closemodal" aria-label="Закрыть">✕</button><h2>Как играть</h2>
      <ol class="stack" style="padding-left:20px">
        <li><b>Магазин.</b> Купи продукты на несколько дней. Сравнивай цену за кг и смотри на срок хранения.</li>
        <li><b>Кухня.</b> Готовь блюда — сразу на несколько порций. Готовая еда хранится 1–3 дня.</li>
        <li><b>Еда.</b> Каждый день — завтрак, обед и ужин. Следи за полосками сверху: калории, белок, овощи и фрукты.</li>
        <li><b>Сроки.</b> Продукты портятся. Мясо, фарш и хлеб можно заморозить кнопкой ❄️.</li>
        <li><b>Ситуации.</b> Каждый день что-то случается — решай сам.</li>
        <li><b>Итоги.</b> Через 7 дней — звёзды за бюджет, сытость, белок, овощи, выброшенную еду и настроение.</li>
      </ol>
      <button class="btn primary block" data-act="closemodal">Понятно</button>`;
  }

  function renderModal() {
    if (!ui.modal) { $modal.innerHTML = ''; return; }
    const map = { event: modalEvent, meal: modalMeal, cook: modalCook, summary: modalSummary, confirmEnd: modalConfirmEnd, menu: modalMenu, rules: modalRules };
    const html = map[ui.modal.type]();
    const blocking = ui.modal.type === 'event' || ui.modal.type === 'summary';
    $modal.innerHTML = `<div class="modal-back" ${blocking ? '' : 'data-act="backdrop"'}><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">${html}</div></div>`;
    const h = $modal.querySelector('.modal h2');
    if (h) h.id = 'modal-title';
    // фокус на само окно, а не на первую кнопку — чтобы не подсказывать «правильный» выбор
    $modal.querySelector('.modal').focus({ preventScroll: true });
  }

  // ---------- печать ----------
  function printHtml(what) {
    const region = game && what === 'report' ? game.region : ui.mentorRegion;
    if (what === 'report' && game) {
      const r = G.report(game);
      return `<h1>Неделя на свои — мои итоги</h1>
        <p>${esc(regionName(game.region))} · бюджет ${rub(game.budget)} · код недели ${esc(game.seed)} · ${r.total} из ${r.max} звёзд — «${esc(r.title.text)}»</p>
        <table><tr><th>Показатель</th><th>Звёзды</th><th>Результат</th></tr>
        ${r.metrics.map((m) => `<tr><td>${m.emoji} ${esc(m.name)}</td><td>${'★'.repeat(m.stars)}${'☆'.repeat(3 - m.stars)}</td><td>${esc(m.value)}</td></tr>`).join('')}</table>
        <h2>Что можно сделать лучше</h2><ul>${r.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        <p>Код итога для наставника: <b>${esc(resultShare().code)}</b></p>
        <h2>Что я сделаю по-другому в жизни</h2><table><tr><td class="blank"></td></tr><tr><td class="blank"></td></tr><tr><td class="blank"></td></tr></table>`;
    }
    if (what === 'group') {
      const { list } = N.results.extract(ui.group.text);
      const sm = N.results.summarize(list);
      if (!sm) return '<h1>Итоги группы</h1><p>Коды не найдены.</p>';
      return `<h1>Неделя на свои — итоги группы</h1>
        <p>${sm.n} ${G.plural(sm.n, ['игрок', 'игрока', 'игроков'])} · в среднем ${one(sm.avgTotal)} из ${sm.max} звёзд · ушли в минус: ${sm.minus} · еды выброшено ≈ ${G.fmtNum(sm.wasteSum)} ₽${sm.first && sm.repeat ? ` · первая попытка ${one(sm.first.avg)} ★, повторная ${one(sm.repeat.avg)} ★` : ''}</p>
        ${sm.topics.length ? `<h2>О чём поговорить</h2><ul>${sm.topics.map((m) => `<li><b>${esc(m.name)}</b> — мало звёзд у ${m.weak} из ${sm.n}. ${esc(N.mentor.groupTopics[m.id])}</li>`).join('')}</ul>` : ''}
        <h2>Средние звёзды</h2>
        <table><tr>${sm.per.map((m) => `<th>${esc(m.name)}</th>`).join('')}</tr><tr>${sm.per.map((m) => `<td>${one(m.avg)} из 3</td>`).join('')}</tr></table>
        <h2>Участники</h2>
        <table><tr><th>#</th><th>Имя (впишите)</th><th>Звёзд</th>${G.METRICS.map((m) => `<th>${esc(m.name)}</th>`).join('')}<th>Остаток денег</th><th>Попытка</th></tr>
        ${list.map((r, i) => `<tr><td>${i + 1}</td><td></td><td>${r.total}</td>${G.METRICS.map((m) => `<td>${r.stars[m.id]}</td>`).join('')}<td>${r.moneyPct}%</td><td>${r.attempt}</td></tr>`).join('')}</table>`;
    }
    if (what === 'cheatsheet') {
      const rank = G.proteinRanking(region);
      const vf = G.vfRanking(region);
      const units = G.unitPrices(region);
      const all = N.products.map((p) => {
        const price = Math.round(p.basis === 'pack' ? units[p.id] : (units[p.id] * p.pack) / 1000);
        return `<tr><td>${p.emoji} ${esc(p.name)}</td><td>${G.fmtPack(p.id)}</td><td>${price} ₽</td><td>${p.basis === 'pack' ? '—' : Math.round(units[p.id]) + (p.unit === 'мл' ? ' ₽/л' : ' ₽/кг')}</td></tr>`;
      }).join('');
      return `<h1>Шпаргалка: цены на продукты — ${esc(regionName(region))}</h1>
        <p class="note">Средние цены Росстата ${esc(N.prices.period)}. Бюджет на неделю для одного человека: ${N.levels.map((l) => `${esc(l.name.toLowerCase())} — ${rub(G.budgetFor(region, l.id))}`).join(', ')}.</p>
        <div class="two">
          <div><h2>Белок — цена 10 г</h2><ol>${rank.map((x) => `<li>${esc(shortName(x.pid))} — ${rub(x.rubPer10g)}${x.animal ? '' : ' (растительный)'}</li>`).join('')}</ol></div>
          <div><h2>Овощи и фрукты — цена за кг</h2><ol>${vf.map((x) => `<li>${esc(x.name)} — ${rub(x.rubPerKg)}</li>`).join('')}</ol></div>
        </div>
        <h2>Все продукты</h2><table><tr><th>Продукт</th><th>Упаковка</th><th>Цена</th><th>За кг / л</th></tr>${all}</table>`;
    }
    // рабочий лист
    const days = G.WEEKDAYS.map((d) => `<th>${d.slice(0, 2).toUpperCase()}</th>`).join('');
    const rows = N.mentor.worksheetRows.map((r) => `<tr><th>${r}</th>${G.WEEKDAYS.map(() => '<td class="blank"></td>').join('')}</tr>`).join('');
    const shop = Array.from({ length: 10 }, () => '<tr><td class="blank"></td><td></td><td></td><td></td></tr>').join('');
    return `<h1>Мой план питания на неделю</h1>
      <p>Бюджет на неделю: ________ ₽ &nbsp;&nbsp; Резерв (10%): ________ ₽ &nbsp;&nbsp; На продукты: ________ ₽</p>
      <table><tr><th></th>${days}</tr>${rows}</table>
      <h2>Список покупок</h2>
      <table><tr><th>Продукт</th><th>Сколько</th><th>Цена за кг</th><th>Сумма</th></tr>${shop}<tr><th colspan="3">Итого</th><td></td></tr></table>
      <p class="note">Подсказки: сравнивай цену за килограмм; скоропортящееся — на 2–3 дня; суп и кашу вари на несколько дней; мясо и хлеб можно заморозить; 400 г овощей и фруктов в день.</p>`;
  }
  function doPrint(what) {
    $print.innerHTML = printHtml(what);
    document.body.classList.add('printing');
    const done = () => { document.body.classList.remove('printing'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
    setTimeout(done, 1500);
  }

  // ---------- переходы ----------
  function openEventIfAny() {
    const ev = game && !game.finished ? G.todayEvent(game) : null;
    if (ev) ui.modal = { type: 'event', ev };
  }
  function go(screen) {
    ui.screen = screen;
    ui.modal = null;
    if (screen === 'day') openEventIfAny();
    render();
    window.scrollTo(0, 0);
    $app.focus({ preventScroll: true });
  }
  function startGame(setup) {
    pref.hero = setup.hero; pref.region = setup.region; pref.level = setup.level; savePref();
    game = G.newGame(setup);
    ui.cart = {};
    save();
    go('intro');
  }

  const actions = {
    go: (d) => go(d.to),
    goshop: () => go('shop'),
    setup: (d) => { ui.setup[d.k] = d.v; render(); },
    start: () => startGame(ui.setup),
    begin: () => go('day'),
    menu: () => { ui.modal = { type: 'menu' }; render(); },
    rules: () => { ui.modal = { type: 'rules' }; render(); },
    closemodal: () => { ui.modal = null; render(); },
    backdrop: (d, el, e) => { if (e.target === el) { ui.modal = null; render(); } },
    big: () => { pref.big = !pref.big; savePref(); document.body.classList.toggle('big', pref.big); if (ui.modal) ui.modal = null; render(); },
    restart: () => { ui.setup = { hero: game.hero, region: game.region, level: game.level, seed: G.randomCode() }; go('setup'); },
    replay: () => { ui.setup = { hero: game.hero, region: game.region, level: game.level, seed: G.randomCode() }; go('setup'); },
    replaysame: () => startGame({ hero: game.hero, region: game.region, level: game.level, seed: game.seed }),
    newseed: () => { ui.mentorSeed = G.randomCode(); render(); },
    playseed: () => { ui.setup.seed = ui.mentorSeed; go('setup'); },
    print: (d) => doPrint(d.what),
    share: () => {
      const { text } = resultShare();
      if (navigator.share) navigator.share({ title: 'Неделя на свои', text }).catch((e) => { if (!e || e.name !== 'AbortError') copyText(text); });
      else copyText(text);
    },
    copycode: () => copyText(resultShare().text),
    groupcalc: () => {
      render();
      const res = document.getElementById('group-results');
      if (res) res.scrollIntoView({ block: 'start' });
    },
    groupsample: () => { ui.group.text = N.results.sample(ui.mentorRegion, ui.mentorSeed); saveGroup(); actions.groupcalc(); },
    groupclear: () => { ui.group.text = ''; saveGroup(); render(); },

    cat: (d) => { ui.cat = d.cat; render(); },
    qty: (d) => {
      const q = Math.max(0, (ui.cart[d.pid] || 0) + Number(d.d));
      if (q) ui.cart[d.pid] = q; else delete ui.cart[d.pid];
      render();
    },
    clearcart: () => { ui.cart = {}; render(); },
    pay: () => {
      const r = G.buy(game, ui.cart);
      if (!r.ok) { toast(r.reason); return; }
      ui.cart = {};
      save();
      toast(`Куплено на ${rub(r.total)}. Осталось ${rub(game.money)}`);
      go('day');
    },

    freeze: (d) => { if (G.freeze(game, d.pid)) { save(); toast(`❄️ ${P[d.pid].name}: в морозилке не испортится`); render(); } },
    cookopen: (d) => { const r = G.R[d.rid]; ui.modal = { type: 'cook', rid: d.rid, n: Math.min(r.batch, G.maxPortions(game, d.rid)) }; render(); },
    cookn: (d) => { ui.modal.n = Math.max(1, Math.min(G.maxPortions(game, ui.modal.rid), ui.modal.n + Number(d.d))); render(); },
    cook: () => {
      const r = G.cook(game, ui.modal.rid, ui.modal.n);
      if (!r.ok) { toast(r.reason); return; }
      save();
      ui.modal = null;
      toast(`Готово: ${r.dish.name.toLowerCase()}, ${r.dish.portions} ${portionWord(r.dish.portions)} в холодильнике`);
      render();
    },
    buymissing: (d) => {
      const miss = G.missingFor(game, d.rid, 1);
      for (const m of miss) {
        const packs = Math.ceil((m.need - m.have) / P[m.pid].pack);
        ui.cart[m.pid] = Math.max(ui.cart[m.pid] || 0, packs);
      }
      if (miss.length) ui.cat = P[miss[0].pid].cat;
      toast('Недостающее добавлено в корзину');
      go('shop');
    },

    meal: (d) => { ui.modal = { type: 'meal', slot: d.slot }; render(); },
    eat: (d) => {
      const src = d.type === 'dish' ? { type: 'dish', uid: Number(d.uid) } : d.type === 'product' ? { type: 'product', pid: d.pid } : { type: 'outside', id: d.id };
      const r = G.eat(game, ui.modal.slot, src);
      if (!r.ok) { toast(r.reason); return; }
      save();
      ui.modal = null;
      toast(`${r.entry.emoji} ${r.entry.name}: +${Math.round(r.entry.kcal)} ккал`);
      render();
    },
    cookeat: (d) => {
      const rec = G.R[d.rid];
      const n = Math.min(rec.batch, G.maxPortions(game, d.rid));
      const c = G.cook(game, d.rid, n);
      if (!c.ok) { toast(c.reason); return; }
      const r = G.eat(game, ui.modal.slot, { type: 'dish', uid: c.dish.uid });
      save();
      ui.modal = null;
      toast(n > 1 ? `Приготовлено ${n} ${portionWord(n)}: одну съел, остальное в холодильнике` : `${rec.emoji} ${rec.name}: +${Math.round(r.entry.kcal)} ккал`);
      render();
    },

    choice: (d) => {
      const r = G.applyChoice(game, Number(d.i));
      if (!r.ok) { toast(r.reason); return; }
      save();
      ui.modal = { type: 'event', ev: ui.modal.ev, done: r };
      render();
    },

    endday: () => {
      const d = game.days[game.day];
      if (G.SLOTS.some((sl) => !d.meals[sl.id])) { ui.modal = { type: 'confirmEnd' }; render(); return; }
      actions.endconfirm();
    },
    endconfirm: () => {
      const summary = G.endDay(game);
      save();
      ui.modal = { type: 'summary', summary };
      render();
    },
    nextday: () => {
      if (game.finished) { markAttempt(); go('final'); return; }
      ui.modal = null;
      go('day');
    },
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = actions[el.dataset.act];
    if (fn) fn(el.dataset, el, e);
  });
  document.addEventListener('change', (e) => {
    const k = e.target.dataset && e.target.dataset.change;
    if (k === 'region') { ui.setup.region = e.target.value; render(); }
    if (k === 'mentorRegion') { ui.mentorRegion = e.target.value; render(); }
  });
  document.addEventListener('input', (e) => {
    if (e.target.dataset && e.target.dataset.change === 'seed') ui.setup.seed = G.normCode(e.target.value) || G.randomCode();
    if (e.target.dataset && e.target.dataset.change === 'group') { ui.group.text = e.target.value; saveGroup(); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && ui.modal && !['event', 'summary'].includes(ui.modal.type)) { ui.modal = null; render(); }
  });

  // ---------- отрисовка ----------
  function render() {
    const screens = { home: screenHome, setup: screenSetup, intro: screenIntro, day: screenDay, shop: screenShop, kitchen: screenKitchen, final: screenFinal, mentor: screenMentor, group: screenGroup };
    if (!game && !['home', 'setup', 'mentor', 'group'].includes(ui.screen)) ui.screen = 'home';
    $app.innerHTML = screens[ui.screen]();
    const chips = $app.querySelector('.chips');
    const active = chips && chips.querySelector('[aria-pressed="true"]');
    if (active) chips.scrollLeft = active.offsetLeft - chips.clientWidth / 2 + active.clientWidth / 2;
    renderModal();
  }

  document.body.classList.toggle('big', pref.big);
  if (ui.screen === 'day') openEventIfAny();
  if (demo === 'meal') ui.modal = { type: 'meal', slot: 'l' };
  if (demo === 'shop') { ui.cat = 'meat'; ui.cart = { okorochka: 1, yaica: 1 }; }
  render();

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  window.NNS.app = { ui, get game() { return game; }, actions, render };
})(window.NNS);

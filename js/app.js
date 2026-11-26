// Интерфейс «Недели на свои». Вся логика игры — в engine.js, здесь только экраны и кнопки.
// Оформление: ценник и кассовый чек (css/style.css), стикеры продуктов и блюд — js/stickers.js.
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
  const demo = params.get('demo'); // ?demo=day|event|shop|kitchen|meal|final|mentor|group — для скриншотов и показа, сохранение не трогает
  if (demo) pref.region = params.get('region') || '22000000000';
  let game = demo ? (['home', 'setup'].includes(demo) ? null : demoGame(demo)) : (function () {
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
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const dayWord = (n) => G.plural(n, ['день', 'дня', 'дней']);
  const portionWord = (n) => G.plural(n, ['порция', 'порции', 'порций']);
  const shortName = (pid) => P[pid].name.replace(/,\s+\d.*$/, ''); // «Яйца, 10 шт» → «Яйца», но «Молоко 2,5%» не трогаем
  const one = (v) => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
  const SLOT_TIME = { b: '08:00', l: '13:00', d: '19:00' };
  const WD = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
  const SHORT = { money: 'Бюдж', kcal: 'Сыт', prot: 'Бел', vf: 'О+Ф', waste: 'Отх', mood: 'Настр' };

  // Линейные иконки 24×24. Рисуются цветом текста.
  const ICONS = {
    cart: '<path d="M2.5 4h2.2l2.1 10.1a1.2 1.2 0 0 0 1.2 1h8.7a1.2 1.2 0 0 0 1.2-.9L20 7.5H5.6"/><circle cx="9" cy="19.3" r="1.3"/><circle cx="16.8" cy="19.3" r="1.3"/>',
    pot: '<path d="M4 10h16v5.5a4.5 4.5 0 0 1-4.5 4.5h-7A4.5 4.5 0 0 1 4 15.5z"/><path d="M2 10h2M20 10h2M9.5 3.5c-.8 1 .8 2 0 3.2M14.5 3.5c-.8 1 .8 2 0 3.2"/>',
    moon: '<path d="M19.5 14.6A7.8 7.8 0 1 1 9.4 4.5a6.2 6.2 0 0 0 10.1 10.1z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
    back: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
    arrow: '<path d="M4.5 12h15M13.5 6l6 6-6 6"/>',
    snow: '<path d="M12 2.8v18.4M4 7.4l16 9.2M4 16.6l16-9.2"/><path d="M9.6 4.6 12 7l2.4-2.4M9.6 19.4 12 17l2.4 2.4"/>',
    print: '<path d="M7 8.5v-5h10v5"/><path d="M7 17H4.5a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1h15a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H17"/><path d="M7 13.5h10v7H7z"/>',
    send: '<path d="M20.5 3.5 3.5 10.6l6.8 2.6 2.6 6.8z"/><path d="m10.3 13.2 5-5"/>',
    copy: '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="1"/><path d="M15.5 8.5V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v9.5a1 1 0 0 0 1 1h3.5"/>',
    repeat: '<path d="M4 11.5a7.5 7.5 0 0 1 13.3-4.7L19.5 9"/><path d="M19.5 4v5h-5"/><path d="M20 12.5a7.5 7.5 0 0 1-13.3 4.7L4.5 15"/><path d="M4.5 20v-5h5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    chart: '<path d="M5 20v-8M11 20V5M17 20v-5M2.5 20.5h19"/>',
    book: '<path d="M12 6.5C10.5 5 8 4.5 4 4.5v14c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-14c-4 0-6.5.5-8 2zM12 6.5v14"/>',
    home: '<path d="M4 11 12 4l8 7M6.5 9v11h11V9"/>',
    users: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.5 14.7c1.6.6 2.7 2.2 3 4.8"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5"/>',
    star: '<path d="M12 2.8l2.75 5.95 6.5.75-4.82 4.43 1.3 6.42L12 17.1l-5.73 3.25 1.3-6.42L2.75 9.5l6.5-.75z"/>',
  };
  const icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;
  function face(m) {
    const mouth = m >= 70 ? 'M8.3 14.2c1.9 2.3 5.5 2.3 7.4 0' : m >= 50 ? 'M8.8 14.8c1.6 1 4.8 1 6.4 0' : m >= 30 ? 'M9 15.2h6' : 'M8.6 16.4c1.8-1.9 5-1.9 6.8 0';
    return `<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M9 9.6v.6M15 9.6v.6"/><path d="${mouth}"/></svg>`;
  }
  const starsHtml = (n, max = 3) => `<span class="stars" role="img" aria-label="${n} из ${max} звёзд">${icon('star', 'fill').repeat(n)}${max > n ? `<span class="stars off">${icon('star', 'fill').repeat(max - n)}</span>` : ''}</span>`;
  const sec = (n, title, aside) => `<h2 class="sec-h">${n ? `<span class="n">${String(n).padStart(2, '0')}</span>` : ''}${title}${aside ? `<span class="aside">${aside}</span>` : ''}</h2>`;
  const rline = (name, value, sub, subCls = '') => `<div class="r-line"><span class="r-name">${name}</span><i></i><span>${value}</span></div>${sub ? `<div class="r-sub ${subCls}">${sub}</div>` : ''}`;

  // Штрихкод из кода итога: только для вида чека, не сканируется.
  function barcode(code) {
    const bars = [];
    let x = 0;
    const put = (w, on) => { if (on) bars.push(`<rect x="${x}" width="${w}" height="40"/>`); x += w; };
    put(1, 1); put(1, 0); put(1, 1); put(2, 0);
    for (const c of code.replace(/-/g, '')) {
      const v = Math.max(0, N.results.ABC.indexOf(c));
      for (let b = 4; b >= 0; b--) { put((v >> b) & 1 ? 2 : 1, 1); put(1, 0); }
      put(1, 0);
    }
    put(1, 0); put(1, 1); put(1, 0); put(1, 1);
    return `<svg class="barcode" viewBox="0 0 ${x} 40" preserveAspectRatio="none" fill="currentColor" aria-hidden="true">${bars.join('')}</svg>`;
  }

  // Код итога недели — его игрок отправляет наставнику (см. results.js)
  function resultShare() {
    const r = G.report(game);
    const code = N.results.encode(N.results.fieldsOf(game, r));
    const text = `Неделя на свои: ${r.total} из ${r.max} ★ — «${r.title.text}». ${regionName(game.region)}, код недели ${game.seed}. Код итога для наставника: ${code}`;
    return { code, text };
  }
  function copyText(text) {
    const ok = () => toast('Скопировано. Вставь в чат группы');
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
      if (done) ok(); else toast('Не получилось скопировать. Перепиши код с экрана');
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
    const ticks = Array.from({ length: G.DAYS }, (_, i) => `<i class="${i + 1 < s.day ? 'done' : i + 1 === s.day ? 'now' : ''}"></i>`).join('');
    return `
      <header class="topbar">
        <div class="tb-row">
          ${opts.back ? `<button class="btn ghost icon-btn" data-act="go" data-to="day" aria-label="Назад, к дню">${icon('back')}</button>` : ''}
          <div class="tb-day"><span class="label">День ${s.day} из ${G.DAYS}</span><b>${esc(weekday(s.day))}</b><div class="ticks" aria-hidden="true">${ticks}</div></div>
          <div class="spacer"></div>
          <div class="tb-mood" title="Настроение ${s.mood} из 100" aria-label="Настроение ${s.mood} из 100">${face(s.mood)}<span>${s.mood}</span></div>
          <div class="tb-money ${s.money < s.budget * 0.1 ? 'low' : ''}"><span class="label">осталось</span><b>${rub(s.money)}</b></div>
          ${opts.back ? '' : `<button class="btn ghost icon-btn" data-act="menu" aria-label="Меню">${icon('menu')}</button>`}
        </div>
        <div class="meters" aria-label="Питание за сегодня">
          ${meter('Ккал', 'Калории', t.kcal, nr.kcal, '')}
          ${meter('Белок', 'Белок', t.prot, nr.prot, ' г')}
          ${meter('Овощи и фрукты', 'Овощи и фрукты', t.vf, nr.vf, ' г')}
        </div>
      </header>`;
  }
  function meter(label, full, v, norm, unit) {
    const p = pct(v, norm);
    return `<div class="meter ${p >= 90 ? 'full' : ''}"><div class="m-lbl">${label}</div>
      <div class="track" role="progressbar" aria-label="${full}" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><i style="width:${p}%"></i></div>
      <div class="m-val">${Math.round(v)} / ${norm}${unit}</div></div>`;
  }
  function nutLine(n) {
    return `<span>${Math.round(n.kcal)} ккал</span><span>белок ${Math.round(n.prot)} г</span>${n.vf ? `<span>овощи и фрукты ${Math.round(n.vf)} г</span>` : ''}`;
  }
  function footer() {
    return `<footer class="footer">
      <p>Цены: ${esc(N.prices.source)}, ${esc(N.prices.period)} Нормы питания: МР 2.3.1.0253-21 Роспотребнадзора (18–29 лет), овощи и фрукты: рекомендация ВОЗ.</p>
      <p>Независимый проект для конкурса «Вайбкодинг добрых дел» в поддержку программы «Готовим будущее» фонда «Выручаем». Не является официальным продуктом фонда. Игра не собирает персональные данные и работает без интернета.</p>
    </footer>`;
  }
  const backTo = (to, text = 'Назад') => `<div class="nav-top"><button class="btn ghost small" data-act="go" data-to="${to}">${icon('back')}${text}</button><span class="spacer"></span>`;
  const bigBtn = () => `<button class="btn small" data-act="big" aria-pressed="${pref.big}">Aa ${pref.big ? 'Обычный шрифт' : 'Крупный шрифт'}</button>`;

  // ---------- экраны ----------
  function screenHome() {
    const budget = G.budgetFor(pref.region, 'normal');
    const cont = game && !game.finished;
    return `
      <section class="home">
        <p class="label">Игра-тренажёр · ${N.prices.regions.length - 1} ${G.plural(N.prices.regions.length - 1, ['регион', 'региона', 'регионов'])} · цены Росстата</p>
        <h1>Неделя <span class="nowrap">на свои</span></h1>
        <p class="lead">Первая неделя самостоятельной жизни. Денег на еду ровно на семь дней. Получится нормально питаться, ничего не выбросить и не уйти в минус?</p>
        <div class="pricetag" role="img" aria-label="Неделя еды для одного человека: ${rub(budget)}, ${esc(regionName(pref.region))}">
          <div class="pt-top"><span>Неделя еды</span><span>1 человек · 7 дней</span></div>
          <div class="pt-price">${G.fmtNum(budget)}<small>₽</small></div>
          <div class="pt-bottom">${esc(regionName(pref.region))}<br>средние цены Росстата ${esc(N.prices.period)}</div>
        </div>
        <div class="cta">
          ${cont ? `<button class="btn primary block" data-act="go" data-to="day">Продолжить: ${esc(weekday(game.day))}, ${rub(game.money)}${icon('arrow')}</button>` : ''}
          <button class="btn ${cont ? '' : 'primary'} block" data-act="go" data-to="setup">${cont ? 'Начать новую неделю' : `Начать неделю${icon('arrow')}`}</button>
          <button class="btn block" data-act="go" data-to="mentor">Для наставника: план занятия</button>
        </div>
        <p class="small muted" style="margin-top:0.75rem">Около 20 минут · без регистрации · работает без интернета</p>
      </section>
      <section class="sec">
        ${sec(0, 'Как устроена неделя')}
        <ol class="steps">
          <li><b>Магазин</b><span>${N.products.length} продуктов по ценам твоего региона. Каждый день акции, и не все выгодны.</span></li>
          <li><b>Кухня</b><span>${N.recipes.length} простых рецепта. Можно готовить сразу на несколько дней.</span></li>
          <li><b>Сроки годности</b><span>Продукты портятся. Мясо и хлеб можно заморозить.</span></li>
          <li><b>Ситуации</b><span>Друг зовёт в бургерную, сосед просит в долг, отключили свет.</span></li>
          <li><b>Чек недели</b><span>Разбор по шести показателям и советы на цифрах твоего региона.</span></li>
        </ol>
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
        <span class="ava" aria-hidden="true">${esc(h.name[0])}</span>
        <span><span class="title">${esc(h.name)}, 18 лет</span>
        <span class="small">${esc(h.text)} Норма: ${h.kcal} ккал и ${h.prot} г белка в день.</span></span>
      </button>`).join('');
    const levels = N.levels.map((l) => `
      <button class="lvl" data-act="setup" data-k="level" data-v="${l.id}" aria-pressed="${s.level === l.id}">
        <span class="lvl-name">${esc(l.name)}</span>
        <span class="lvl-price">${rub(G.budgetFor(s.region, l.id))}</span>
        <span class="lvl-text">${esc(l.text)}</span>
      </button>`).join('');
    return `
      ${backTo('home', 'На главную')}</div>
      <h1 class="page-h">Новая неделя</h1>
      <section class="sec">${sec(1, 'Кто ты')}<div class="choice-grid">${heroes}</div></section>
      <section class="sec">
        ${sec(2, 'Где живёшь')}
        <label class="hint" for="region" style="display:block;margin:0 0 0.4rem">От региона зависят цены в магазине</label>
        <select id="region" class="field" data-change="region">${regionOptions(s.region)}</select>
      </section>
      <section class="sec">${sec(3, 'Бюджет на еду', 'на 7 дней')}<div class="levels">${levels}</div>
        <p class="hint">Бюджет посчитан по ценам выбранного региона. «Обычно» — разумный набор продуктов на неделю.</p></section>
      <section class="sec">
        ${sec(4, 'Код недели', 'для игры в группе')}
        <input id="seed" class="field code" data-change="seed" value="${esc(s.seed)}" maxlength="12" autocomplete="off" spellcheck="false" aria-label="Код недели" aria-describedby="seed-help">
        <p id="seed-help" class="hint">С одинаковым кодом у всей группы будут одни и те же события и акции. Так итоги можно честно сравнить.</p>
      </section>
      <div class="sec"><button class="btn primary block" data-act="start">Начать неделю${icon('arrow')}</button></div>`;
  }

  function screenIntro() {
    const s = game;
    const h = G.H[s.hero];
    const she = s.hero === 'anya';
    return `
      <section style="padding-top:1.5rem">
        <p class="label">${esc(regionName(s.region))} · код недели ${esc(s.seed)}</p>
        <h1>${esc(h.name)} начинает жить сам${she ? 'а' : ''}</h1>
        <p class="lead">${esc(h.text)} Первая неделя без воспитателей и общей столовой. Холодильник пустой, есть только соль и специи.</p>
      </section>
      <div class="receipt-wrap"><div class="receipt">
        <div class="r-center r-shop">Условия недели</div>
        <hr class="r-sep">
        ${rline('Бюджет на еду', rub(s.budget), 'на 7 дней, по ценам Росстата')}
        ${rline('Калории', `${h.kcal} ккал в день`)}
        ${rline('Белок', `${h.prot} г в день`, `норма для ${she ? 'девушки' : 'парня'} 18 лет, который учится и двигается`)}
        ${rline('Овощи и фрукты', '400 г в день', 'картошка не считается, это гарнир')}
        <hr class="r-sep">
        ${rline('Мясо, фарш', '2–3 дня')}
        ${rline('Хлеб', '4 дня', 'мясо и хлеб можно заморозить')}
        <hr class="r-sep">
        <div class="r-center">Каждый день что-то случается.<br>Правильных ответов несколько.</div>
      </div></div>
      <div class="sec" style="margin-top:1.25rem"><button class="btn primary block" data-act="begin">Понедельник, поехали${icon('arrow')}</button></div>`;
  }

  function expiryBadge(exp, frozen) {
    if (frozen) return '<span class="st cold">в морозилке</span>';
    const left = exp - game.day;
    if (left < 0) return '<span class="st red">испортилось</span>';
    if (left === 0) return '<span class="st red">съесть сегодня</span>';
    if (left === 1) return '<span class="st amber">до завтра</span>';
    if (left > 60) return '';
    return `<span class="st">ещё ${left + 1} ${dayWord(left + 1)}</span>`;
  }
  // Картинка продукта или блюда: свой стикер (js/stickers.js), а если его нет — эмодзи
  const pic = (item) => {
    const stk = N.stickers ? N.stickers.pic(item) : '';
    return stk ? `<span class="pic has-stk" aria-hidden="true">${stk}</span>` : `<span class="pic" aria-hidden="true">${(item && item.emoji) || ''}</span>`;
  };

  function screenDay() {
    const s = game;
    const d = s.days[s.day];
    let n = 0;
    const meals = G.SLOTS.map((sl) => {
      const m = d.meals[sl.id];
      if (m) {
        return `<div class="meal"><span class="time">${SLOT_TIME[sl.id] || ''}</span>
          <div><div class="slot">${sl.name} <span class="done" role="img" aria-label="съедено">${icon('check')}</span></div><div class="name">${esc(m.name)}</div><div class="nut">${nutLine(m)}</div></div>
          ${pic(m)}</div>`;
      }
      return `<div class="meal empty"><span class="time">${SLOT_TIME[sl.id] || ''}</span>
        <div><div class="slot">${sl.name}</div><div class="name">ещё не было</div></div>
        <button class="btn small primary" data-act="meal" data-slot="${sl.id}">Выбрать</button></div>`;
    }).join('');
    const extras = [...d.snacks, ...d.extra];
    const extrasHtml = extras.length
      ? `<div class="extras">${extras.map((e) => `<div class="rowi">${pic(e)}<div class="body"><div class="name">${esc(e.name)}</div><div class="nut">${nutLine(e)}</div></div></div>`).join('')}</div>`
      : '';
    const dishes = s.dishes.map((x) => `
      <div class="rowi">${pic(x)}
        <div class="body"><div class="name">${esc(x.name)}</div>
          <div class="sub">${x.portions} ${portionWord(x.portions)} · ${Math.round(x.kcal)} ккал, белок ${Math.round(x.prot)} г в порции</div></div>
        ${expiryBadge(x.exp, false)}</div>`).join('');
    const pantry = G.pantryView(s).map((x) => {
      const p = P[x.pid];
      const freezeBtn = p.freeze && !x.frozen ? `<button class="btn small icon-btn" data-act="freeze" data-pid="${x.pid}" aria-label="Заморозить: ${esc(p.name)}" title="Заморозить">${icon('snow')}</button>` : '';
      return `<div class="rowi">${pic(p)}
        <div class="body"><div class="name">${esc(p.name)}</div><div class="sub mono">${G.fmtAmount(x.pid, x.g)}</div></div>
        ${expiryBadge(x.exp, x.frozen)}${freezeBtn}</div>`;
    }).join('');

    const empty = !s.pantry.length && !s.dishes.length;
    return `
      ${topbar()}
      <section class="sec" style="margin-top:1.5rem">
        ${sec(++n, 'Еда сегодня')}
        <div class="meals">${meals}</div>
        ${extrasHtml}
        <button class="btn small addsnack" data-act="meal" data-slot="s">${icon('plus')}Перекусить</button>
      </section>
      ${s.dishes.length ? `<section class="sec">${sec(++n, 'Готовая еда', 'в холодильнике')}<div class="rows">${dishes}</div></section>` : ''}
      <section class="sec">
        ${sec(++n, 'Холодильник и шкаф')}
        ${empty ? '<div class="empty-note">Пусто. Начни с магазина и составь список на несколько дней вперёд.</div>' : `<div class="rows">${pantry || '<div class="empty-note">Продуктов нет, только готовая еда.</div>'}</div>`}
      </section>
      <nav class="actionbar" aria-label="Действия"><div class="inner">
        <button class="btn" data-act="go" data-to="shop">${icon('cart')}Магазин</button>
        <button class="btn" data-act="go" data-to="kitchen">${icon('pot')}Кухня</button>
        <button class="btn primary" data-act="endday">${icon('moon')}${s.day === G.DAYS ? 'Итоги недели' : 'Закончить день'}</button>
      </div></nav>`;
  }

  function cartCount() { return Object.values(ui.cart).reduce((a, b) => a + b, 0); }

  function screenShop() {
    const s = game;
    const promos = (s.plan.promos[s.day] || []).map((pr) => {
      const p = P[pr.pid];
      return `<button class="promo" data-act="cat" data-cat="${p.cat}">${pic(p)}
        <span class="pct">−${pr.pct}%</span><span class="nm">${esc(p.name)}</span>
        <span class="pr">${rub(G.packPrice(s, pr.pid).price)} вместо ${rub(G.basePackPrice(s, pr.pid))}</span></button>`;
    }).join('');
    const tabs = N.categories.map((c) => `<button class="tab" data-act="cat" data-cat="${c.id}" aria-pressed="${ui.cat === c.id}">${esc(c.name)}</button>`).join('');
    const items = N.products.filter((p) => p.cat === ui.cat).map((p) => {
      const pp = G.packPrice(s, p.id);
      const q = ui.cart[p.id] || 0;
      const perKg = (pp.price / p.pack) * 1000;
      const unit = p.basis === 'pack' ? `за ${G.fmtPack(p.id)}` : `${G.fmtNum(perKg)} ₽ за ${p.unit === 'мл' ? 'л' : 'кг'}`;
      const prot10 = G.isProteinSource(p) ? `<span class="st">10 г белка — ${rub((pp.price / ((p.pack * p.prot) / 100)) * 10)}</span>` : '';
      const have = G.stock(s, p.id);
      const keep = p.frozen ? 'заморозка' : p.shelf > 60 ? 'хранится долго' : `хранится ${p.shelf} ${dayWord(p.shelf)}`;
      return `<div class="product">
        ${pic(p)}
        <div class="info"><div class="name">${esc(p.name)}</div><div class="facts">${G.fmtPack(p.id)} · ${keep}</div></div>
        <div class="ptag ${pp.pct ? 'sale' : ''}">${pp.pct ? `<span class="off">−${pp.pct}%</span><s>${rub(pp.base)}</s>` : ''}<span class="p">${G.fmtNum(pp.price)}<small>₽</small></span><span class="u">${unit}</span></div>
        <div class="meta">${prot10}${have ? `<span class="st ok">дома ${G.fmtAmount(p.id, have)}</span>` : ''}</div>
        <div class="stepper">
          <button data-act="qty" data-pid="${p.id}" data-d="-1" aria-label="Убрать: ${esc(p.name)}" ${q ? '' : 'disabled'}>${icon('minus')}</button>
          <span class="q" aria-live="polite">${q}</span>
          <button data-act="qty" data-pid="${p.id}" data-d="1" aria-label="Добавить: ${esc(p.name)}">${icon('plus')}</button>
        </div>
      </div>`;
    }).join('');
    const total = G.cartTotal(s, ui.cart);
    const after = s.money - total;
    const count = cartCount();
    return `
      ${topbar({ back: true })}
      <h1 class="page-h">Магазин у дома</h1>
      <p class="muted small">Сравнивай цену за килограмм, а не за пачку. Скоропортящееся бери на 2–3 дня.</p>
      ${promos ? `<section class="sec" style="margin-top:1.25rem">${sec(0, 'Акции дня')}<div class="promos">${promos}</div></section>` : ''}
      <div class="tabs" role="toolbar" aria-label="Отделы магазина">${tabs}</div>
      <div class="products">${items}</div>
      <nav class="actionbar" aria-label="Корзина"><div class="cart-inner">
        <div class="cart-sum"><span class="label">Корзина · ${count} шт.</span><b>${rub(total)}</b>
          <span class="small ${after < 0 ? 'over' : 'muted'}">${after < 0 ? `Не хватает ${rub(-after)}` : `Останется ${rub(after)}`}</span></div>
        ${count ? `<button class="btn ghost icon-btn" data-act="clearcart" aria-label="Очистить корзину" title="Очистить корзину">${icon('trash')}</button>` : ''}
        <button class="btn primary" data-act="pay" ${!count || after < 0 ? 'disabled' : ''}>Оплатить</button>
      </div></nav>`;
  }

  function recipeCard(r, can) {
    const s = game;
    const n = G.recipeNutrition(r.id);
    const ing = r.ing.map(([pid, g]) => {
      const miss = G.stock(s, pid) + 0.5 < g;
      return `<li class="${miss ? 'miss' : ''}"><span>${esc(shortName(pid))}</span><span class="amt">${G.fmtAmount(pid, g)}</span></li>`;
    }).join('');
    const max = G.maxPortions(s, r.id);
    return `<article class="card recipe">
      <div class="head">${pic(r)}<div><h3>${esc(r.name)}</h3>
        <div class="nut"><span>${r.time} мин</span><span>хранится ${r.keep} ${dayWord(r.keep)}</span>${r.cold ? '<span>без плиты</span>' : ''}</div></div></div>
      <ul class="ings" aria-label="Продукты на порцию">${ing}</ul>
      <div class="nut" style="margin-bottom:0.6rem">На порцию: ${nutLine(n)}</div>
      <p class="tip">${esc(r.tip)}</p>
      ${can
        ? `<button class="btn primary small" data-act="cookopen" data-rid="${r.id}">Приготовить · до ${max} ${portionWord(max)}</button>`
        : `<button class="btn small" data-act="buymissing" data-rid="${r.id}">${icon('cart')}Докупить недостающее</button>`}
    </article>`;
  }

  function screenKitchen() {
    const s = game;
    const can = N.recipes.filter((r) => G.maxPortions(s, r.id) >= 1);
    const cannot = N.recipes.filter((r) => G.maxPortions(s, r.id) < 1)
      .sort((a, b) => G.missingFor(s, a.id).length - G.missingFor(s, b.id).length);
    return `
      ${topbar({ back: true })}
      <h1 class="page-h">Кухня</h1>
      <p class="muted small">Готовь сразу на 2–4 дня: так дешевле и быстрее. Готовая еда хранится 1–3 дня.</p>
      <section class="sec" style="margin-top:1.25rem">${sec(1, 'Можно приготовить', String(can.length))}
        ${can.length ? `<div class="recipes">${can.map((r) => recipeCard(r, true)).join('')}</div>` : '<div class="empty-note">Пока не из чего. Посмотри рецепты ниже и докупи продукты.</div>'}</section>
      <section class="sec">${sec(2, 'Не хватает продуктов', String(cannot.length))}<div class="recipes">${cannot.map((r) => recipeCard(r, false)).join('')}</div></section>`;
  }

  function screenFinal() {
    const s = game;
    const r = G.report(s);
    const nr = G.norms(s);
    const share = resultShare();
    const metrics = r.metrics.map((m) => `<div class="metric">${rline(esc(m.name), starsHtml(m.stars), esc(m.value))}</div>`).join('');
    const maxK = Math.max(nr.kcal * 1.15, ...s.history.map((h) => h.kcal));
    const normAt = (nr.kcal / maxK) * 100;
    const week = s.history.map((h) => `<div class="col"><span class="num">${h.kcal}</span>
      <div class="bar"><i class="${h.kcalPct >= 0.9 ? '' : 'low'}" style="height:${Math.max(3, (h.kcal / maxK) * 100)}%"></i><span class="norm" style="bottom:${normAt}%"></span></div>
      <span class="day">${WD[h.day - 1]}</span></div>`).join('');
    const rank = r.protRank;
    const maxR = Math.max(...rank.map((x) => x.rubPer10g));
    const bars = rank.map((x) => `<div class="hbar"><span>${esc(shortName(x.pid))}${x.animal ? '' : '<span class="tagline">растит.</span>'}</span>
      <span class="track"><i class="${x.rubPer10g > rank[0].rubPer10g * 3 ? 'hi' : ''}" style="width:${(x.rubPer10g / maxR) * 100}%"></i></span><b>${rub(x.rubPer10g)}</b></div>`).join('');
    const level = N.levels.find((l) => l.id === s.level);
    return `
      <section class="final">
        <p class="label">${esc(cap(weekday(G.DAYS)))}, вечер · неделя закончилась</p>
        <h2 style="font-size:2rem;text-transform:uppercase;font-weight:600">Чек твоей недели</h2>
      </section>
      <div class="receipt-wrap"><article class="receipt score-hero" aria-label="Итоги недели">
        <div class="r-center"><div class="r-shop">Неделя на свои</div>
          <div>${esc(G.H[s.hero].name)} · ${esc(regionName(s.region))}</div>
          <div>Код недели ${esc(s.seed)} · ${esc(level ? level.name.toLowerCase() : '')}</div></div>
        <hr class="r-sep">
        ${rline('Бюджет недели', rub(s.budget))}
        ${rline('В магазине', rub(r.stats.spentShop))}
        ${rline('Кафе и доставка', rub(r.stats.cafe))}
        ${rline('Приготовлено блюд', r.stats.cooked)}
        ${rline('Осталось в холодильнике', `на ${rub(r.leftover)}`)}
        <hr class="r-sep">
        ${metrics}
        <hr class="r-sep">
        <div class="r-line r-total"><span>Итого</span><i></i><span>${r.total} / ${r.max}</span></div>
        <h1 class="stamp">${esc(r.title.text)}</h1>
        <hr class="r-sep">
        <div class="r-center"><div class="r-name">Код итога для наставника</div>
          <div class="code-box result-code" aria-label="Код итога">${esc(share.code)}</div>
          <div class="r-sub">Без имени и телефона: только звёзды и цифры недели</div></div>
        ${barcode(share.code)}
        <div class="r-center r-sub">Спасибо за неделю!</div>
      </article></div>
      <div class="share-row">
        <button class="btn primary" data-act="share">${icon('send')}Отправить наставнику</button>
        <button class="btn" data-act="copycode">${icon('copy')}Скопировать</button>
      </div>
      <p class="hint">Играешь на занятии? Отправь код в чат группы, и наставник увидит итоги всех.</p>
      <section class="sec">${sec(1, 'Калории по дням', `норма ${nr.kcal}`)}
        <div class="week" role="img" aria-label="Калории по дням">${week}</div>
        <div class="legend"><span>норма есть</span><span class="l-low">меньше 90%</span><span class="l-norm">норма</span></div>
      </section>
      <section class="sec">${sec(2, 'Что можно сделать лучше')}<ol class="tips">${r.tips.map((t) => `<li><span>${esc(t)}</span></li>`).join('')}</ol></section>
      <section class="sec">${sec(3, 'Сколько стоят 10 г белка', esc(regionName(s.region)))}
        <p class="small muted">Белок нужен каждый день, и это самая дорогая часть рациона. Вот где он дешевле.</p>
        <div>${bars}</div>
      </section>
      <section class="sec cta" style="max-width:none">
        <button class="btn primary block" data-act="replay">${icon('repeat')}Сыграть ещё раз с новым кодом</button>
        <button class="btn block" data-act="replaysame">Переиграть эту же неделю (код ${esc(s.seed)})</button>
        <button class="btn block" data-act="print" data-what="report">${icon('print')}Распечатать итоги</button>
        <button class="btn block" data-act="go" data-to="mentor">Вопросы для разбора с наставником</button>
      </section>
      ${footer()}`;
  }

  function screenMentor() {
    const m = N.mentor;
    const rank = G.proteinRanking(ui.mentorRegion).slice(0, 5);
    const vf = G.vfRanking(ui.mentorRegion).slice(0, 4);
    return `
      ${backTo(game ? (game.finished ? 'final' : 'day') : 'home')}${bigBtn()}</div>
      <section style="padding-top:1rem">
        <p class="label">Для наставника</p>
        <h1>Занятие на 45 минут</h1>
        <p class="lead">Подростки сами планируют неделю питания на реальные цены своего региона и видят последствия решений. Без регистрации и персональных данных, на любом телефоне и на проекторе.</p>
      </section>
      <section class="sec">${sec(1, 'Чему учит игра')}
        <div class="dirs">${m.directions.map((d) => `<div><b>${esc(d.title)}</b><p>${esc(d.text)}</p></div>`).join('')}</div>
      </section>
      <section class="sec">${sec(2, 'План занятия', '45 минут')}
        <div class="timeline">${m.lesson.map((l) => `<div class="lesson-step"><div class="min">${l.min}<small>мин</small></div><div><b>${esc(l.title)}</b><p>${esc(l.text)}</p></div></div>`).join('')}</div>
      </section>
      <section class="sec">${sec(3, 'Код недели для группы')}
        <p class="small muted">Попросите всех ввести этот код при старте. События и акции совпадут у всей группы, и итоги можно честно сравнить.</p>
        <div class="code-box" aria-live="polite">${esc(ui.mentorSeed)}</div>
        <div class="row wrap" style="margin-top:0.75rem"><button class="btn small" data-act="newseed">${icon('repeat')}Другой код</button>
          <button class="btn small primary" data-act="playseed">Начать игру с этим кодом</button></div>
      </section>
      <section class="sec">${sec(4, 'Итоги группы')}
        <p class="small muted">После игры каждый присылает вам код итога. Вставьте коды или всю переписку из чата: увидите средний результат, слабые места группы и темы для разбора. Можно сравнить первую и повторную попытку.</p>
        <button class="btn primary" data-act="go" data-to="group">${icon('chart')}Открыть итоги группы</button>
      </section>
      <section class="sec">${sec(5, 'Вопросы для разбора')}
        <ol class="qlist">${m.questions.map((q) => `<li><span>${esc(q)}</span></li>`).join('')}</ol>
      </section>
      <section class="sec">${sec(6, 'Шпаргалка цен региона')}
        <select class="field" data-change="mentorRegion" aria-label="Регион для шпаргалки">${regionOptions(ui.mentorRegion)}</select>
        <div class="cheat">
          <div><div class="label">Дешёвый белок, цена 10 г</div><ol>${rank.map((x) => `<li><span>${esc(shortName(x.pid))}${x.animal ? '' : ' (растит.)'}</span><span>${rub(x.rubPer10g)}</span></li>`).join('')}</ol></div>
          <div><div class="label">Дешёвые овощи и фрукты, за кг</div><ol>${vf.map((x) => `<li><span>${esc(x.name)}</span><span>${rub(x.rubPerKg)}</span></li>`).join('')}</ol></div>
        </div>
        <p class="hint">Бюджет недели: ${N.levels.map((l) => `${esc(l.name.toLowerCase())} — ${rub(G.budgetFor(ui.mentorRegion, l.id))}`).join(', ')}.</p>
      </section>
      <section class="sec">${sec(7, 'Материалы для печати')}
        <div class="row wrap">
          <button class="btn" data-act="print" data-what="worksheet">${icon('print')}Рабочий лист «Мой план на неделю»</button>
          <button class="btn" data-act="print" data-what="cheatsheet">${icon('print')}Шпаргалка цен региона</button>
        </div>
      </section>
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
      const topics = sm.topics.map((m) => `<div class="lesson-step"><div class="min">${m.weak}<small>/${sm.n}</small></div><div><b>${esc(m.name)}</b><span class="small muted"> · 0–1 звезда</span>
        <p>${esc(N.mentor.groupTopics[m.id])}</p></div></div>`).join('');
      const per = sm.per.map((m) => `<div class="hbar"><span>${esc(m.name)}</span>
        <span class="track"><i class="${m.avg < 1.5 ? 'hi' : ''}" style="width:${(m.avg / 3) * 100}%"></i></span><b>${one(m.avg)} из 3</b></div>`).join('');
      const rows = list.map((r, i) => `<tr><td>${i + 1}</td><td title="${esc(G.H[r.hero].name)}">${esc(G.H[r.hero].name[0])}</td><td class="total">${r.total}</td>
        ${G.METRICS.map((m) => `<td class="${r.stars[m.id] <= 1 ? 'weak' : ''}">${r.stars[m.id]}</td>`).join('')}
        <td>${r.moneyPct > 0 ? '+' : r.moneyPct < 0 ? '−' : ''}${Math.abs(r.moneyPct)}%</td><td>${r.waste ? `≈${r.waste} ₽` : '—'}</td><td>${r.attempt >= 4 ? '4+' : r.attempt}</td></tr>`).join('');
      const diff = sm.first && sm.repeat ? sm.repeat.avg - sm.first.avg : 0;
      const attempts = sm.first && sm.repeat ? `
        <section class="sec">${sec(0, 'Первая и повторная попытка')}
          <div class="compare">
            <div class="side"><span class="label">Первая · ${sm.first.n} чел.</span><b>${one(sm.first.avg)}</b></div>
            ${icon('arrow')}
            <div class="side"><span class="label">Повторная · ${sm.repeat.n} чел.</span><b>${one(sm.repeat.avg)}</b></div>
            <span class="delta">${diff >= 0 ? '+' : '−'}${one(Math.abs(diff))} звезды</span>
          </div>
          <p class="hint">Средние звёзды из ${sm.max}. Это измеримый результат занятия: насколько лучше ребята справились, когда разобрали ошибки первой недели.</p>
        </section>` : '';
      out = `
        ${notes.map((t) => `<div class="note warn" style="margin-top:0.75rem">${esc(t)}</div>`).join('')}
        <div class="sec tiles" id="group-results">
          <div class="tile"><b>${sm.n}</b><span>${G.plural(sm.n, ['игрок', 'игрока', 'игроков'])}</span></div>
          <div class="tile"><b>${one(sm.avgTotal)}</b><span>звёзд в среднем из ${sm.max}</span></div>
          <div class="tile"><b>${sm.minus}</b><span>${G.plural(sm.minus, ['ушёл', 'ушли', 'ушли'])} в минус</span></div>
          <div class="tile"><b>≈${G.fmtNum(sm.wasteSum)} ₽</b><span>еды выброшено на всех</span></div>
        </div>
        <section class="sec topics">${sec(0, 'О чём поговорить', topics ? 'слабые места группы' : '')}
          ${topics ? `<div class="timeline">${topics}</div>` : '<p>Слабых мест нет: у всех по 2–3 звезды. Предложите сыграть на уровне «Туго».</p>'}</section>
        <section class="sec">${sec(0, 'Средние звёзды по показателям')}<div>${per}</div></section>
        ${attempts}
        <section class="sec">${sec(0, 'Все участники', 'в порядке из переписки')}
          <div class="table-wrap"><table class="gtable">
            <thead><tr><th>#</th><th title="Герой">Кто</th><th>Итог</th>${G.METRICS.map((m) => `<th title="${esc(m.name)}">${SHORT[m.id] || esc(m.name)}</th>`).join('')}<th>Остаток</th><th>Выброш.</th><th title="Первая попытка или повторная">Игра</th></tr></thead>
            <tbody>${rows}</tbody></table></div>
          <p class="hint">Звёзды от 0 до 3, красным — 0 или 1. Столбцы: бюджет, сытость, белок, овощи и фрукты, отходы, настроение. «Остаток» — сколько процентов бюджета осталось в конце недели, «Игра» — первая это попытка или повторная.</p>
        </section>
        <div class="sec"><button class="btn block" data-act="print" data-what="group">${icon('print')}Распечатать итоги группы</button></div>`;
    } else if (ui.group.text.trim()) {
      out = `<div class="empty-note" style="margin-top:0.75rem">Коды не найдены. Код итога — 12 букв и цифр через дефис, например 4КМТ-Р7ВЖ-ДХ9С.${bad ? ` Похожих на код, но с опечаткой: ${bad}.` : ''}</div>`;
    }
    return `
      ${backTo('mentor')}${bigBtn()}</div>
      <section style="padding-top:1rem">
        <p class="label">Для наставника</p>
        <h1>Итоги группы</h1>
        <p class="lead">Соберите коды итогов, и сразу видно, что у группы получилось и о чём поговорить на разборе.</p>
      </section>
      <section class="sec">
        <ol class="steps" style="margin-bottom:1rem">
          <li><b>Каждый присылает код</b><span>В конце игры нажмите «Отправить наставнику» и пришлите код в общий чат. Или покажите экран.</span></li>
          <li><b>Вставьте переписку целиком</b><span>Коды найдутся сами, лишний текст не мешает. Можно ввести коды вручную.</span></li>
        </ol>
        <label for="group-text" class="label" style="display:block;margin-bottom:0.35rem">Коды игроков</label>
        <textarea id="group-text" class="field" rows="6" data-change="group" spellcheck="false" placeholder="Например:&#10;Аня: 4КМТ-Р7ВЖ-ДХ9С&#10;Миша: …">${esc(ui.group.text)}</textarea>
        <div class="row wrap" style="margin-top:0.75rem">
          <button class="btn primary" data-act="groupcalc">Посчитать итоги</button>
          <button class="btn" data-act="groupsample">Показать пример</button>
          ${ui.group.text ? '<button class="btn ghost" data-act="groupclear">Очистить</button>' : ''}
        </div>
        <p class="hint">В кодах нет имён и телефонов, только звёзды, регион и цифры недели. Всё считается на этом устройстве, в интернет ничего не отправляется.</p>
      </section>
      ${out}
      ${footer()}`;
  }

  // ---------- модальные окна ----------
  const closeBtn = () => `<button class="btn ghost icon-btn close" data-act="closemodal" aria-label="Закрыть">${icon('close')}</button>`;

  function modalEvent() {
    const s = game;
    const md = ui.modal;
    const ev = md.ev;
    const head = `<p class="label">${esc(cap(weekday(s.day)))} · ситуация дня</p><h2>${esc(ev.title)}</h2>`;
    if (md.done) {
      const r = md.done;
      const fx = `${r.cost ? `<span class="st red">−${rub(r.cost)}</span>` : ''}${r.gain ? `<span class="st ok">+${rub(r.gain)}</span>` : ''}`;
      return `${head}<p>${esc(r.result || '')}</p>${fx ? `<div class="effects">${fx}</div>` : ''}
        <button class="btn primary block" data-act="closemodal">Дальше${icon('arrow')}</button>`;
    }
    const choices = ev.choices.map((c, i) => {
      const cost = G.choiceCost(s, c);
      const avail = G.choiceAvailable(s, ev, i);
      const hint = cost ? `<span class="amt neg">−${rub(cost)}</span>` : c.gain ? `<span class="amt pos">+${rub(c.gain)}</span>` : '';
      return `<button class="btn block split" data-act="choice" data-i="${i}" ${avail ? '' : 'disabled'}>
        <span>${esc(c.label)}${avail ? '' : ' <span class="small">(не хватает денег)</span>'}</span>${hint}</button>`;
    }).join('');
    return `${head}<p>${esc(ev.text)}</p><div class="choices">${choices}</div>`;
  }

  function modalMeal() {
    const s = game;
    const slot = ui.modal.slot;
    const slotName = slot === 's' ? 'Перекус' : G.SLOTS.find((x) => x.id === slot).name;
    const rows = [];
    const dishes = s.dishes.map((d) => `<button class="rowi" data-act="eat" data-type="dish" data-uid="${d.uid}">
      ${pic(d)}<span class="body"><span class="name">${esc(d.name)}</span><span class="nut">${nutLine(d)}</span></span>
      <span class="st">${d.portions} ${portionWord(d.portions)}</span></button>`);
    if (dishes.length) rows.push(`<h3>Готовое в холодильнике</h3><div class="rows">${dishes.join('')}</div>`);

    if (slot !== 's') {
      const cookable = N.recipes.filter((r) => G.maxPortions(s, r.id) >= 1).map((r) => {
        const n = G.recipeNutrition(r.id);
        const portions = Math.min(r.batch, G.maxPortions(s, r.id));
        return `<button class="rowi" data-act="cookeat" data-rid="${r.id}">
          ${pic(r)}<span class="body"><span class="name">${esc(r.name)}</span><span class="nut"><span>${r.time} мин${portions > 1 ? ` · ${portions} ${portionWord(portions)}` : ''}</span>${nutLine(n)}</span></span></button>`;
      });
      if (cookable.length) rows.push(`<h3>Приготовить сейчас</h3><p class="hint" style="margin-top:0">Если блюдо на несколько порций, одну съешь сейчас, остальное уберёшь в холодильник.</p><div class="rows">${cookable.join('')}</div>`);
    }

    const snackable = N.products.filter((p) => p.snack && G.stock(s, p.id) >= 1).map((p) => {
      const g = Math.min(p.snack, G.stock(s, p.id));
      const n = { kcal: (g * p.kcal) / 100, prot: (g * p.prot) / 100, vf: p.vf ? g : 0 };
      return `<button class="rowi" data-act="eat" data-type="product" data-pid="${p.id}">
        ${pic(p)}<span class="body"><span class="name">${esc(p.name)}, ${G.fmtAmount(p.id, g)}</span><span class="nut">${nutLine(n)}</span></span></button>`;
    });
    if (snackable.length) rows.push(`<h3>Без готовки</h3><div class="rows">${snackable.join('')}</div>`);

    if (slot !== 's') {
      const out = N.outside.map((o) => {
        const price = G.outsidePrice(s, o.id);
        return `<button class="rowi" data-act="eat" data-type="outside" data-id="${o.id}" ${price > s.money ? 'disabled' : ''}>
          ${pic(o)}<span class="body"><span class="name">${esc(o.name)}</span><span class="nut">${nutLine(o)}</span></span>
          <span class="amt neg mono small">${rub(price)}</span></button>`;
      });
      rows.push(`<h3>Поесть вне дома</h3><div class="rows">${out.join('')}</div>`);
    }
    const nothing = !dishes.length && !snackable.length && !N.recipes.some((r) => G.maxPortions(s, r.id) >= 1);
    return `${closeBtn()}
      <p class="label">${esc(cap(weekday(s.day)))}${slot !== 's' ? ` · ${SLOT_TIME[slot]}` : ''}</p>
      <h2>${slotName}: что едим?</h2>
      ${nothing ? `<div class="empty-note" style="margin:0.75rem 0">Дома нечего есть. Загляни в магазин или поешь вне дома.</div><button class="btn block" data-act="goshop">${icon('cart')}В магазин</button>` : ''}
      ${rows.join('')}
      ${slot !== 's' ? '<button class="btn block ghost" style="margin-top:1rem" data-act="closemodal">Пропустить приём пищи</button>' : ''}`;
  }

  function modalCook() {
    const s = game;
    const r = G.R[ui.modal.rid];
    const max = G.maxPortions(s, r.id);
    const n = Math.min(ui.modal.n, max);
    const nut = G.recipeNutrition(r.id);
    return `${closeBtn()}
      <div class="pic-big">${pic(r)}</div>
      <p class="label">Кухня · ${r.time} мин</p><h2>${esc(r.name)}</h2>
      <p class="small muted">Хранится ${r.keep} ${dayWord(r.keep)}. Не готовь больше, чем успеешь съесть.</p>
      <div class="row" style="justify-content:center;margin:1.25rem 0 0.5rem">
        <div class="stepper big"><button data-act="cookn" data-d="-1" ${n <= 1 ? 'disabled' : ''} aria-label="Меньше порций">${icon('minus')}</button>
        <span class="q" aria-live="polite">${n}</span>
        <button data-act="cookn" data-d="1" ${n >= max ? 'disabled' : ''} aria-label="Больше порций">${icon('plus')}</button></div>
      </div>
      <p class="small muted" style="text-align:center">${portionWord(n)} · всего ${Math.round(nut.kcal * n)} ккал, белок ${Math.round(nut.prot * n)} г</p>
      <div class="rows small">${r.ing.map(([pid, g]) => `<div class="rowi" style="padding:0.45rem 0"><span class="body">${esc(shortName(pid))}</span><span class="mono">${G.fmtAmount(pid, g * n)}</span></div>`).join('')}</div>
      <button class="btn primary block" style="margin-top:1rem" data-act="cook">Приготовить ${n} ${portionWord(n)}</button>`;
  }

  function verdict(p) {
    const v = Math.round(p * 100);
    return p >= 0.9 ? [`${v}% нормы`, 'r-ok'] : p >= 0.7 ? [`${v}% нормы, маловато`, 'r-mid'] : [`${v}% нормы, мало`, 'r-bad'];
  }
  function modalSummary() {
    const s = game;
    const sm = ui.modal.summary;
    const nr = G.norms(s);
    const md = sm.moodDelta;
    const line = (name, v, norm, unit, p) => { const [t, c] = verdict(p); return rline(name, `${v} / ${norm}${unit}`, t, c); };
    const spoiled = sm.spoiled.length
      ? `<hr class="r-sep">${rline('Выброшено', `<span class="r-bad">−${rub(sm.wasteRub)}</span>`)}
         ${sm.spoiled.map((x) => `<div class="r-sub">${esc(x.name)} — ${x.pid ? G.fmtAmount(x.pid, x.g) : `${x.portions} ${portionWord(x.portions)}`}</div>`).join('')}`
      : '';
    const notices = (s.notices || []).map((n) => `<div class="note" style="margin-top:0.75rem">${esc(n)}</div>`).join('');
    return `<p class="label">${esc(cap(weekday(sm.day)))} · итоги дня</p><h2>День ${sm.day} позади</h2>
      <div class="receipt-wrap"><div class="receipt">
        ${line('Калории', sm.kcal, nr.kcal, '', sm.kcalPct)}
        ${line('Белок', sm.prot, nr.prot, ' г', sm.protPct)}
        ${line('Овощи и фрукты', sm.vf, nr.vf, ' г', sm.vfPct)}
        ${rline('Настроение', `${sm.mood} <span class="${md >= 0 ? 'r-ok' : 'r-bad'}">(${md >= 0 ? '+' : '−'}${Math.abs(md)})</span>`, sm.reasons.length ? esc(sm.reasons.join(', ')) : '')}
        ${spoiled}
      </div></div>
      ${notices}
      <button class="btn primary block" style="margin-top:1rem" data-act="nextday">${s.finished ? 'Подвести итоги недели' : `Наступает ${esc(weekday(s.day))}`}${icon('arrow')}</button>`;
  }

  function modalConfirmEnd() {
    const d = game.days[game.day];
    const missing = G.SLOTS.filter((sl) => !d.meals[sl.id]).map((sl) => sl.name.toLowerCase());
    return `<p class="label">${esc(cap(weekday(game.day)))} · вечер</p><h2>Закончить день?</h2>
      <p>Сегодня не было: <b>${esc(missing.join(', '))}</b>. Пропуски еды снижают настроение и сытость.</p>
      <div class="stack"><button class="btn primary block" data-act="closemodal">Вернуться и поесть</button>
      <button class="btn block" data-act="endconfirm">Всё равно закончить</button></div>`;
  }

  function modalMenu() {
    const item = (act, ic, name, sub, extra = '') => `<button class="rowi" data-act="${act}" ${extra}><span class="pic" aria-hidden="true">${ic}</span>
      <span class="body"><span class="name">${name}</span>${sub ? `<span class="sub">${sub}</span>` : ''}</span></button>`;
    return `${closeBtn()}<h2>Меню</h2>
      <div class="rows">
        ${item('rules', icon('book'), 'Как играть', '')}
        ${item('big', '<b class="mono">Aa</b>', pref.big ? 'Обычный шрифт' : 'Крупный шрифт', 'для проектора', `aria-pressed="${pref.big}"`)}
        ${item('go', icon('users'), 'Для наставника', 'план занятия и итоги группы', 'data-to="mentor"')}
        ${item('go', icon('home'), 'На главную', 'игра сохранится', 'data-to="home"')}
        ${item('restart', icon('repeat'), 'Начать неделю заново', '')}
      </div>`;
  }

  function modalRules() {
    return `${closeBtn()}<h2>Как играть</h2>
      <ol class="steps">
        <li><b>Магазин</b><span>Купи продукты на несколько дней. Сравнивай цену за кг и смотри на срок хранения.</span></li>
        <li><b>Кухня</b><span>Готовь сразу на несколько порций. Готовая еда хранится 1–3 дня.</span></li>
        <li><b>Еда</b><span>Каждый день завтрак, обед и ужин. Следи за полосками сверху: калории, белок, овощи и фрукты.</span></li>
        <li><b>Сроки</b><span>Продукты портятся. Мясо, фарш и хлеб можно заморозить.</span></li>
        <li><b>Ситуации</b><span>Каждый день что-то случается. Решай сам.</span></li>
        <li><b>Чек недели</b><span>Через 7 дней звёзды за бюджет, сытость, белок, овощи, отходы и настроение.</span></li>
      </ol>
      <button class="btn primary block" style="margin-top:1rem" data-act="closemodal">Понятно</button>`;
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
        ${r.metrics.map((m) => `<tr><td>${esc(m.name)}</td><td>${'★'.repeat(m.stars)}${'☆'.repeat(3 - m.stars)}</td><td>${esc(m.value)}</td></tr>`).join('')}</table>
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
        return `<tr><td>${esc(p.name)}</td><td>${G.fmtPack(p.id)}</td><td>${price} ₽</td><td>${p.basis === 'pack' ? '—' : Math.round(units[p.id]) + (p.unit === 'мл' ? ' ₽/л' : ' ₽/кг')}</td></tr>`;
      }).join('');
      return `<h1>Шпаргалка: цены на продукты — ${esc(regionName(region))}</h1>
        <p class="note">Средние цены Росстата ${esc(N.prices.period)} Бюджет на неделю для одного человека: ${N.levels.map((l) => `${esc(l.name.toLowerCase())} — ${rub(G.budgetFor(region, l.id))}`).join(', ')}.</p>
        <div class="two">
          <div><h2>Белок — цена 10 г</h2><ol>${rank.map((x) => `<li>${esc(shortName(x.pid))} — ${rub(x.rubPer10g)}${x.animal ? '' : ' (растительный)'}</li>`).join('')}</ol></div>
          <div><h2>Овощи и фрукты — цена за кг</h2><ol>${vf.map((x) => `<li>${esc(x.name)} — ${rub(x.rubPerKg)}</li>`).join('')}</ol></div>
        </div>
        <h2>Все продукты</h2><table><tr><th>Продукт</th><th>Упаковка</th><th>Цена</th><th>За кг / л</th></tr>${all}</table>`;
    }
    // рабочий лист
    const days = WD.map((d) => `<th>${d.toUpperCase()}</th>`).join('');
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

    freeze: (d) => { if (G.freeze(game, d.pid)) { save(); toast(`${P[d.pid].name}: в морозилке не испортится`); render(); } },
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
      toast(`${r.entry.name}: +${Math.round(r.entry.kcal)} ккал`);
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
      toast(n > 1 ? `Приготовлено ${n} ${portionWord(n)}: одну съел, остальное в холодильнике` : `${rec.name}: +${Math.round(r.entry.kcal)} ккал`);
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
  let shown = null; // какой экран был на прошлой отрисовке: анимация появления только при смене экрана
  function render() {
    const screens = { home: screenHome, setup: screenSetup, intro: screenIntro, day: screenDay, shop: screenShop, kitchen: screenKitchen, final: screenFinal, mentor: screenMentor, group: screenGroup };
    if (!game && !['home', 'setup', 'mentor', 'group'].includes(ui.screen)) ui.screen = 'home';
    $app.classList.toggle('enter', ui.screen !== shown);
    shown = ui.screen;
    $app.innerHTML = screens[ui.screen]();
    const tb = $app.querySelector('.topbar'); // отделы магазина прилипают сразу под шапкой
    if (tb) $app.style.setProperty('--tb', `${tb.offsetHeight}px`);
    const tabs = $app.querySelector('.tabs');
    const active = tabs && tabs.querySelector('[aria-pressed="true"]');
    if (active) tabs.scrollLeft = active.offsetLeft - tabs.clientWidth / 2 + active.clientWidth / 2;
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

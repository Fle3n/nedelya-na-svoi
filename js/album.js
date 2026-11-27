// Альбом наклеек: достижения за неделю, нарисованные нашими стикерами. Без DOM — проверяется тестами.
// Наклейка выдаётся за то, чему учит игра: не выбрасывать еду, готовить впрок, есть овощи, держать резерв.
(function (N) {
  'use strict';
  const G = N.engine;
  const star = (r, id) => (r.metrics.find((m) => m.id === id) || {}).stars || 0;
  const ateAny = (s, names) => Object.values(s.days).some((d) => [...Object.values(d.meals), ...d.snacks].some((m) => m && names.includes(m.name)));
  const SOUPS = ['Щи из свежей капусты', 'Борщ с тушёнкой', 'Гороховый суп'];

  // Порядок не менять: по нему хранится альбом
  const LIST = [
    { id: 'no_waste', title: 'Ни крошки в мусор', how: 'Неделя без выброшенной еды', sticker: 'yabloki', test: (s) => s.waste < 1 },
    { id: 'soup', title: 'Суповар', how: 'Сварить и съесть суп: щи, борщ или гороховый', sticker: 'r_borsch', test: (s) => ateAny(s, SOUPS) },
    { id: 'batch', title: 'Готовлю впрок', how: 'Приготовить блюдо сразу на 3 порции и больше', sticker: 'r_makarony_flot', test: (s) => (s.batch3 || 0) > 0 },
    { id: 'freezer', title: 'Морозилка — друг', how: 'Заморозить мясо или хлеб, пока не испортились', sticker: 'pelmeni', test: (s) => (s.froze || 0) > 0 },
    { id: 'home_food', title: 'Дома вкуснее', how: 'Ни рубля на кафе и доставку', sticker: 'r_grechka_kur', test: (s, r) => r.stats.cafe < 1 },
    { id: 'no_sweets', title: 'Без лишнего', how: 'Ни рубля на сладкое, газировку и фастфуд', sticker: 'r_salat_kapusta', test: (s) => s.spent.treats < 1 },
    { id: 'reserve', title: 'С запасом', how: 'В конце недели осталось 10% бюджета и больше', sticker: 'grechka', test: (s, r) => star(r, 'money') === 3 },
    { id: 'protein', title: 'Белковая неделя', how: '3 звезды за белок', sticker: 'yaica', test: (s, r) => star(r, 'prot') === 3 },
    { id: 'veg', title: 'Овощной фронт', how: '3 звезды за овощи и фрукты', sticker: 'morkov', test: (s, r) => star(r, 'vf') === 3 },
    { id: 'happy', title: 'Сытый и довольный', how: '3 звезды за сытость и за настроение', sticker: 'r_plov', test: (s, r) => star(r, 'kcal') === 3 && star(r, 'mood') === 3 },
    { id: 'master', title: 'Хозяин своей кухни', how: '16 звёзд из 18 и больше', sticker: 'r_omlet', test: (s, r) => r.total >= 16 },
    { id: 'perfect', title: 'Идеальная неделя', how: 'Все 18 звёзд из 18', sticker: 'pirozhki', test: (s, r) => r.total === r.max },
    { id: 'hard', title: 'Туго, но справился', how: 'Уровень «Туго» и 12 звёзд и больше', sticker: 'r_kartoshka_zhar', test: (s, r) => s.level === 'hard' && r.total >= 12 },
    { id: 'retry', title: 'Работа над ошибками', how: 'Переиграть ту же неделю с тем же кодом', sticker: 'r_pelmeni_smet', test: (s) => (s.attempt || 1) >= 2 },
  ];

  // Какие наклейки заработаны за законченную неделю
  function earned(state, rep) {
    const r = rep || G.report(state);
    return LIST.filter((a) => { try { return !!a.test(state, r); } catch (e) { return false; } }).map((a) => a.id);
  }

  N.album = { LIST, earned, byId: Object.fromEntries(LIST.map((a) => [a.id, a])) };
})(window.NNS);

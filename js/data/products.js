// Каталог магазина. Цены не хранятся здесь — они берутся из данных Росстата (js/data/prices.js)
// по выбранному региону: цена за кг / л / упаковку × размер упаковки.
//
// Поля:
//   pack   — размер упаковки в граммах (или мл для жидкостей)
//   basis  — в чём цена у Росстата: 'kg' (за кг), 'l' (за литр), 'pack' (за упаковку: 10 яиц, 25 пакетиков чая)
//   shelf  — сколько дней продукт можно есть, включая день покупки
//   kcal, prot — калорийность и белок на 100 г (100 мл)
//   vf     — овощ или фрукт: идёт в зачёт «400 г овощей и фруктов в день» (рекомендация ВОЗ)
//   snack  — можно съесть без готовки, порция в граммах
//   treat  — «вкусняшка»: поднимает настроение, но не заменяет еду
//   freeze — можно заморозить, чтобы не испортилось
//   piece  — вес одной штуки, чтобы показывать «2 яйца», а не «110 г»
window.NNS = window.NNS || {};

NNS.categories = [
  { id: 'grain', name: 'Крупы и макароны', emoji: '🌾' },
  { id: 'bread', name: 'Хлеб', emoji: '🍞' },
  { id: 'dairy', name: 'Молочное и яйца', emoji: '🥛' },
  { id: 'meat', name: 'Мясо и рыба', emoji: '🍗' },
  { id: 'veg', name: 'Овощи и фрукты', emoji: '🥕' },
  { id: 'pantry', name: 'Масло, сахар, чай', emoji: '🫙' },
  { id: 'snack', name: 'Сладкое и быстрое', emoji: '🍫' },
];

NNS.products = [
  // Крупы и макароны
  { id: 'grechka', name: 'Гречка ядрица', emoji: '🌾', cat: 'grain', pack: 900, basis: 'kg', shelf: 365, kcal: 313, prot: 12.6 },
  { id: 'ris', name: 'Рис круглозёрный', emoji: '🍚', cat: 'grain', pack: 900, basis: 'kg', shelf: 365, kcal: 333, prot: 7 },
  { id: 'makarony', name: 'Макароны', emoji: '🍝', cat: 'grain', pack: 450, basis: 'kg', shelf: 365, kcal: 337, prot: 10.4 },
  { id: 'gerkules', name: 'Овсяные хлопья', emoji: '🥣', cat: 'grain', pack: 400, basis: 'kg', shelf: 365, kcal: 352, prot: 12.3 },
  { id: 'psheno', name: 'Пшено', emoji: '🌾', cat: 'grain', pack: 800, basis: 'kg', shelf: 270, kcal: 342, prot: 11.5 },
  { id: 'goroh', name: 'Горох колотый', emoji: '🫛', cat: 'grain', pack: 800, basis: 'kg', shelf: 365, kcal: 298, prot: 20.5 },

  // Хлеб
  { id: 'hleb', name: 'Хлеб ржано-пшеничный', emoji: '🍞', cat: 'bread', pack: 600, basis: 'kg', shelf: 4, kcal: 214, prot: 6.6, freeze: true, snack: 100 },
  { id: 'baton', name: 'Батон', emoji: '🥖', cat: 'bread', pack: 400, basis: 'kg', shelf: 4, kcal: 262, prot: 7.5, freeze: true, snack: 100 },

  // Молочное и яйца
  { id: 'moloko', name: 'Молоко 2,5%', emoji: '🥛', cat: 'dairy', pack: 900, unit: 'мл', basis: 'l', shelf: 5, kcal: 52, prot: 2.8, snack: 250 },
  { id: 'kefir', name: 'Кефир 2,5%', emoji: '🥛', cat: 'dairy', pack: 900, basis: 'kg', shelf: 7, kcal: 53, prot: 2.9, snack: 250 },
  { id: 'yogurt', name: 'Йогурт питьевой', emoji: '🍶', cat: 'dairy', pack: 270, basis: 'kg', shelf: 10, kcal: 75, prot: 2.9, snack: 270 },
  { id: 'smetana', name: 'Сметана 15%', emoji: '🥄', cat: 'dairy', pack: 300, basis: 'kg', shelf: 10, kcal: 158, prot: 2.6 },
  { id: 'tvorog', name: 'Творог 5%', emoji: '🧀', cat: 'dairy', pack: 200, basis: 'kg', shelf: 7, kcal: 121, prot: 17.2, snack: 200 },
  { id: 'syr', name: 'Сыр', emoji: '🧀', cat: 'dairy', pack: 200, basis: 'kg', shelf: 30, kcal: 350, prot: 25 },
  { id: 'maslo_sl', name: 'Масло сливочное', emoji: '🧈', cat: 'dairy', pack: 180, basis: 'kg', shelf: 30, kcal: 661, prot: 0.8 },
  { id: 'yaica', name: 'Яйца, 10 шт', emoji: '🥚', cat: 'dairy', pack: 550, basis: 'pack', shelf: 25, kcal: 157, prot: 12.7, piece: 55, pieceName: ['яйцо', 'яйца', 'яиц'] },

  // Мясо и рыба
  { id: 'okorochka', name: 'Окорочка куриные', emoji: '🍗', cat: 'meat', pack: 1000, basis: 'kg', shelf: 3, kcal: 150, prot: 13, freeze: true, note: 'вес с костью' },
  { id: 'farsh', name: 'Фарш мясной', emoji: '🥩', cat: 'meat', pack: 500, basis: 'kg', shelf: 2, kcal: 250, prot: 16, freeze: true },
  { id: 'sosiski', name: 'Сосиски', emoji: '🌭', cat: 'meat', pack: 450, basis: 'kg', shelf: 14, kcal: 266, prot: 11 },
  { id: 'pelmeni', name: 'Пельмени замороженные', emoji: '🥟', cat: 'meat', pack: 800, basis: 'kg', shelf: 90, kcal: 275, prot: 11.9, frozen: true },
  { id: 'tushenka', name: 'Тушёнка говяжья', emoji: '🥫', cat: 'meat', pack: 325, basis: 'kg', shelf: 730, kcal: 220, prot: 15 },
  { id: 'ryba_konserv', name: 'Рыбные консервы', emoji: '🐟', cat: 'meat', pack: 245, basis: 'kg', shelf: 730, kcal: 180, prot: 19 },

  // Овощи и фрукты
  { id: 'kartofel', name: 'Картофель', emoji: '🥔', cat: 'veg', pack: 1000, basis: 'kg', shelf: 30, kcal: 77, prot: 2 },
  { id: 'morkov', name: 'Морковь', emoji: '🥕', cat: 'veg', pack: 500, basis: 'kg', shelf: 21, kcal: 35, prot: 1.3, vf: true },
  { id: 'luk', name: 'Лук репчатый', emoji: '🧅', cat: 'veg', pack: 500, basis: 'kg', shelf: 30, kcal: 41, prot: 1.4, vf: true },
  { id: 'kapusta', name: 'Капуста белокочанная', emoji: '🥬', cat: 'veg', pack: 1000, basis: 'kg', shelf: 21, kcal: 27, prot: 1.8, vf: true },
  { id: 'svekla', name: 'Свёкла', emoji: '🟣', cat: 'veg', pack: 500, basis: 'kg', shelf: 30, kcal: 42, prot: 1.5, vf: true },
  { id: 'ogurcy', name: 'Огурцы', emoji: '🥒', cat: 'veg', pack: 500, basis: 'kg', shelf: 5, kcal: 15, prot: 0.8, vf: true },
  { id: 'pomidory', name: 'Помидоры', emoji: '🍅', cat: 'veg', pack: 500, basis: 'kg', shelf: 5, kcal: 20, prot: 1.1, vf: true },
  { id: 'ovoshi_zam', name: 'Овощная смесь замороженная', emoji: '🥦', cat: 'veg', pack: 400, basis: 'kg', shelf: 90, kcal: 40, prot: 2, vf: true, frozen: true },
  { id: 'yabloki', name: 'Яблоки', emoji: '🍎', cat: 'veg', pack: 1000, basis: 'kg', shelf: 21, kcal: 47, prot: 0.4, vf: true, snack: 150 },
  { id: 'banany', name: 'Бананы', emoji: '🍌', cat: 'veg', pack: 1000, basis: 'kg', shelf: 5, kcal: 96, prot: 1.5, vf: true, snack: 150 },

  // Масло, сахар, чай
  { id: 'maslo_pods', name: 'Масло подсолнечное', emoji: '🌻', cat: 'pantry', pack: 900, unit: 'мл', basis: 'l', shelf: 365, kcal: 827, prot: 0 },
  { id: 'sahar', name: 'Сахар', emoji: '🍬', cat: 'pantry', pack: 1000, basis: 'kg', shelf: 730, kcal: 399, prot: 0 },
  { id: 'chai', name: 'Чай, 25 пакетиков', emoji: '🫖', cat: 'pantry', pack: 50, basis: 'pack', shelf: 730, kcal: 0, prot: 0, piece: 2, pieceName: ['пакетик', 'пакетика', 'пакетиков'] },

  // Сладкое и быстрое
  { id: 'pechenie', name: 'Печенье', emoji: '🍪', cat: 'snack', pack: 300, basis: 'kg', shelf: 90, kcal: 417, prot: 7.5, snack: 75, treat: true },
  { id: 'shokolad', name: 'Шоколадка', emoji: '🍫', cat: 'snack', pack: 90, basis: 'kg', shelf: 180, kcal: 540, prot: 6, snack: 90, treat: true },
  { id: 'gazirovka', name: 'Газировка', emoji: '🥤', cat: 'snack', pack: 1500, unit: 'мл', basis: 'l', shelf: 180, kcal: 42, prot: 0, snack: 500, treat: true },
  { id: 'lapsha', name: 'Лапша быстрого приготовления', emoji: '🍜', cat: 'snack', pack: 90, basis: 'kg', shelf: 365, kcal: 440, prot: 9, snack: 90 },
];

// Еда вне дома: цены тоже из Росстата (средняя цена по региону)
NNS.outside = [
  { id: 'stolovaya', name: 'Обед в столовой или кафе', emoji: '🍲', kcal: 850, prot: 35, vf: 150 },
  { id: 'fastfood', name: 'Бургер или шаурма навынос', emoji: '🍔', kcal: 550, prot: 22, vf: 30, treat: true },
];

// Нормы: МР 2.3.1.0253-21 «Нормы физиологических потребностей в энергии и пищевых веществах
// для различных групп населения РФ», возраст 18–29 лет, 2-я группа физической активности (КФА 1,6 — студенты).
NNS.heroes = [
  { id: 'anya', name: 'Аня', emoji: '👩', kcal: 2200, prot: 72, text: 'Учится на повара-кондитера, живёт в общежитии колледжа.' },
  { id: 'misha', name: 'Миша', emoji: '👨', kcal: 2750, prot: 89, text: 'Учится на автомеханика, снимает комнату вместе с другом.' },
];
NNS.vfNorm = 400; // г овощей и фруктов в день, рекомендация ВОЗ

// Акции в магазине: каждый день — три случайные (по коду недели).
// good — действительно выгодно; trap — скидка на то, что не нужно; meh — смотря как использовать.
NNS.promos = [
  { pid: 'grechka', pct: 20, kind: 'good' },
  { pid: 'okorochka', pct: 25, kind: 'good' },
  { pid: 'yaica', pct: 15, kind: 'good' },
  { pid: 'kapusta', pct: 30, kind: 'good' },
  { pid: 'tvorog', pct: 20, kind: 'good' },
  { pid: 'makarony', pct: 25, kind: 'good' },
  { pid: 'yabloki', pct: 20, kind: 'good' },
  { pid: 'gerkules', pct: 20, kind: 'good' },
  { pid: 'tushenka', pct: 20, kind: 'good' },
  { pid: 'pelmeni', pct: 15, kind: 'meh' },
  { pid: 'sosiski', pct: 20, kind: 'meh' },
  { pid: 'syr', pct: 25, kind: 'meh' },
  { pid: 'gazirovka', pct: 35, kind: 'trap' },
  { pid: 'shokolad', pct: 40, kind: 'trap' },
  { pid: 'pechenie', pct: 30, kind: 'trap' },
  { pid: 'lapsha', pct: 30, kind: 'trap' },
];

// Бюджет недели = стоимость «разумной корзины» в регионе × коэффициент уровня
NNS.levels = [
  { id: 'easy', name: 'Свободно', k: 1.25, text: 'Хватит на всё, если не транжирить' },
  { id: 'normal', name: 'Обычно', k: 1.0, text: 'Как у большинства выпускников' },
  { id: 'hard', name: 'Туго', k: 0.8, text: 'Придётся считать каждую покупку' },
];
NNS.referenceBasket = {
  grechka: 1, ris: 1, makarony: 2, gerkules: 1, yaica: 2, moloko: 3, kefir: 1, tvorog: 2, smetana: 1,
  okorochka: 1, farsh: 1, tushenka: 1, hleb: 2, kartofel: 2, morkov: 1, luk: 1, kapusta: 1,
  yabloki: 1, banany: 1, maslo_pods: 1, chai: 1,
};

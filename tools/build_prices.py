"""Собирает js/data/prices.js из файла Росстата «Средние потребительские цены».

Источник: https://rosstat.gov.ru/statistics/price → файл sred_potreb_cen_MM-YYYY.xlsx
(средние потребительские цены на конец месяца по регионам России).

Запуск (нужен только Python 3, без сторонних библиотек):
    python tools/build_prices.py raw/sred_potreb_cen_10-2026.xlsx

Скрипт берёт последний лист (последний месяц), находит нужные позиции по названию
и пишет цены по всем субъектам РФ. Если в регионе цены нет, ставится null —
игра подставит среднюю цену по России.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import xlsx  # noqa: E402

# id товара в игре → точное название позиции в таблице Росстата
ITEMS = {
    "grechka": "Крупа гречневая-ядрица, кг",
    "ris": "Рис шлифованный, кг",
    "makarony": "Макаронные изделия из пшеничной муки высшего сорта, кг",
    "gerkules": 'Овсяные хлопья "Геркулес", кг',
    "psheno": "Пшено, кг",
    "goroh": "Горох и фасоль, кг",
    "hleb": "Хлеб из ржаной муки и из смеси муки ржаной и пшеничной, кг",
    "baton": "Хлеб и булочные изделия из пшеничной муки различных сортов, кг",
    "moloko": "Молоко питьевое цельное пастеризованное 2,5-3,2% жирности, л",
    "kefir": "Кефир, кг",
    "yogurt": "Йогурт, кг",
    "smetana": "Сметана, кг",
    "tvorog": "Творог, кг",
    "syr": "Сыры твердые, полутвердые и мягкие, кг",
    "maslo_sl": "Масло сливочное, кг",
    "yaica": "Яйца куриные, 10 шт.",
    "okorochka": "Окорочка куриные, кг",
    "farsh": "Фарш мясной, кг",
    "sosiski": "Сосиски, сардельки, кг",
    "pelmeni": "Пельмени, манты, равиоли, кг",
    "tushenka": "Консервы мясные, кг",
    "ryba_konserv": "Консервы рыбные натуральные и с добавлением масла, кг",
    "kartofel": "Картофель, кг",
    "morkov": "Морковь, кг",
    "luk": "Лук репчатый, кг",
    "kapusta": "Капуста белокочанная свежая, кг",
    "svekla": "Свёкла столовая, кг",
    "ogurcy": "Огурцы свежие, кг",
    "pomidory": "Помидоры свежие, кг",
    "ovoshi_zam": "Овощи замороженные, кг",
    "yabloki": "Яблоки, кг",
    "banany": "Бананы, кг",
    "maslo_pods": "Масло подсолнечное, л",
    "sahar": "Сахар-песок, кг",
    "chai": "Чай черный байховый пакетированный, 25 пакетиков",
    "pechenie": "Печенье, кг",
    "shokolad": "Шоколад, кг",
    "gazirovka": "Напитки газированные, л",
    "lapsha": "Сухие супы в пакетах, кг",
    "fastfood": "Продукция предприятий общественного питания быстрого обслуживания, шт.",
    "stolovaya": "Обед в столовой, кафе, закусочной (кроме столовой в организации), на 1 человека",
}

MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля",
          "августа", "сентября", "октября", "ноября", "декабря"]

RENAME = {
    "Город Москва столица Российской Федерации город федерального значения": "Москва",
    "Город Санкт-Петербург город федерального значения": "Санкт-Петербург",
    "Город федерального значения Севастополь": "Севастополь",
    "Чувашская Республика - Чувашия": "Чувашская Республика",
    "Кемеровская область - Кузбасс": "Кемеровская область — Кузбасс",
}


def clean_name(name):
    name = re.sub(r"\s+", " ", name).strip()
    name = RENAME.get(name, name)
    # «Республика Адыгея (Адыгея)» → «Республика Адыгея», но «Республика Саха (Якутия)» оставляем
    m = re.match(r"^(.*?)\s*\(([^)]*)\)$", name)
    if m and m.group(2) in m.group(1):
        return m.group(1)
    return name


def to_num(v):
    try:
        return round(float(v), 2)
    except (TypeError, ValueError):
        return None  # «...» — данных нет


def main(path, out_path):
    book, strings, sheets = xlsx.read(path)
    sheet_name, target = sheets[-1]
    rows = xlsx.rows(book, strings, target)

    header_idx = next(i for i, r in enumerate(rows) if r.get(0) == "Код территории")
    names_row = rows[header_idx + 1]
    col_by_name = {re.sub(r"\s+", " ", v).strip(): k for k, v in names_row.items()}

    keys = list(ITEMS)
    cols = []
    for key in keys:
        title = ITEMS[key]
        if title not in col_by_name:
            sys.exit(f"Не нашёл позицию «{title}» в таблице — проверьте название")
        cols.append(col_by_name[title])

    regions = []
    for r in rows[header_idx + 2:]:
        code = str(r.get(0, "")).strip()
        is_country = code == "643"
        is_subject = len(code) >= 10 and code.endswith("000000000")
        if not (is_country or is_subject):
            continue
        regions.append({
            "code": code,
            "name": "Россия, в среднем" if is_country else clean_name(r.get(1, "")),
            "p": [to_num(r.get(c)) for c in cols],
        })

    rf = regions[0]
    if rf["code"] != "643" or None in rf["p"]:
        sys.exit("В первой строке ожидались цены по России целиком")
    regions = [rf] + sorted(regions[1:], key=lambda x: x["name"])

    m = re.match(r"(\d{2})\((\d{4})\)", sheet_name)
    period = f"на конец {MONTHS[int(m.group(1)) - 1]} {m.group(2)} г." if m else sheet_name

    data = {
        "source": "Росстат, средние потребительские цены по субъектам РФ",
        "sourceUrl": "https://rosstat.gov.ru/statistics/price",
        "period": period,
        "keys": keys,
        "regions": regions,
    }
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("// Файл создан скриптом tools/build_prices.py из открытых данных Росстата. Не правьте вручную.\n")
        f.write("window.NNS = window.NNS || {};\n")
        f.write("NNS.prices = ")
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    missing = sum(p is None for reg in regions for p in reg["p"])
    print(f"{out_path}: {len(regions)} регионов × {len(keys)} позиций, пропусков {missing}, период: {period}")


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # консоль Windows по умолчанию в cp1251
    except AttributeError:
        pass
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    main(sys.argv[1], os.path.join(root, "js", "data", "prices.js"))

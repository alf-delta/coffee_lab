// Колесо вкусов SCA (русская локализация, как на референсе).
// Иерархия: категория → подкатегория → дескриптор. Узлы без children —
// выбираемые дескрипторы (листья); они могут жить и на втором уровне
// (например «Чёрный чай»). Цвета приближены к официальной палитре SCA.
export const FLAVOR_WHEEL = [
  {
    name: 'Цветочный',
    color: '#d63177',
    children: [
      { name: 'Чёрный чай', color: '#8f5b6c' },
      {
        name: 'Цветочный',
        color: '#ec7fae',
        children: [
          { name: 'Ромашка', color: '#f7a128' },
          { name: 'Роза', color: '#ef2f7c' },
          { name: 'Жасмин', color: '#f5e9d2' },
        ],
      },
    ],
  },
  {
    name: 'Фруктовый',
    color: '#d8262f',
    children: [
      {
        name: 'Ягоды',
        color: '#dd4f53',
        children: [
          { name: 'Ежевика', color: '#3e0317' },
          { name: 'Малина', color: '#d61f48' },
          { name: 'Черника', color: '#5b6bb5' },
          { name: 'Клубника', color: '#e52968' },
        ],
      },
      {
        name: 'Сухофрукты',
        color: '#c94a44',
        children: [
          { name: 'Изюм', color: '#b4486a' },
          { name: 'Чернослив', color: '#9d4464' },
        ],
      },
      {
        name: 'Другие фрукты',
        color: '#f2705b',
        children: [
          { name: 'Кокос', color: '#ca9479' },
          { name: 'Вишня', color: '#e2113c' },
          { name: 'Гранат', color: '#d35446' },
          { name: 'Ананас', color: '#f99e1c' },
          { name: 'Виноград', color: '#a3a849' },
          { name: 'Яблоко', color: '#69b865' },
          { name: 'Персик', color: '#f88379' },
          { name: 'Груша', color: '#c1ca57' },
        ],
      },
      {
        name: 'Цитрусовые',
        color: '#f7a128',
        children: [
          { name: 'Грейпфрут', color: '#f26355' },
          { name: 'Апельсин', color: '#e2631e' },
          { name: 'Лимон', color: '#fde404' },
          { name: 'Лайм', color: '#7fb539' },
        ],
      },
    ],
  },
  {
    name: 'Кислый',
    color: '#e0b40e',
    children: [
      {
        name: 'Кислый',
        color: '#e7c601',
        children: [
          { name: 'Кислый запах', color: '#94a661' },
          { name: 'Уксусная кислота', color: '#b6a979' },
          { name: 'Масляная кислота', color: '#d2bd8d' },
          { name: 'Изовалериановая', color: '#8eb646' },
          { name: 'Лимонная кислота', color: '#f9ee04' },
          { name: 'Яблочная кислота', color: '#c0d12d' },
        ],
      },
      {
        name: 'Алкоголь',
        color: '#b09733',
        children: [
          { name: 'Вино', color: '#8f1c53' },
          { name: 'Виски', color: '#b34039' },
          { name: 'Забродивший', color: '#ba9233' },
          { name: 'Перезрелый', color: '#8b6439' },
        ],
      },
    ],
  },
  {
    name: 'Растительный',
    color: '#1e7e3e',
    children: [
      { name: 'Оливковое масло', color: '#a2b029' },
      { name: 'Сырые продукты', color: '#718933' },
      {
        name: 'Зелень',
        color: '#3aa255',
        children: [
          { name: 'Незрелый', color: '#a2bb2b' },
          { name: 'Стручковый горох', color: '#62aa3c' },
          { name: 'Свежий', color: '#03a653' },
          { name: 'Тёмная зелень', color: '#038549' },
          { name: 'Растительный', color: '#28b44b' },
          { name: 'Сено', color: '#a3a36f' },
          { name: 'Пряные травы', color: '#5e9a80' },
        ],
      },
      { name: 'Бобовый', color: '#86a874' },
    ],
  },
  {
    name: 'Другие',
    color: '#0aa3b5',
    children: [
      {
        name: 'Бумажный/Затхлый',
        color: '#9db2b7',
        children: [
          { name: 'Затхлый', color: '#8b8c90' },
          { name: 'Картонный', color: '#beb276' },
          { name: 'Бумажный', color: '#e8e8dc' },
          { name: 'Древесный', color: '#744e03' },
          { name: 'Затхлый/Сырой', color: '#978847' },
          { name: 'Затхлый/Пыльный', color: '#9d9c99' },
          { name: 'Затхлый/Землистый', color: '#67594d' },
          { name: 'Животный', color: '#9d977f' },
          { name: 'Мясной/Бульонный', color: '#cc7b6a' },
          { name: 'Фенольный', color: '#db646a' },
        ],
      },
      {
        name: 'Химический',
        color: '#76c0cb',
        children: [
          { name: 'Горький', color: '#80a89d' },
          { name: 'Солёный', color: '#cfe9f5' },
          { name: 'Медицинский', color: '#7a9bae' },
          { name: 'Нефтяной', color: '#039fb8' },
          { name: 'Латекс', color: '#5b8a9b' },
          { name: 'Резина', color: '#1f1a16' },
        ],
      },
    ],
  },
  {
    name: 'Печёный',
    color: '#c94930',
    children: [
      { name: 'Табак для трубки', color: '#caa365' },
      { name: 'Табак', color: '#dfbd7e' },
      {
        name: 'Горелый',
        color: '#be8762',
        children: [
          { name: 'Едкий', color: '#d8c99b' },
          { name: 'Пепельный', color: '#899893' },
          { name: 'Дымный', color: '#a1743b' },
          { name: 'Поджаренный', color: '#894810' },
        ],
      },
      {
        name: 'Злаки',
        color: '#ddaf61',
        children: [
          { name: 'Зерновой', color: '#b7906f' },
          { name: 'Солод', color: '#eb9d5f' },
        ],
      },
    ],
  },
  {
    name: 'Пряный',
    color: '#ad213e',
    children: [
      { name: 'Пикантный', color: '#794752' },
      { name: 'Перец', color: '#cc3d41' },
      {
        name: 'Коричневые прян.',
        color: '#b14d57',
        children: [
          { name: 'Анис', color: '#c78936' },
          { name: 'Мускат', color: '#8c292c' },
          { name: 'Корица', color: '#e5762e' },
          { name: 'Гвоздика', color: '#a16c5a' },
        ],
      },
    ],
  },
  {
    name: 'Ореховый/Какао',
    color: '#a87b64',
    children: [
      {
        name: 'Ореховый',
        color: '#c78869',
        children: [
          { name: 'Арахис', color: '#d4ad12' },
          { name: 'Фундук', color: '#9d5433' },
          { name: 'Миндаль', color: '#c89f83' },
        ],
      },
      {
        name: 'Какао',
        color: '#bb764c',
        children: [
          { name: 'Шоколад', color: '#692a19' },
          { name: 'Тёмный шоколад', color: '#470604' },
        ],
      },
    ],
  },
  {
    name: 'Сладкий',
    color: '#e65832',
    children: [
      {
        name: 'Коричневый сахар',
        color: '#d45a59',
        children: [
          { name: 'Меласса', color: '#310d0f' },
          { name: 'Кленовый сироп', color: '#ae341f' },
          { name: 'Карамель', color: '#e4975e' },
          { name: 'Мёд', color: '#da5d1f' },
        ],
      },
      { name: 'Ваниль', color: '#f89a80' },
      { name: 'Ванилин', color: '#f37674' },
      { name: 'Сладкий запах', color: '#f2675c' },
      { name: 'В целом сладкий', color: '#f1b5a6' },
    ],
  },
]

// Плоский индекс выбираемых дескрипторов: имя → { color, category }.
// Имена листьев в колесе уникальны — на этом держится модель batch.flavors (массив строк).
export const FLAVOR_INDEX = (() => {
  const map = {}
  const walk = (node, category) => {
    if (!node.children) {
      map[node.name] = { color: node.color, category }
      return
    }
    for (const c of node.children) walk(c, category)
  }
  for (const cat of FLAVOR_WHEEL) walk(cat, cat.name)
  return map
})()

export const flavorColor = (name) => FLAVOR_INDEX[name]?.color || '#9b8266'
